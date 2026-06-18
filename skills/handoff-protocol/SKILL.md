---
name: handoff-protocol
version: 0.1.0
description: 跨会话工作交接协议 — 创建和管理结构化 handoff 文件，让 AI 从上次停下的地方继续工作，记录 goal / next_action / do_not 等关键状态
category: utility
preferred_mode: any
tools: [handoff_write, handoff_resume]
permissions: [requires_user_approval_for_write]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---

# Handoff Protocol · 项目连续性协议

## 前置条件

- skills-mcp-server 已启动，且 `handoff_write` / `handoff_resume` 工具可见
- 当前工作目录在 git 仓库内（默认模式）；或显式传 `local: true` 使用用户目录模式
- 项目根可写入 `.cline/handoffs/` 目录（已或将加入版本控制）
- handoff schema：见 [`docs/handoff-schema.md`](../../docs/handoff-schema.md) v1.0

## 输入

`handoff_write`（写入/更新/归档 active handoff）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | enum | 否 | `active`（默认）/ `blocked` / `done`。done 立即归档；blocked 时 blocked_by 必填 |
| goal | string | 首次必填 | 一句话项目目标，建议 ≤120 字符 |
| completed | string[] | 否 | 已完成的里程碑 |
| in_progress | string[] | 否 | 进行中事项（带进度估计） |
| next_action | string[] | 首次必填 | 下一步动作，至少 1 项 |
| do_not | string[] | 否 | 已确认无效尝试 / 锁定不变量（差异化价值最高） |
| artifacts | string[] | 否 | 关键文件路径（让下个会话直接 read_file） |
| blocked_by | string[] | 条件必填 | status=blocked 时必填 |
| local | boolean | 否 | 默认 false。true 时落到 `~/.cline-skills/handoffs/<project-hash>/` |

`handoff_resume`（新会话开局恢复）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| local | boolean | 否 | 同 write |
| branch | string | 否 | 显式指定 branch（覆盖 git 自动探测） |
| confirm_branch_mismatch | boolean | 否 | true 时强制接受 branch 不一致的 handoff |
| confirm_stale | boolean | 否 | true 时强制接受 stale handoff，并自动改 status=stale 写回 |
| confirm_project_hash_mismatch | boolean | 否 | true 时强制接受项目 hash 不一致 |
| stale_days | number | 否 | stale 阈值，默认 14 |

## 输出

- **正常输出**：
  - `handoff_write`：人类可读的成功提示（branch / status / path / goal / counts）
  - `handoff_resume`：Markdown 简报（goal / next_action / do_not / in_progress / artifacts）+ 末尾 JSON payload（可被调用方程序化解析）
- **错误输出**：明确的错误码（NO_HANDOFF / INVALID_HANDOFF / BRANCH_MISMATCH / STALE_HANDOFF / PROJECT_HASH_MISMATCH / VALIDATION_FAILED / BLOCKED_REQUIRES_REASON / GOAL_REQUIRED_ON_FIRST_WRITE / NEXT_ACTION_REQUIRED / NOT_IN_GIT），附下一步建议

## 使用示例

### 示例 1：新会话开局必跑（最重要）

**场景**：用户开新会话，没交代任务背景

**Agent 行为**：
1. 立即调用 `handoff_resume`（无参数）
2. 若返回 `ok: true` → **主动复述 goal / next_action / do_not 并请用户确认**，再开始干活
3. 若返回 `NO_HANDOFF` → 当作真正的新项目处理；当用户给出第一个具体目标时，立即 `handoff_write` 创建第一份 handoff
4. 若返回 `STALE_HANDOFF` / `BRANCH_MISMATCH` → 把错误信息原样展示给用户，等用户决定是否传 `confirm_*` 参数

```json
{ "tool": "handoff_resume", "args": {} }
```

### 示例 2：会话即将结束，写交接

**场景**：用户说「今天先到这里」/ 上下文窗口接近上限 / 准备切换 branch

**Agent 行为**：
1. 整理本次会话产出，识别 completed / in_progress / next_action
2. 重要：把"已确认无效的尝试"和"不要再碰的不变量"写进 `do_not`——这是最有差异化价值的字段
3. 列出关键 artifacts（让下个会话能直接 read_file）
4. 调用 `handoff_write`，至少传 goal 和 next_action

```json
{
  "tool": "handoff_write",
  "args": {
    "goal": "Migrate auth middleware to token-based flow",
    "completed": [
      "Extract auth service to src/auth/service.ts",
      "Token validator skeleton + 6/10 unit tests"
    ],
    "in_progress": ["Refresh token rotation (50%)"],
    "next_action": [
      "Finish remaining 4 token validator tests",
      "Run npm run test:integration -- auth"
    ],
    "do_not": [
      "Do NOT change users table schema",
      "Do NOT remove legacy session support before v2.0",
      "Do NOT use the old verifyJWT helper (deprecated)"
    ],
    "artifacts": [
      "src/auth/service.ts",
      "src/auth/token-validator.ts",
      "tests/auth/validator.test.ts"
    ]
  }
}
```

### 示例 3：任务完成，归档 handoff

**场景**：feature 全部完成，准备 PR

```json
{ "tool": "handoff_write", "args": { "status": "done" } }
```

active 文件被移到 `archive/HANDOFF_<slug>_<date>_<id>.md`，active 槽位释放。git diff 中能看到 active 文件被删 + archive 增加一条，PR review 一目了然。

### 示例 4：被外部依赖阻塞

**场景**：等上游修复 / 等用户决策 / 等审批

```json
{
  "tool": "handoff_write",
  "args": {
    "status": "blocked",
    "blocked_by": [
      "Waiting on @teammate to merge PR #123",
      "Need product decision on feature flag rollout"
    ]
  }
}
```

## 何时调用（触发策略）

### `handoff_resume` 必触发场景

- **新会话第一条 thinking 内**（最重要）——比 `memory_recall` 更高优先级，因为 handoff 直接告诉你"上次停在哪"
- 用户说"继续昨天的工作" / "我们做到哪了" / "上次卡在哪"
- 切换到陌生 branch 想了解状态时

### `handoff_write` 必触发场景

- 用户说"今天先这样" / "下次再继续" / "这部分先放一下"
- 上下文窗口已用 60%+，且当前任务不会在本会话内完成
- 完成一个明显的里程碑（功能闭环 / 子任务完成）
- 切换到完全不同的任务前
- 用户说"提 PR" / "merge 了" → `status: done`
- 遇到外部阻塞 → `status: blocked` + `blocked_by`

### 不要调用的场景

- 单条 quick fix 任务（一问一答完成的）
- 用户只是问问题、查文档（无状态变化）
- 已在 done 状态后再写（应当作新任务，先 resume 看是否有 active）

## handoff vs memory vs compact 三层职责

严格区分（见 [`docs/product-positioning.md`](../../docs/product-positioning.md) §2，**不可合并**）：

| 层 | 用途 | 生命周期 | 工具 |
|---|---|---|---|
| **memory** | 长期事实（架构、用户偏好、失败教训） | 跨所有会话 | memory_commit / memory_recall |
| **handoff** | 当前工作状态（status / next_action / do_not） | 会话之间，单 branch 单 active | handoff_write / handoff_resume |
| **compact** | 单次会话内压缩（防 token 爆炸） | 单会话内 | compact_context |

**不要合并**：handoff 中的 `do_not` 是单任务的不变量；如果是项目级永久不变量（"本项目用 ESM"），应同时 `memory_commit kind=semantic`。

## do_not 字段为什么最重要

这是 Project Continuity 的差异化价值：

- 上次 30 分钟试错确认"不要改 users 表 schema" → 写进 `do_not`
- 下次会话不会再被 AI 建议改一次，省 30 分钟
- 比 completed/next_action 更稀缺：completed 能从 commit 看出，next_action 能从 issue 看出，**do_not 只能靠人沉淀**

写 handoff 时优先填 do_not。空 do_not 列表会触发 W007 警告。

## 状态机

```
       handoff_write (首次)
              │
              ▼
        ┌──────────┐
        │  active  │◀──── handoff_write (更新)
        └────┬─────┘
             ├──→ blocked （需 blocked_by）
             ├──→ done    （立即归档）
             └──→ stale   （≥14 天自动）→ resume 时显式确认
```

## 文件位置

- 默认（git-tracked）：`<project-root>/.cline/handoffs/HANDOFF_<branch-slug>_active.md`
- 归档：`<project-root>/.cline/handoffs/archive/HANDOFF_<slug>_<YYYY-MM-DD>_<nanoid6>.md`
- 本地模式（`local: true`）：`~/.cline-skills/handoffs/<project-hash>/...`
- 单 branch 同时只能有 1 个 active

## 与宪法的对齐

- **证据优于推测**：handoff 是 typed state，不是模糊回忆；frontmatter 字段全部强校验
- **问题定义优于方案设计**：resume 时主动复述 next_action 和 do_not，让用户**先确认问题定义**再开干
- **复杂度必须被证明**：handoff 是纯 Markdown + git，无新基础设施；不引入数据库、不引入 UI

## 故障排查

| 错误码 | 含义 | 处理 |
|---|---|---|
| `NO_HANDOFF` | 当前 branch 无 active handoff | 调 `handoff_write` 创建 |
| `INVALID_HANDOFF` | 文件存在但 schema 校验失败 | 看错误码列表，手动修文件 |
| `BRANCH_MISMATCH` | 文件中的 branch 与 git 不同 | 确认意图后传 `confirm_branch_mismatch: true` |
| `STALE_HANDOFF` | ≥14 天未更新 | 确认仍要继续后传 `confirm_stale: true` |
| `PROJECT_HASH_MISMATCH` | 项目可能被搬迁 | 确认是同项目后传 `confirm_project_hash_mismatch: true` |
| `BLOCKED_REQUIRES_REASON` | status=blocked 缺 blocked_by | 补 blocked_by 数组 |
| `GOAL_REQUIRED_ON_FIRST_WRITE` | 首次创建缺 goal | 补一句话目标 |
| `NEXT_ACTION_REQUIRED` | 首次创建缺 next_action | 补至少 1 项 |
| `NOT_IN_GIT` | 不在 git 仓库 | `git init` 或传 `local: true` |