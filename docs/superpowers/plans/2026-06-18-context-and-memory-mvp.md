# Plan: Phase 1.5 Runtime MVP — 上下文压缩 + 跨对话记忆

> 创建日期：2026-06-18  
> 关联设计：[`docs/gap-analysis-runtime-layer.md`](../../gap-analysis-runtime-layer.md)  
> 战略路线：B+C 混合（先压缩 → 最小 memory MVP → 不与 Cline 官方撞车）

---

## 0. 目标与边界

### 解决的真问题（来源：缺口分析 §1.1, §1.2）

1. **上下文爆炸**：长任务 token 用量飙升后被粗暴截断，导致刚才的关键决策丢失。
2. **跨对话失忆**：每次新对话 Agent 都不知道项目历史决策、用户偏好、失败教训。

### 不做的事（YAGNI）

- ❌ 不引入向量数据库（推迟到证明 FTS5 不够用之后）
- ❌ 不实现自动摘要 LLM 调用（MVP 让 Cline 自己用 Skill 做摘要，不在 server 侧调外部模型）
- ❌ 不做平台化、不做付费版、不做 trace 的 OTLP 导出（推迟到 Phase 2）

### 验收标准（退出条件）

- [ ] 能在 Cline 中调用 `compact_context` 工具，传入对话片段返回结构化摘要请求
- [ ] 能在 Cline 中调用 `memory_commit` 持久化一条记忆，下次新对话用 `memory_recall` 检索得到
- [ ] 数据存储在 `~/.cline-skills/memory/{project-hash}/memory.db`（按项目隔离）
- [ ] FTS5 全文搜索正常（关键词命中率 > 80%，本地 sample 数据测试）
- [ ] 三个新 Skill 通过 `node tools/validate-skills.js` 零 ERROR
- [ ] 不破坏现有 10 个 handler 的行为（test-handlers.js 通过）

---

## 1. 架构总览

```
┌──────────────────────────────────────────────────────────┐
│  Cline (LLM)                                             │
│  ├─ 调用 use_mcp_tool: compact_context                   │
│  ├─ 调用 use_mcp_tool: memory_commit / memory_recall     │
│  └─ 加载 SKILL.md: context-compaction / memory-*         │
└────────────┬─────────────────────────────────────────────┘
             │ MCP (stdio)
┌────────────▼─────────────────────────────────────────────┐
│  skills-mcp-server (existing)                            │
│  ├─ index.js (router, 已存在)                            │
│  └─ handlers/                                            │
│     ├─ compact_context.js     ← 新增                     │
│     ├─ memory_commit.js       ← 新增                     │
│     ├─ memory_recall.js       ← 新增                     │
│     └─ memory_list.js         ← 新增                     │
└────────────┬─────────────────────────────────────────────┘
             │ better-sqlite3
┌────────────▼─────────────────────────────────────────────┐
│  ~/.cline-skills/memory/{project-hash}/memory.db         │
│  ├─ memories table (FTS5 virtual table)                  │
│  └─ project-hash = sha256(cwd) 截 12 字符                │
└──────────────────────────────────────────────────────────┘
```

### 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 存储引擎 | SQLite + FTS5 | 零依赖、内置 Node.js 项目里只需 better-sqlite3 一个包；FTS5 天然支持中英文 |
| 项目隔离 | 按 cwd 哈希分库 | 避免不同项目记忆串扰；用户切项目时无需手动操作 |
| 压缩触发 | LLM 主动调用，server 不自动 | MVP 不引入外部 LLM 调用，保持 server pure；Cline 通过 SKILL.md 学会何时调用 |
| 记忆类型 | 单一表 + `kind` 字段（episodic/semantic/procedural） | 简化 schema，未来可拆表 |
| 召回排序 | FTS5 bm25 + recency 加权 | 简单、可解释、无需训练 |

### 数据库 Schema

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('episodic','semantic','procedural')),
  content TEXT NOT NULL,
  tags TEXT,                -- 逗号分隔
  source TEXT,              -- 来源标记（如 user/agent/file:LEARNINGS.md）
  confidence REAL DEFAULT 0.8,
  created_at INTEGER NOT NULL,  -- unix timestamp
  pinned INTEGER DEFAULT 0
);

CREATE VIRTUAL TABLE memories_fts USING fts5(
  content, tags,
  content='memories', content_rowid='id',
  tokenize='unicode61'
);

-- 触发器：保持 FTS 索引同步
CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
END;
CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
END;
```

---

## 2. 实施步骤（按依赖顺序）

### Step 1: 基础设施（30 分钟）

- [ ] **1.1** 在 `skills-mcp-server/package.json` 加 `better-sqlite3` 依赖
- [ ] **1.2** 创建 `skills-mcp-server/lib/db.js`：连接管理、schema 初始化、按项目分库
- [ ] **1.3** 在 `~/.cline-skills/memory/` 路径自动创建（首次调用时）

### Step 2: Memory Handler 三件套（1 小时）

- [ ] **2.1** `handlers/memory_commit.js`：写入一条记忆，参数 `{kind, content, tags?, source?, confidence?}`
- [ ] **2.2** `handlers/memory_recall.js`：FTS5 检索，参数 `{query, kind?, limit?}`，返回 top-k 结果，标 `[记忆-confidence]` 来源等级
- [ ] **2.3** `handlers/memory_list.js`：列出最近 N 条 / 按 tag 过滤，便于人工审核

### Step 3: 上下文压缩 Handler（30 分钟）

- [ ] **3.1** `handlers/compact_context.js`：参数 `{conversation_text, retention_hints?}`，返回**结构化压缩指令**（不调外部 LLM，由 Cline 自己执行）。输出格式：
  ```
  ## 压缩任务
  原文长度：N tokens
  保留目标：M tokens
  优先保留：[决策、错误、用户偏好]
  优先丢弃：[工具原始输出、重复内容]
  ## 输出 schema
  - 关键决策：...
  - 未解决问题：...
  - 用户偏好：...
  ```

### Step 4: SKILL.md 三件套（1 小时）

- [ ] **4.1** `skills/context-compaction/SKILL.md` + examples + test
- [ ] **4.2** `skills/memory-commit/SKILL.md` + examples + test  
- [ ] **4.3** `skills/memory-recall/SKILL.md` + examples + test

每个 Skill 必须满足 `docs/skill-spec.md` 全部 12 字段 + 4 个必备章节。

### Step 5: 注册到 SOURCE_FILES（10 分钟）

- [ ] **5.1** 在 `skills-mcp-server/index.js` 的 `SOURCE_FILES` 字典加入新三个 Skill 的本地路径（指向 `e:/vscode for claude/skills/.../SKILL.md`）
- [ ] **5.2** 同步更新 `skipEvidence` 列表：memory_* 工具不需要证据链（它们是 runtime 工具不是 Skill 调用器）

### Step 6: 测试与文档（30 分钟）

- [ ] **6.1** 扩展 `test-handlers.js`：分别测 commit → recall 闭环、compact_context 输出格式
- [ ] **6.2** 跑 `node tools/validate-skills.js` 确保零 ERROR
- [ ] **6.3** 更新 `README.md`：新增 Phase 1.5 章节、列出新工具
- [ ] **6.4** 在 `LEARNINGS.md` 追加复盘条目（B+C 路线决策、为何选 SQLite）

### Step 7: 用户验证检查点（高风险确认点）

- [ ] **7.1** 向用户演示：在新对话调用 `memory_recall query="项目偏好"` 得到此次 commit 的内容
- [ ] **7.2** 用户确认体验后，再执行 git commit + push（按宪法规范 6）

---

## 3. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| better-sqlite3 在 Windows 需编译 | 中 | 高 | package.json 版本指定 prebuilt 支持的（>=11.x）；fallback 文档说明手动编译 |
| FTS5 中文分词差 | 中 | 中 | tokenize='unicode61' 已支持 Unicode；后续可换 simple 或外置 jieba |
| 项目哈希冲突 | 极低 | 低 | sha256 截 12 字符够用；冲突时用户感知不到 |
| 记忆膨胀拖慢检索 | 低（MVP 期） | 低 | MVP 不实现 GC；v1.3 加 `memory_forget` |
| 与 Cline 官方 memory 撞车 | 中 | 中 | schema 简单、易迁移；v2.0 计划支持导出 |

---

## 4. 实施顺序检查表（执行追踪）

### Phase A: 基础设施
- [ ] 1.1 依赖
- [ ] 1.2 db.js
- [ ] 1.3 目录初始化

### Phase B: Handlers
- [ ] 2.1 memory_commit
- [ ] 2.2 memory_recall
- [ ] 2.3 memory_list
- [ ] 3.1 compact_context

### Phase C: Skills
- [ ] 4.1 context-compaction
- [ ] 4.2 memory-commit
- [ ] 4.3 memory-recall

### Phase D: 集成
- [ ] 5.1 SOURCE_FILES 注册
- [ ] 5.2 skipEvidence 更新

### Phase E: 验收
- [ ] 6.1 test-handlers
- [ ] 6.2 validate-skills 零 ERROR
- [ ] 6.3 README
- [ ] 6.4 LEARNINGS

### Phase F: 用户审核
- [ ] 7.1 闭环演示
- [ ] 7.2 git commit（用户授权后）

---

## 5. 后续路线（不在本 MVP 范围）

| 版本 | 增量 |
|------|------|
| v1.3 | `memory_forget`、向量化（sqlite-vec）、`memory_pin` |
| v1.4 | 自动从 `LEARNINGS.md` / git log 抽取记忆 |
| v2.0 | trace 持久化（与本 MVP 共用 SQLite）、replay-trace skill |

---

## 6. 与宪法的对齐

| 条款 | 本计划如何满足 |
|------|--------------|
| 证据 > 推测 | 所有缺口论断引用 `docs/gap-analysis-runtime-layer.md` 已标注的来源；技术选型逐条说明理由 |
| 问题 > 方案 | 第 0 节明确「真问题 vs 不做的事」；YAGNI 部分列出主动放弃的能力 |
| 复杂度必须被证明 | MVP 不引入向量库、不引入外部 LLM 调用、不做平台化；每一项延后都附理由 |