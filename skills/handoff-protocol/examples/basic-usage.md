# Handoff Protocol · 基本用法

## 场景一：周一开始 → 周四继续

### 周一会话末尾

用户：今天先到这里，下周接着搞认证模块

Cline 行为：

```json
{
  "tool": "handoff_write",
  "args": {
    "goal": "Migrate auth middleware to token-based flow",
    "completed": [
      "Extract auth service abstraction (src/auth/service.ts)",
      "Token validator: 6/10 unit tests passing"
    ],
    "in_progress": [
      "Refresh token rotation logic (50%)"
    ],
    "next_action": [
      "Finish remaining 4 token validator tests",
      "Run npm run test:integration -- auth",
      "Wire validator into login controller"
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

返回：

```
✅ handoff 已创建
- branch: feature/auth-refactor
- status: active
- path: .cline/handoffs/HANDOFF_feature-auth-refactor_active.md
- next_action: 3 项
- do_not: 3 项
```

### 周四新会话开局

用户：继续

Cline 第一步（thinking 后立即调用）：

```json
{ "tool": "handoff_resume", "args": {} }
```

返回的 Markdown 简报中会显示 goal / next_action / do_not，Cline 必须**主动复述**：

> 上次（3 天前）我们在做：迁移 auth middleware 到 token 流程。
>
> next_action：
> 1. 完成剩余 4 个 token validator 测试
> 2. 跑集成测试
> 3. 把 validator 接入 login 控制器
>
> do_not（请勿做）：
> - 不要改 users 表 schema
> - v2.0 前不要移除 legacy session 支持
> - 不要用废弃的 verifyJWT helper
>
> 确认从第 1 项开始？

用户：好

→ Cline 直接打开 `tests/auth/validator.test.ts` 开干，**省去问"项目是干嘛的"的环节**。

---

## 场景二：会话内迭代更新

随着工作推进，handoff 可以多次更新（合并字段）：

```json
{
  "tool": "handoff_write",
  "args": {
    "completed": [
      "Token validator: 10/10 unit tests passing"
    ]
  }
}
```

只传 `completed` 时，其他字段保留旧值。`updated_at` 会刷新。

显式覆盖 `next_action`：

```json
{
  "tool": "handoff_write",
  "args": {
    "next_action": [
      "Wire validator into login controller",
      "Handle refresh token rotation edge cases"
    ]
  }
}
```

旧的 next_action 全被替换。

---

## 场景三：阻塞与恢复

被阻塞：

```json
{
  "tool": "handoff_write",
  "args": {
    "status": "blocked",
    "blocked_by": [
      "Waiting on @teammate to merge PR #123 (token storage backend)"
    ]
  }
}
```

阻塞解除时改回 active：

```json
{
  "tool": "handoff_write",
  "args": { "status": "active" }
}
```

---

## 场景四：完成归档

任务全部完成：

```json
{ "tool": "handoff_write", "args": { "status": "done" } }
```

效果：
- active 文件被移到 `.cline/handoffs/archive/HANDOFF_feature-auth-refactor_2026-06-25_a1b2c3.md`
- INDEX 自动更新
- git diff 显示 active 删除 + archive 新增，PR review 时一目了然

---

## 场景五：14 天未更新触发 stale

第 15 天打开 resume：

```json
{ "tool": "handoff_resume", "args": {} }
```

返回：

```
⚠️ STALE_HANDOFF
handoff 距今 15 天未更新（≥ 14 天阈值）。
goal: Migrate auth middleware to token-based flow
下一步：若确认仍要继续，重试时传 confirm_stale: true
```

如果还要继续，确认：

```json
{ "tool": "handoff_resume", "args": { "confirm_stale": true } }
```

文件 status 自动改为 `stale`，但仍可读取。提示用户：「记忆可能过时，请快速浏览 do_not 后再决定哪些 next_action 还成立」。