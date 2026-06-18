# Product Positioning · cline-skills-workspace

> 锁定日期：2026-06-18  
> 状态：✅ 已定稿（本文件为后续所有设计/开发的最终锚点）  
> 修改本文件需经过 maintainer 显式同意，且必须在 [`AGENT_TUNING_HISTORY.md`](../AGENT_TUNING_HISTORY.md) 留痕。

---

## 0. 为什么要有这份文件

经过 2026-06-18 的方向讨论，我们确认：

> **当前最大的风险不是技术，而是「半个月后又开始讨论 memory、agent、向量库、协同平台」。**

本文件把项目定位钉死，避免漂移。所有后续 plan / handoff schema / README / Skills 必须与本文一致；不一致时**先改本文，再改其他**。

---

## 1. 一句话定位

> **Project Continuity for AI Coding —— Resume your project exactly where you left off.**

中文：**让 AI 从上次停下的地方继续工作。**

### 关键词解读

- **Project Continuity**（项目连续性）：不是「记忆」，是「状态恢复」
- **exactly**：可机器校验、可审计，不是模糊回忆
- **where you left off**：聚焦"上次停下的地方"，而非"项目全貌"

### 我们刻意**不**用的话术

| 不用 | 原因 |
|------|------|
| "AI 不会忘记你的项目" | 容易撞 ChatGPT/Claude/Cline Memory，叙事被覆盖 |
| "Multi-Agent Coordination" | 学生 / 个人开发者无感；打不过 Cursor Teams |
| "Knowledge Graph" / "Vector Memory" | 进入 Iranti / Memorix 红海；与本仓「零 native 依赖」宪法冲突 |
| "Cross-Tool Sync" | 实现复杂度爆炸；handoff 是纯 Markdown 天然兼容，不需要「同步」 |

---

## 2. 我们解决什么

### 唯一核心问题

**间歇式开发的连续性丢失。**

具体表现：

1. **跨会话失忆**：周一聊了 2 小时做到一半，周四回来 Cline 完全不知道上次在哪里。
2. **重启踩同一个坑**：上次确认过「不要改 X 表」，新会话又被 AI 建议改一次。
3. **token 爆炸断档**：一个 task 太长被截断，关键决策丢失，被迫从零解释。

### 三层模型（永久不变）

```
┌─────────────────────────────────────────────────────────────┐
│  memory   = 长期事实层（架构、用户偏好、失败教训）            │
│             生命周期：项目级，跨所有会话                       │
│             工具：memory_commit / memory_recall / memory_list │
├─────────────────────────────────────────────────────────────┤
│  handoff  = 当前工作状态层（status / next_action / do_not）  │
│             生命周期：会话之间，单分支单 active               │
│             工具：handoff_write / handoff_resume / *_validate │
├─────────────────────────────────────────────────────────────┤
│  compact  = 会话内压缩（防 token 爆炸）                       │
│             生命周期：单次会话内部                            │
│             工具：compact_context                             │
└─────────────────────────────────────────────────────────────┘
```

三层职责互不重叠，**禁止合并**。实现层可共享代码（如 summarizer），但产品概念必须独立。

---

## 3. 我们**不**解决什么（YAGNI）

逐条列出，避免后续争议：

| 不做 | 理由 |
|------|------|
| 多 Agent 协同平台（Claude ↔ Codex ↔ Cline 跨工具） | Iranti / Memorix 已占据；我们的「Agent = 任意独立上下文窗口」定义已经覆盖实际需求 |
| 向量数据库 / 语义检索 | FTS5 + bm25 已够用；引入 sqlite-vec / pgvector 违反「零 native 依赖」宪法 |
| 跨工具实时同步 | handoff 是纯 Markdown + git，天然跨工具，不需要做 |
| 团队协同 / 权限模型 / 冲突合并 | 打不过 Cursor Teams；本仓目标用户是个人开发者 |
| Web UI / 仪表盘 | CLI + Markdown 文件 + git 已够；UI 是分心项 |
| 自动从 LLM 调用生成摘要 | server 保持 pure，由 Cline 自己用 SKILL.md 触发摘要 |
| 跨语言 SDK / HTTP 接口 | MCP stdio 已是标准协议；多接口分散精力 |

---

## 4. 目标用户（按优先级）

### 第一层 · 核心用户：重度 AI Coding 用户 ⭐

特征：
- 每天开新会话，频繁遇到 context window 爆炸
- 已经感受到上下文断裂的痛苦
- side project 持续数周以上
- 关注开源工具，会装 MCP / 写配置 / 给 star
- 在 HN / X / Reddit 传播能力强

**他们是 star 来源，也是反馈来源。**

### 第二层 · 自然用户：长周期个人项目开发者

包括：
- 独立开发者
- 毕设 / 长期学习项目
- 开源维护者
- 博客系统 / 工具站等 side project

特征：
- 项目断断续续做几周到几个月
- 对"恢复昨天的工作"有真实痛感
- 不一定每天都用，但回到项目时必用

### 第三层 · 自然受益者：本地模型用户

特征：
- 用 Cline + 本地 LLM（Ollama / vLLM 等）
- 不想被 Claude Pro / OpenAI 绑定
- 对隐私 / 离线友好工具有偏好

**注意**：本地模型用户 ≠ 一定有连续性问题；很多是实验党。**他们是天然受益者，不是价值来源。**

### 我们**不**面向的群体

- ❌ 企业团队（Cursor Teams / GitHub Copilot Enterprise 已经做透）
- ❌ 纯学生作业（生命周期太短，handoff 派不上用场）
- ❌ 一次性脚本 / Hackathon 赶工党（不需要持续性）

---

## 5. 核心工作流

```
┌──────────────────┐
│  会话 N（周一）   │
│  做了一堆事       │
└────────┬─────────┘
         │ handoff_write
         ▼
┌──────────────────┐
│  .cline/handoffs/ │
│  HANDOFF_xxx.md   │  ← 进 git，PR 可 review
└────────┬─────────┘
         │
         │ ……一周后……
         │
┌────────▼─────────┐
│  会话 N+1（下周）  │
└────────┬─────────┘
         │ handoff_resume
         ▼
┌──────────────────┐
│  自动校验：       │
│  - branch 匹配？  │
│  - status=active？│
│  - stale 检测     │
└────────┬─────────┘
         │ ✅
         ▼
┌──────────────────┐
│  恢复：           │
│  goal             │
│  next_action      │
│  do_not           │
│  artifacts        │
└──────────────────┘
```

---

## 6. 存储策略

### 默认：进 git
```
<project-root>/.cline/handoffs/
├── HANDOFF_<branch>_active.md       # 单分支单 active
├── INDEX.md                         # 自动维护的活跃列表
└── archive/
    └── HANDOFF_2026-06-15_main.md   # status≠active 时归档
```

**为什么默认进 git**：
- 项目状态属于项目，不属于个人
- 换电脑、新成员、新 Agent 都能直接 `git clone` 拿到上下文
- PR review 时可见 `status: active → done` 的 diff，天然审计
- 回滚天然有 git 历史，无需额外设计

### 可选：本地模式

```bash
handoff_write --local
```

落到 `~/.cline-skills/handoffs/<project-hash>/`，用于：
- 私有项目（不想进仓库）
- 个人实验
- 公司禁止 commit AI 生成内容的环境

**默认行为不变**——`--local` 是显式 opt-in。

### 文件膨胀缓解（必须设计在 MVP 里）

| 风险 | 缓解 |
|------|------|
| 一个月堆 30+ handoff 文件 | 单 branch 单 active；status≠active 自动移到 `archive/` |
| `git log` 被淹没 | `handoff_resume` 默认只看 `status: active`；INDEX.md 自动维护 |
| 命名冲突 | 文件名格式固定：`HANDOFF_<branch>_active.md`；归档时加日期 |

---

## 7. MVP 范围（Phase 1.5 重新定义）

### MCP 工具集

| 工具 | 优先级 | 状态 | 备注 |
|------|--------|------|------|
| `memory_commit` | P0 | ✅ 已有 | 定位调整为「长期事实」 |
| `memory_recall` | P0 | ✅ 已有 | 同上 |
| `memory_list` | P0 | ✅ 已有 | 同上 |
| `compact_context` | P0 | ✅ 已有 | 定位调整为「会话内压缩」 |
| **`handoff_write`** | **P0** | 🆕 新增 | typed YAML，写入 `.cline/handoffs/` |
| **`handoff_resume`** | **P0** | 🆕 新增 | 自动校验 branch+status+stale，恢复上下文 |
| `handoff_validate` | P1 | 🆕 新增 | 单文件 schema 校验，CI 友好 |
| `handoff_list` | P2 | 🆕 新增 | 仅在调试/审计时用 |

### Handoff Schema（最终版）

```yaml
---
status: active              # active | blocked | done | stale
branch: feature/xxx         # 必填，git 当前分支
goal: <一句话项目目标>
updated_at: 2026-06-18T15:30:00+08:00
---

## completed
- 已完成事项 1
- 已完成事项 2

## in_progress
- 正在进行事项

## next_action
- 下一步要执行的具体动作

## do_not
- 不要再尝试 X（已确认无效）
- 不要碰 user 表 schema

## artifacts
- src/auth/token-validator.ts
- tests/auth.integration.test.ts

## blocked_by
- (optional) 被什么阻塞
```

### 配套 Skills

| Skill | 优先级 | 备注 |
|-------|--------|------|
| `skills/handoff-protocol/` | P0 | 教 Cline 何时写、何时 resume、字段含义 |
| `skills/memory-keeper/` | ✅ 已有 | 内容更新：明确与 handoff 的边界 |
| `skills/context-compactor/` | ✅ 已有 | 内容更新：明确与 handoff 的边界 |

---

## 8. 对外叙事（README 主标题）

### 英文主标题

```
🧠 cline-skills-workspace
Project Continuity for AI Coding.
Resume your project exactly where you left off.
```

### 中文 Tagline

> 让 AI 从上次停下的地方继续工作。

### 首屏 demo（README hero）

应该展示：
1. `do_not` 列表的价值（最具差异化）
2. `handoff_resume` 单条命令恢复上下文
3. git diff 视角下的 `status: active → done`

不应该展示：
- 多 agent 协同
- 向量检索
- 仪表盘 UI

---

## 9. 防漂移条款（最重要）

任何 PR / Issue / 讨论涉及以下方向时，**先回到本文件 §3**，确认是否在「不做」列表里：

- 想加向量库？→ §3 已禁止
- 想做 Web UI？→ §3 已禁止
- 想做团队协同？→ §3 已禁止
- 想做跨工具同步？→ §3 已禁止
- 想合并 compact 和 handoff？→ §2 已禁止

如果确实有充分理由打破禁令，**必须先修改本文件**，并在 `AGENT_TUNING_HISTORY.md` 留下：
- 决策时间
- 决策人
- 推翻 §X 的具体证据
- 新方向的边界

---

## 10. 与宪法的对齐

| 宪法条款 | 本定位如何满足 |
|----------|--------------|
| 证据 > 推测 | 三层模型基于 2026-06-18 真实讨论 + 业界范式调研（Iranti / Memorix / casr / mer.vin） |
| 问题 > 方案 | §2 明确「唯一核心问题」；先定义连续性丢失，再设计 handoff |
| 复杂度必须被证明 | §3 列出 7 项主动不做；MVP 工具集仅 8 个（4 已有 + 4 新增 P0/P1/P2） |

---

## 11. 后续文档依赖关系

```
docs/product-positioning.md  ← 本文，最高锚点
        │
        ├─→ docs/handoff-schema.md          (P0，schema 规范)
        │
        ├─→ docs/superpowers/plans/2026-06-18-context-and-memory-mvp.md
        │   (重写为：Phase 2 = Handoff Protocol)
        │
        ├─→ skills/handoff-protocol/SKILL.md
        │
        └─→ README.md (首屏更新)
```

写任何下游文档前，**先 grep 本文确保概念一致**。

---

## 附录 A：术语表

| 术语 | 定义 |
|------|------|
| **Project Continuity** | 项目状态在跨会话/跨 agent 间无损恢复的能力 |
| **Agent** | 任意独立上下文窗口（不限于具体产品） |
| **Handoff** | 一次会话向下一次会话传递的 typed state 文件 |
| **Active Handoff** | 当前 branch 上 status=active 的唯一 handoff 文件 |
| **Stale Handoff** | 距 updated_at 超过阈值（默认 14 天）但未归档的 handoff |
| **do_not 列表** | 已确认无效的尝试 / 锁定的不变量，避免下次重复踩坑 |

## 附录 B：竞品对照

| 产品 | 范式 | 核心存储 | 我们的差异 |
|------|------|---------|----------|
| Cline 官方 memory | 单 agent KV | black-box | 我们 git-trackable + typed state |
| `CLAUDE.md` / `AGENTS.md` | 启动时注入 | 单文件 | 我们有 status / next_action / 时间维度 |
| Iranti | 多工具共享事实 | Postgres + pgvector | 我们零 native 依赖、不做事实层 |
| Memorix | MCP 跨客户端 memory | 多种后端 | 我们聚焦 handoff 而非 memory |
| casr | 跨 agent session 转换 | IR 中间表示 | 我们更轻量，单 schema |
| agent-handoff (codes1gn) | 结构化 handoff 文件 | Markdown | **方向最近**，我们额外做 stale 检测 + memory 互补 |

我们的位置：**Lightweight, Git-native, MCP-first Project Continuity Layer**。
