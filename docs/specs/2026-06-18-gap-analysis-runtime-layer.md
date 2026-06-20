# 项目缺口分析：从「Skill 仓库」到「Agentic Runtime」

> 创建日期：2026-06-18  
> 视角：前沿 AI 从业者复盘  
> 触发问题：当前项目缺上下文压缩与跨对话记忆，这些都是 Agent 软件的核心痛点

---

## 0. TL;DR

当前项目把全部精力放在 **「Skill as Artifact」**（可发现、可验证、可分发的 prompt 资产）上，但 **Agent 工业化的真正瓶颈在 Runtime 层**：上下文管理、跨会话记忆、状态共享、可观测性。

**关键征兆**：`SKILL.md` frontmatter 已声明 `context_priority: high|medium|low`，但代码里没有任何机制消费它 —— 这是个「愿望字段」 [实测：`docs/skill-spec.md` 与 `skills-mcp-server/index.js` 交叉对比]。

建议在现有 Roadmap 中插入 **Phase 1.5：Runtime Foundations**（2-3 周即可交付 MVP），让项目叙事从「另一个 awesome-list」升级为 **「Cline Agent 操作系统的内核组件」**。

---

## 1. 缺口清单（按优先级）

### 🔴 P0 — 核心 Runtime 缺口

#### 1.1 上下文压缩层（Context Compaction Layer）

参考 MemGPT 的分层架构：

| 层级 | 内容 | 处理策略 |
|------|------|---------|
| **Hot** | 当前任务必需 | 永不压缩 |
| **Warm** | 历史对话 | LLM 摘要化（10 轮 → 200 字） |
| **Cold** | 久远内容 | 下沉到向量库 / 文件，按需 recall |

**落地形式**：
- 触发器：token 用量达 70% 自动启动
- 新增 Skill：`summarize-conversation` / `extract-decisions` / `prune-tool-output`
- `context_priority` 字段从「愿望」升级为「真正影响压缩决策的输入」

**为什么是 P0**：Cline 默认的上下文管理是粗暴截断或全量加载，Skill 体系再好也会被「上下文耗尽」直接劝退。这是 Agent 工业化的第一性瓶颈。

#### 1.2 跨会话记忆系统（Persistent Memory）

`LEARNINGS.md` 是**人类**的经验库，**Agent 自己没记忆**。每次新对话都不知道：项目架构假设、用户偏好、上次卡在哪。

参考 Letta / Mem0 的三层记忆模型：

| 层 | 内容示例 | 存储 | 写入时机 |
|----|---------|------|---------|
| **Episodic（情景）** | "2026-06-15 用户要求 PowerShell 脚本用 BOM" | SQLite + 时间戳 | 任务结束时 LLM 抽取 |
| **Semantic（语义）** | "本项目用 ESM、Windows 路径需 pathToFileURL" | 向量库 (Qdrant/Chroma/SQLite-vec) | 跨任务沉淀 |
| **Procedural（程序）** | "用户偏好的 commit message 风格" | KV 存储 | 显式教学 / 反馈 |

**落地形式**：
- 新增 `skills/memory-management/`：`recall-context` / `commit-learning` / `forget`（支持 GDPR 式遗忘）
- 新增 `skills-mcp-server/handlers/memory.js`：暴露 `memory_search` / `memory_write` / `memory_pin` 三个 MCP 工具
- 存储位置：`~/.cline-skills/memory/{project-hash}/`，按项目隔离

**为什么是 P0**：这是从「会话级 Agent」走向「项目级 AI 同事」的分水岭。Devin Memory、Cursor Background Agent 都在这条线上发力。

---

### 🟡 P1 — 让 Agent 真正可靠

#### 1.3 Skill 间状态总线（Workspace Scratchpad）

`brainstorming` 产出的设计文档，`writing-plans` 怎么知道？目前只能靠 LLM 在对话里自己串，链条很脆。

**建议**：
- `.cline/workspace/{task-id}/` 目录，约定字段 `design.md` / `plan.md` / `debug-log.md`
- MCP 提供 `workspace_read` / `workspace_write`，避免 LLM 自拼路径
- 这就是 Anthropic 在 Claude Code 里 `CLAUDE.md` + `.claude/` 的工程化版

#### 1.4 执行追踪与可观测性（Trace / Replay）

当前 `skills-mcp-server/index.js` 的 `evidenceLog` 只在内存里，进程一关就没了 [实测]。无法回答：
- "上周那次失败任务的工具调用顺序是什么？"
- "这个 Skill 平均失败率多少？"

**建议**：
- OpenTelemetry-style 追踪：每个 tool call 是一个 span
- 持久化到 SQLite：`traces.db`
- 新增 Skill `replay-trace`：把历史 trace 喂给 LLM 复盘
- 远期：导出 OTLP 给 Langfuse / Phoenix 做可视化

**与记忆系统的协同**：trace 数据本身就是「跨会话记忆」的原材料。

#### 1.5 成本与预算控制（Cost Governance）

当前完全不可见。一个大任务可能烧 $20+ token 用户才发现。

**建议**：
- frontmatter 增加 `estimated_tokens`
- MCP 暴露 `budget_check`，超预算强制 `plan_mode_respond` 确认
- 成本数据并入 trace

---

### 🟢 P2 — 生态级能力

| # | 能力 | 说明 |
|---|------|------|
| 1.6 | Skill 运行时降级与回滚 | `cline-skills rollback brainstorming@1.0.0` —— npm 已成熟，skill 生态空白 |
| 1.7 | Skill 可信度与签名 | `permissions` 字段需 runtime enforcement；CI 阶段对 SKILL.md 做 prompt injection 静态扫描（识别「忽略之前指令」「执行以下 shell」等模式） |
| 1.8 | 多模态 Skill 支持 | frontmatter 增加 `modalities: [text, image, audio]`；MCP 支持 base64 image content |
| 1.9 | 端到端评测基准 | 不止单 Skill 测试，要测「brainstorming → writing-plans → executing-plans」整链；跨模型评测（Claude/GPT/Gemini）—— 这是开源 Skill 仓库的护城河 |
| 1.10 | 人在回路反馈学习 | 收集 (skill, context, rejection_reason) 三元组，沉淀到 procedural memory，形成「这个 Skill 在 X 场景下不要用」的负面规则 |

---

## 2. Roadmap 调整建议

你当前的 Phase 1-4 全部聚焦在「Skill as Artifact」。建议插入：

```
Phase 1   (v1.0)   Skill 规范化              ← 当前
Phase 1.5 (v1.2)   Runtime: 记忆 + 压缩      ← 新增 ⭐
Phase 2   (v1.5)   MCP Server 工业化
Phase 3   (v2.0)   工具链 + 社区
Phase 4   (v3.0)   平台化
```

### Phase 1.5 最小可行集（2-3 周）

| # | 产出 | 说明 |
|---|------|------|
| 1 | `skills/context-compaction/` | 上下文压缩 Skill（触发逻辑写在 SKILL.md） |
| 2 | `skills/memory-recall/` + `skills/memory-commit/` | 记忆读写 Skill |
| 3 | `skills-mcp-server/handlers/memory.js` | 工具：`memory_search` / `memory_write` / `memory_list` |
| 4 | 存储后端 | SQLite + FTS5 关键词检索（向量化推迟到 v1.3，避免引入重依赖） |
| 5 | `skills/workspace-scratchpad/` | Skill 间状态共享 |

### 退出标准

- 一个新对话能通过 `recall-context` 自动获取项目历史决策
- 长任务 token 用量达阈值时自动触发摘要，无需用户干预
- `LEARNINGS.md` 由 Agent 自动追加（人类只做审核）

---

## 3. 战略价值（为什么现在做）

1. **市场窗口**：Cline / Cursor / Continue 都还没有标准化的 memory schema，**谁先定义谁就有标准制定权**
2. **叙事升级**：从 "awesome-cline-skills" → "Cline 的内核扩展"，吸引的贡献者层次完全不同
3. **数据飞轮**：trace + memory 沉淀下来的数据，是 LLM-as-a-Judge 评测的天然燃料，反过来强化 Phase 3 的测试运行器
4. **与现有架构契合**：你的 `evidenceLog` 已经是 trace 的雏形，`LEARNINGS.md` 已经是 memory 的雏形 —— 这两个完全是**自然延伸**，不是另起炉灶

---

## 4. 与 Agent Constitution 的一致性检查

| 宪法条款 | 本建议如何遵守 |
|---------|--------------|
| 证据优于推测 | 缺口论断都有 [实测] 标注；MemGPT/Letta/Mem0 标为 [社区] 参考 |
| 问题 > 方案 | 先定义「上下文爆炸 / 失忆」是真问题，再提方案；列出多个落地路径供选择 |
| 复杂度必须被证明 | 不立刻引入向量库（Phase 1.5 用 SQLite + FTS5 即可），向量化推迟到验证需求后；不一次性设计平台化 |

---

## 5. 风险与缓解

| 风险 | 缓解 |
|------|------|
| Phase 1.5 让 Phase 1 延期 | Phase 1.5 与 Phase 1 不冲突 —— 前者写新 Skill 和 handler，后者改造老 Skill；可并行 |
| 记忆数据的隐私问题 | 默认本地存储；提供 `forget` Skill；`registry.json` 不收集任何记忆数据 |
| 记忆召回不准确反而误导 Agent | 记忆条目带 confidence score；召回结果必须标 `[记忆]` 来源等级（低于 `[实测]`） |
| 与 Cline 官方 memory 方案撞车 | 把存储格式做成开放 schema，未来可适配 Cline 官方 |

---

## 6. 决策建议

**短期（本月）**：
- 先在 `LEARNINGS.md` 里写一条「项目缺 Runtime 层」的复盘，作为后续决策起点
- 用 `brainstorming` Skill 探索 Phase 1.5 的具体取舍（向量库 vs SQLite？记忆抽取用哪个 LLM？）
- 用 `writing-plans` Skill 把 Phase 1.5 落成可执行计划

**中期（v1.2）**：
- 实现 Phase 1.5 最小可行集（5 个产出）
- 在 `docs/specs/` 下补一份 `runtime-foundations-spec.md`，对照本文件第 1-2 节细化设计
- 把 `evidenceLog` 从内存升级到 SQLite 持久化，作为 trace 系统的起点

**长期（v2.0+）**：
- trace + memory 数据接入 LLM-as-a-Judge 测试运行器，形成「真实使用 → 经验沉淀 → 测试用例 → 质量提升」的飞轮
- 与 Cline 官方对齐 memory schema，争取成为社区标准
