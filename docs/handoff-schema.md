# Handoff Schema · v1.0

> 定稿日期：2026-06-18  
> 上游锚点：[`docs/product-positioning.md`](./product-positioning.md) §7  
> 状态：✅ 规范定稿（实现层必须严格遵循；任何字段变更需先改本文 + bump `schema_version`）

---

## 0. 范围与不变量

本文件规定 cline-skills-workspace **handoff 文件的存储位置、命名、字段、状态机、校验规则**。

实现层（`handoff_write` / `handoff_resume` / `handoff_validate`）必须 100% 与本文一致。

### 不变量（与定位文档对齐）

| 不变量 | 来源 |
|--------|------|
| 一个 branch 同一时刻只能有 1 个 `status: active` 的 handoff | 定位 §6 |
| handoff 是 typed state，不是 prose | 定位 §1 |
| 默认进 git，可选 `--local` opt-in | 定位 §6 |
| handoff ≠ memory ≠ compact，三者禁止合并 | 定位 §2 |

---

## 1. 文件位置与命名

### 1.1 默认（git-tracked）

```
<project-root>/.cline/handoffs/
├── HANDOFF_<branch-slug>_active.md          # 当前 active（唯一）
├── INDEX.md                                  # 自动维护，列出所有 active
└── archive/
    ├── HANDOFF_<branch-slug>_<YYYY-MM-DD>_<id>.md   # 归档
    └── …
```

### 1.2 本地模式（`--local`）

```
~/.cline-skills/handoffs/<project-hash>/
├── HANDOFF_<branch-slug>_active.md
├── INDEX.md
└── archive/
```

`<project-hash>` = `sha256(absolute-project-root)[:12]`（与 memory 库同算法，复用即可）。

### 1.3 命名规则（强制）

| 部分 | 规则 |
|------|------|
| `<branch-slug>` | git 分支名替换 `/` → `-`、`_` → `-`，小写 ASCII。例：`feature/auth-refactor` → `feature-auth-refactor` |
| active 文件 | `HANDOFF_<branch-slug>_active.md`（**唯一**，写入即覆盖；不得追加日期） |
| archive 文件 | `HANDOFF_<branch-slug>_<YYYY-MM-DD>_<id>.md`，`<id>` = 短 nanoid 6 字符（如 `a1b2c3`） |
| 大小写 | 全部大写 `HANDOFF_` 前缀；slug 全小写 |
| 编码 | UTF-8 无 BOM；LF 行尾 |

### 1.4 INDEX.md 自动维护

```markdown
# Handoff Index

> Last synced: 2026-06-18T15:30:00+08:00

## Active

| Branch | Status | Goal | Updated |
|--------|--------|------|---------|
| main | active | refactor auth middleware | 2026-06-18 15:30 |
| feature/x | blocked | add export feature | 2026-06-15 09:12 |

## Recently Archived (last 5)

| Date | Branch | Status |
|------|--------|--------|
| 2026-06-17 | feature/y | done |
```

INDEX.md 由 `handoff_write` / `handoff_resume` / `handoff_validate` 自动重写；用户**不应手动编辑**。

---

## 2. 文件结构（YAML frontmatter + Markdown body）

### 2.1 完整模板

```markdown
---
schema_version: "1.0"
status: active
branch: feature/auth-refactor
goal: Migrate auth middleware to token-based flow
created_at: 2026-06-18T10:00:00+08:00
updated_at: 2026-06-18T15:30:00+08:00
project_hash: 6ba9751232ab
---

## completed
- Auth service abstraction extracted to `src/auth/service.ts`
- Token validator implemented and unit tested

## in_progress
- Refresh token rotation logic（编辑到 50%）

## next_action
- Update login controller to call new validator
- Run integration tests `npm run test:integration -- auth`

## do_not
- Do NOT change `users` table schema
- Do NOT remove legacy session support before v2.0
- Do NOT use the old `verifyJWT` helper（已弃用）

## artifacts
- src/auth/service.ts
- src/auth/token-validator.ts
- tests/auth.integration.test.ts

## blocked_by
<!-- 可选；status=blocked 时必填 -->
```

### 2.2 Frontmatter 字段规范

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|---------|
| `schema_version` | string | ✅ | 必须等于当前版本 `"1.0"`；不匹配时由 `handoff_validate` 报警 |
| `status` | enum | ✅ | `active` \| `blocked` \| `done` \| `stale`，其余值拒绝 |
| `branch` | string | ✅ | 非空；写入时由实现层调用 `git rev-parse --abbrev-ref HEAD` 获取并校验 |
| `goal` | string | ✅ | 非空；建议 ≤ 120 字符（一句话） |
| `created_at` | ISO8601 | ✅ | 含时区；首次 `handoff_write` 设置，后续不修改 |
| `updated_at` | ISO8601 | ✅ | 含时区；每次写入更新 |
| `project_hash` | string | ✅ | `sha256(abs-project-root)[:12]`；用于跨电脑/路径变化时校验是否同一项目 |

### 2.3 Body 章节规范

| 章节 | 必填 | 数量约束 | 内容指导 |
|------|------|---------|---------|
| `## completed` | ✅ | 0-N 项 bullet | 已完成的具体里程碑；首次写可为空 |
| `## in_progress` | ✅ | 0-N 项 | 正在做但未完成的事项；附进度估计 |
| `## next_action` | ✅ | **1-N 项** | 至少 1 项可执行的下一步动作（精确到工具/命令层级） |
| `## do_not` | ✅ | 0-N 项 | 已确认无效的尝试 / 锁定的不变量 |
| `## artifacts` | ✅ | 0-N 项 | 本任务涉及的关键文件路径（让下个会话直接 read_file） |
| `## blocked_by` | ⚠️ | 取决 status | `status=blocked` 时**必填**；其他状态时若存在内容则报警 |

**章节顺序固定**：completed → in_progress → next_action → do_not → artifacts → blocked_by。`handoff_validate` 检测顺序错误。

### 2.4 章节内容格式

- 每项必须以 `- ` 开头（标准 Markdown bullet）
- 允许嵌套（最多 1 层）
- 允许行内 `code`、链接 `[text](url)`、文件路径 backtick 包裹
- **不允许** HTML、图片、表格、代码块（保持 grep / 机器解析友好）

---

## 3. 状态机

```
       handoff_write (首次)
              │
              ▼
        ┌──────────┐
        │  active  │◀──────── handoff_write (更新)
        └────┬─────┘
             │
   ┌─────────┼─────────┬───────────┐
   │         │         │           │
   ▼         ▼         ▼           ▼ (14 天无更新)
┌──────┐ ┌──────┐ ┌──────┐    ┌────────┐
│ done │ │blocked│ │stale │    │  stale │
└──┬───┘ └───┬──┘ └───┬──┘    └───┬────┘
   │         │        │            │
   │  resume 时       │            │
   │  显式确认        │            │
   ▼         ▼        ▼            ▼
        archive/（移动到归档目录）
```

### 3.1 状态语义

| 状态 | 含义 | 可由谁设置 |
|------|------|-----------|
| `active` | 工作正在进行，可被 `handoff_resume` 直接接手 | `handoff_write` 默认值 |
| `blocked` | 等待外部依赖 / 用户决策 / 上游修复；**`blocked_by` 必填** | 显式传入 |
| `done` | 任务完成，归档保留供未来参考 | 显式传入或 `finishing-a-development-branch` 流程触发 |
| `stale` | `updated_at` 距今 > 14 天且仍是 active；由 `handoff_resume` / `handoff_validate` **自动标记** | 自动 |

### 3.2 stale 判定阈值

- **默认**：`updated_at` 距 `now()` ≥ 14 天
- 可配置：`.cline/handoffs/.config.json` 里 `{"stale_days": N}`（实现层未来扩展）
- 触发时机：每次 `handoff_resume` 启动时检查；可显式 `handoff_validate --check-stale`

### 3.3 状态变迁规则

| 变迁 | 触发 | 副作用 |
|------|------|-------|
| `(首次)` → `active` | `handoff_write` | 创建 active 文件 + 更新 INDEX.md |
| `active` → `active` | `handoff_write`（更新） | 覆盖文件 + 更新 `updated_at` |
| `active` → `blocked` | `handoff_write status=blocked blocked_by=...` | 同上；`blocked_by` 不能为空 |
| `active` → `done` | `handoff_write status=done` | **立即归档**：移动到 `archive/HANDOFF_<slug>_<date>_<id>.md` |
| `active` → `stale` | 自动（distance ≥ 14d） | 仅修改 frontmatter；**不归档**（仍在原位置以警示用户） |
| `stale` → `active` | `handoff_resume` 经用户确认后 | 恢复 status，更新 `updated_at` |
| 任意 → `archive/` | `done` 或用户显式归档 | 物理移动文件，从 active 槽位释放 |

### 3.4 终态语义（重要）

> **`status = done` 是该 handoff 的终态。归档后 active 槽位释放；下次 `handoff_write` 在语义上是「新建 handoff」，必须传 `goal`。**

这条规则看起来显然，但在实际使用中容易踩坑（见 `docs/dogfooding-sprint-retrospective.md` §1 Q2）：

| 错误心智模型 | 正确心智模型 |
|---|---|
| "同会话内 resume 过 → 一直能继续 write" | "active 文件存在 → 才是 update；不存在 → 一律是新建" |
| "done 之后还能再 write 把 status 改回 active" | "done 是终态，归档后想继续工作 = 新建 handoff" |

**实操约束**：
- `status: done` 是**最终写**：所有想记录的内容（completed / next_action / artifacts）必须在 `done` 之**前或同时**写完
- `done` 之后如果用户仍想继续工作，应**显式开启新 handoff**（重传 `goal`），不要期望延续旧文件
- 如果旧 goal 还有用，可以从 `archive/` 下 `read_file` 复制旧 goal 后传入新 write

**实现侧的诊断信息**：
- 当 active 不存在但用户调用 `handoff_write` 不传 `goal` 时，错误码 `GOAL_REQUIRED_ON_FIRST_WRITE` 会附带：
  - 期望 active 路径（确认是否定位到对的文件）
  - 同 slug 的 archive 候选（最近 3 个）
  - 写入语义判定（"视为新建 handoff"）
  - 修复建议（传 goal 即可）

详见 `skills-mcp-server/handlers/handoff-write.js` 的 `buildGoalRequiredDiagnostics`。

---

## 4. 校验规则（`handoff_validate`）

校验分**致命错误**（exit code 1）和**警告**（exit code 0 但报告）两级。

### 4.1 致命错误（必须修复）

| 编号 | 规则 |
|------|------|
| `E001` | frontmatter 解析失败（YAML 语法错误） |
| `E002` | 缺少必填字段（`schema_version` / `status` / `branch` / `goal` / `created_at` / `updated_at` / `project_hash`） |
| `E003` | `status` 不在枚举内 |
| `E004` | `schema_version` 不匹配当前版本 |
| `E005` | `created_at` / `updated_at` 不是合法 ISO8601 含时区 |
| `E006` | `created_at` > `updated_at` |
| `E007` | `status=blocked` 但 `blocked_by` 章节为空 |
| `E008` | 缺少必填 body 章节（completed/in_progress/next_action/do_not/artifacts） |
| `E009` | `next_action` 章节为空（至少 1 项） |
| `E010` | 同一 branch 存在 2 个或以上 `status=active` 文件 |
| `E011` | 文件名 slug 与 `branch` 字段不一致 |
| `E012` | `project_hash` 与当前项目实际 hash 不匹配（可能是 clone 后路径变化，需用户确认） |

### 4.2 警告（不阻塞但提示）

| 编号 | 规则 |
|------|------|
| `W001` | `status=active` 但 `updated_at` 距今 ≥ 14 天 → 应标记 stale |
| `W002` | `status=stale` 但仍在 active 槽位（应在 resume 时处理） |
| `W003` | 章节顺序与规范不一致 |
| `W004` | `goal` 超过 120 字符 |
| `W005` | `artifacts` 包含项目根之外的绝对路径 |
| `W006` | body 章节包含禁用元素（HTML / 图片 / 代码块 / 表格） |
| `W007` | `do_not` 列表为空（建议至少记录 1 条以发挥差异化价值） |
| `W008` | INDEX.md 与实际 active 文件不一致（自动重生成） |

### 4.3 校验调用方式

```bash
# 校验单个文件
node tools/validate-handoff.js .cline/handoffs/HANDOFF_main_active.md

# 校验全部 + 重建 INDEX
node tools/validate-handoff.js --all

# 仅检查 stale
node tools/validate-handoff.js --all --check-stale
```

或通过 MCP 工具：

```
handoff_validate { path?: string, check_stale?: boolean }
```

---

## 5. `handoff_resume` 行为合约

新会话调用 `handoff_resume` 时，按以下顺序执行：

1. **定位文件**：当前 git branch → slug → 找 `.cline/handoffs/HANDOFF_<slug>_active.md`；若 `--local` 则查 `~/.cline-skills/handoffs/<hash>/`
2. **存在性检查**：文件不存在 → 返回 `NO_HANDOFF`，提示用户「无 active handoff，可调用 `handoff_write` 开启」
3. **解析 + 校验**：跑 §4 致命错误检查，任一失败 → 返回 `INVALID_HANDOFF` 附错误码
4. **branch 一致性**：frontmatter `branch` 与 `git rev-parse --abbrev-ref HEAD` 不一致 → 返回 `BRANCH_MISMATCH`，要求用户确认
5. **stale 检测**：若距今 ≥ 14 天，自动改 `status: stale`，返回 `STALE_HANDOFF`，要求用户显式确认是否继续
6. **project_hash 一致性**：不一致 → 返回 `PROJECT_HASH_MISMATCH`（项目可能被搬迁/clone），要求用户确认
7. **全部通过** → 返回结构化恢复包：

```json
{
  "ok": true,
  "branch": "feature/auth-refactor",
  "goal": "...",
  "next_action": ["..."],
  "do_not": ["..."],
  "completed_count": 5,
  "in_progress": ["..."],
  "artifacts": ["..."],
  "stale_days": 3,
  "blocked_by": null
}
```

调用方（Cline）应在响应中**主动复述 `next_action` 和 `do_not`**，让用户确认后再继续。

---

## 6. `handoff_write` 行为合约

```
handoff_write {
  status?: "active" | "blocked" | "done",   // 默认 active
  goal?: string,                             // 首次必填；后续可省（保留旧值）
  completed?: string[],
  in_progress?: string[],
  next_action?: string[],
  do_not?: string[],
  artifacts?: string[],
  blocked_by?: string[],                     // status=blocked 时必填
  local?: boolean                            // 默认 false
}
```

### 6.1 写入流程

1. 读取当前 git branch；不在 git 仓库 → 提示用户「请先 `git init` 或显式 `--local`」
2. 计算 slug、project_hash
3. 若 active 文件已存在：
   - 读取旧 frontmatter，保留 `created_at`
   - 合并字段：传入字段覆盖；未传入字段保留旧值
4. 若不存在：
   - `created_at = now()`
   - 必须传入 `goal`（否则报错）
5. 设 `updated_at = now()`
6. 渲染为 frontmatter + Markdown，**写入前先跑 §4 致命错误检查**
7. 原子写入（先写 `.tmp` 再 rename）
8. 若 `status = done`：立即移动到 `archive/`，加日期 + nanoid
9. 重生成 `INDEX.md`
10. 返回 `{ok: true, path, status}`

### 6.2 错误处理

| 场景 | 行为 |
|------|------|
| 同 branch 已有 active 但传入字段不全 | 合并旧值，**不报错** |
| 不在 git 仓库且未传 `--local` | 报错 `NOT_IN_GIT` |
| `status=blocked` 但 `blocked_by` 缺失 | 报错 `BLOCKED_REQUIRES_REASON` |
| 文件系统权限不足 | 报错 `FS_PERMISSION` |

---

## 7. 与现有系统的集成点

### 7.1 与 memory 系统

- handoff 写入时**不**自动 commit memory（避免污染长期事实库）
- 但建议在 `do_not` 中记录的"项目级不变量"，用户可手动 `memory_commit kind=semantic` 沉淀
- `handoff_resume` 返回的 `do_not` 列表 + `memory_recall` 项目事实 = 完整的"接手前简报"

### 7.2 与 compact_context

- `compact_context` 输出的压缩摘要可作为 `handoff_write completed` 的输入
- 但这是工作流层选择，不在 schema 强制范围

### 7.3 与 finishing-a-development-branch

- 该 Skill 流程结束时建议自动调用 `handoff_write status=done`
- 触发归档，释放 active 槽位

### 7.4 与 git hooks（未来扩展，不在 MVP）

- 可选：`pre-commit` 自动跑 `handoff_validate --all`，发现 stale/E0xx 时阻塞
- MVP 不实现，作为 Phase 3 选项

---

## 8. `.gitignore` 建议

仓库根级 `.gitignore` **不应**屏蔽 `.cline/handoffs/`（除非用户明确选 local-only 模式）。

如果用户混合使用：

```gitignore
# 默认全部入库
# .cline/handoffs/*

# 仅排除 local 模式产物（实际上 local 文件不在项目根，无需此条）
```

INDEX.md 是否入库由用户选择；**推荐入库**（PR diff 可见 active 列表变化）。

---

## 9. 版本演进策略

| 版本 | 时机 | 兼容性 |
|------|------|-------|
| v1.0 | 当前 | 初版 |
| v1.1 | 字段新增（向后兼容） | `handoff_resume` 容忍未知字段；`handoff_validate` 仅警告 |
| v2.0 | 字段重命名 / 删除 / 类型变更 | 提供 `handoff_migrate` 工具；旧文件批量升级 |

**任何 schema 变更必须先改本文 + bump `schema_version`**。下游实现层基于本文同步更新。

---

## 10. 完整示例（end-to-end）

### 10.1 周一首次写入

```bash
# 用户在 feature/auth-refactor 分支工作了 2 小时
# 准备结束会话，写交接
```

调用：

```
handoff_write {
  goal: "Migrate auth middleware to token-based flow",
  completed: ["Extract auth service to src/auth/service.ts"],
  in_progress: ["Token validator (60% done)"],
  next_action: [
    "Finish token validator unit tests",
    "Run npm run test -- auth"
  ],
  do_not: [
    "Do NOT change users table schema",
    "Do NOT remove legacy session support before v2.0"
  ],
  artifacts: [
    "src/auth/service.ts",
    "src/auth/token-validator.ts"
  ]
}
```

生成 `.cline/handoffs/HANDOFF_feature-auth-refactor_active.md`：

```markdown
---
schema_version: "1.0"
status: active
branch: feature/auth-refactor
goal: Migrate auth middleware to token-based flow
created_at: 2026-06-18T17:30:00+08:00
updated_at: 2026-06-18T17:30:00+08:00
project_hash: 6ba9751232ab
---

## completed
- Extract auth service to `src/auth/service.ts`

## in_progress
- Token validator (60% done)

## next_action
- Finish token validator unit tests
- Run `npm run test -- auth`

## do_not
- Do NOT change `users` table schema
- Do NOT remove legacy session support before v2.0

## artifacts
- src/auth/service.ts
- src/auth/token-validator.ts
```

git commit 进入仓库。

### 10.2 下周一恢复

新会话开局：

```
handoff_resume {}
```

返回：

```json
{
  "ok": true,
  "branch": "feature/auth-refactor",
  "goal": "Migrate auth middleware to token-based flow",
  "next_action": [
    "Finish token validator unit tests",
    "Run `npm run test -- auth`"
  ],
  "do_not": [
    "Do NOT change `users` table schema",
    "Do NOT remove legacy session support before v2.0"
  ],
  "completed_count": 1,
  "in_progress": ["Token validator (60% done)"],
  "artifacts": ["src/auth/service.ts", "src/auth/token-validator.ts"],
  "stale_days": 7,
  "blocked_by": null
}
```

Cline 应在第一条响应中复述 `next_action` 和 `do_not`，等用户确认后开干。

### 10.3 任务完成归档

```
handoff_write { status: "done" }
```

效果：
- 文件移动到 `.cline/handoffs/archive/HANDOFF_feature-auth-refactor_2026-06-25_a1b2c3.md`
- INDEX.md 更新（active 槽位移除该 branch）
- git diff 一目了然：active 文件被删，archive 增加一个

---

## 11. 验收检查清单（实现层 P0 完成时跑）

- [ ] §1 命名规则：`HANDOFF_<slug>_active.md` 严格匹配
- [ ] §2 frontmatter 7 个必填字段全部解析
- [ ] §2 body 5 个必填章节顺序正确
- [ ] §3 5 种状态变迁全部测试
- [ ] §4 12 个 E0xx + 8 个 W0xx 全部覆盖单测
- [ ] §5 `handoff_resume` 7 步流程逐项测试
- [ ] §6 `handoff_write` 合并 / 首创 / 归档三条路径
- [ ] §7.3 `done` → archive 自动迁移
- [ ] INDEX.md 自动重建
- [ ] `--local` 模式落 `~/.cline-skills/handoffs/<hash>/`
- [ ] 端到端：写入 → resume → 改字段 → done → 归档

---

## 附录 A：字段速查表

| 字段 | 位置 | 类型 | 必填 | 备注 |
|------|------|------|------|------|
| `schema_version` | frontmatter | string | ✅ | 当前 `"1.0"` |
| `status` | frontmatter | enum | ✅ | `active` / `blocked` / `done` / `stale` |
| `branch` | frontmatter | string | ✅ | git 当前分支名 |
| `goal` | frontmatter | string | ✅ | 一句话目标，建议 ≤ 120 字符 |
| `created_at` | frontmatter | ISO8601 | ✅ | 含时区，仅首次设置 |
| `updated_at` | frontmatter | ISO8601 | ✅ | 含时区，每次写入更新 |
| `project_hash` | frontmatter | string | ✅ | sha256(abs-root)[:12] |
| `## completed` | body | bullets | ✅ | 已完成里程碑（可空） |
| `## in_progress` | body | bullets | ✅ | 进行中事项（可空） |
| `## next_action` | body | bullets | ✅ | **至少 1 项** |
| `## do_not` | body | bullets | ✅ | 锁定不变量 / 已确认无效尝试（建议非空） |
| `## artifacts` | body | bullets | ✅ | 关键文件路径（可空） |
| `## blocked_by` | body | bullets | ⚠️ | `status=blocked` 时必填 |

---

## 附录 B：错误/警告码速查

### 致命错误（E0xx）

| 编号 | 简述 |
|------|------|
| `E001` | YAML frontmatter 解析失败 |
| `E002` | 缺少必填 frontmatter 字段 |
| `E003` | `status` 不在枚举内 |
| `E004` | `schema_version` 不匹配 |
| `E005` | 时间字段非合法 ISO8601 含时区 |
| `E006` | `created_at > updated_at` |
| `E007` | `status=blocked` 但 `blocked_by` 为空 |
| `E008` | 缺少必填 body 章节 |
| `E009` | `next_action` 为空 |
| `E010` | 同 branch 多个 active |
| `E011` | 文件名 slug 与 `branch` 不一致 |
| `E012` | `project_hash` 不匹配 |

### 警告（W0xx）

| 编号 | 简述 |
|------|------|
| `W001` | active 但 ≥ 14 天未更新（应标 stale） |
| `W002` | stale 但仍占 active 槽位 |
| `W003` | body 章节顺序错误 |
| `W004` | `goal` 超 120 字符 |
| `W005` | `artifacts` 含项目外绝对路径 |
| `W006` | body 含禁用元素（HTML/图片/代码块/表格） |
| `W007` | `do_not` 列表为空（差异化建议） |
| `W008` | INDEX.md 与实际不一致 |

---

## 附录 C：恢复包返回结构（`handoff_resume`）

成功：

```json
{
  "ok": true,
  "branch": "string",
  "goal": "string",
  "next_action": ["string"],
  "do_not": ["string"],
  "completed_count": 0,
  "in_progress": ["string"],
  "artifacts": ["string"],
  "stale_days": 0,
  "blocked_by": null
}
```

失败：

```json
{
  "ok": false,
  "code": "NO_HANDOFF | INVALID_HANDOFF | BRANCH_MISMATCH | STALE_HANDOFF | PROJECT_HASH_MISMATCH",
  "details": "string",
  "errors": ["E0xx", "..."]
}
```

---

**本文档定稿于 2026-06-18。下一步：基于本规范实现 `handoff_write` / `handoff_resume` / `handoff_validate`。**
