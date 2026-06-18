# Plan · Phase 2: Handoff Protocol Implementation

> 创建日期：2026-06-18  
> 状态：📋 已就绪，待 ACT 模式执行  
> 上游锚点：[`docs/product-positioning.md`](../../product-positioning.md) §7、[`docs/handoff-schema.md`](../../handoff-schema.md) v1.0  
> 替代关系：本 plan 是 Phase 1.5 MVP 的**功能延伸**，不替换 Phase 1.5（memory + compact 已落地，Phase 2 在其上叠加 handoff）

---

## 0. 目标与边界

### 解决的问题（来自定位文档 §2）

> 间歇式开发的连续性丢失 —— 跨会话失忆、重启踩同一个坑、token 爆炸断档。

### 本 Phase 交付什么

新增 **handoff 工作状态层** 的完整实现，让 Cline 在新会话能 **30 秒无损接手** 上次工作：

```
昨天会话末：handoff_write { goal, completed, next_action, do_not, ... }
今天新会话开局：handoff_resume { } → 自动校验 + 复述 next_action / do_not
```

### 退出条件（验收标准，来自 schema §11）

- [ ] §1 文件命名：`HANDOFF_<slug>_active.md` 严格匹配；slug 转换正确
- [ ] §2 frontmatter 7 必填字段全部解析、缺一报 `E002`
- [ ] §2 body 6 章节顺序固定（completed → in_progress → next_action → do_not → artifacts → blocked_by）
- [ ] §3 5 种状态变迁全部测试通过（`(首次)→active`、`active→active`、`active→blocked`、`active→done(归档)`、`active→stale(自动)`、`stale→active`）
- [ ] §4 12 个 E0xx + 8 个 W0xx 校验全部覆盖单测
- [ ] §5 `handoff_resume` 7 步流程逐项测试（NO_HANDOFF / INVALID / BRANCH_MISMATCH / STALE / PROJECT_HASH_MISMATCH / OK）
- [ ] §6 `handoff_write` 三条路径（首创 / 合并 / done 归档）
- [ ] INDEX.md 自动重建
- [ ] `--local` 模式落 `~/.cline-skills/handoffs/<hash>/`
- [ ] 端到端真实使用：本仓库自己用一次 `handoff_write` → 切新会话 `handoff_resume` 成功

### 不做的事（YAGNI，来自定位文档 §3）

- ❌ 不做多 agent 协同 / 跨工具同步
- ❌ 不做向量检索（FTS5 + 文件名 + frontmatter 索引足矣）
- ❌ 不做 git hook 自动校验（Phase 3 选项）
- ❌ 不做自动从对话生成 handoff（Cline 自己根据 SKILL.md 触发）
- ❌ 不引入新 native 依赖（保持 Node 22.5+ `node:sqlite` + 纯 JS）

---

## 1. 架构总览

```
┌──────────────────────────────────────────────────────────┐
│  Cline (LLM)                                             │
│  ├─ 加载 SKILL.md: handoff-protocol（本 Phase 新增）      │
│  └─ 调用 use_mcp_tool:                                   │
│     ├─ handoff_write   ← 新增 P0                         │
│     ├─ handoff_resume  ← 新增 P0                         │
│     ├─ handoff_validate ← 新增 P1                        │
│     └─ handoff_list    ← 新增 P2                         │
└────────────┬─────────────────────────────────────────────┘
             │ MCP (stdio)
┌────────────▼─────────────────────────────────────────────┐
│  skills-mcp-server (drop-in handler 架构)                │
│  └─ handlers/                                            │
│     ├─ handoff-write.js     ← 新增                       │
│     ├─ handoff-resume.js    ← 新增                       │
│     ├─ handoff-validate.js  ← 新增 (P1)                  │
│     └─ handoff-list.js      ← 新增 (P2)                  │
│                                                          │
│  └─ lib/                                                 │
│     ├─ db.js (复用)                                      │
│     ├─ handoff-fs.js     ← 新增（文件系统 + 路径解析）    │
│     ├─ handoff-schema.js ← 新增（YAML 解析 + 校验）       │
│     └─ git.js            ← 新增（branch / hash 探测）     │
└────────────┬─────────────────────────────────────────────┘
             │ fs + git
┌────────────▼─────────────────────────────────────────────┐
│  默认：<project>/.cline/handoffs/                         │
│  ├─ HANDOFF_<slug>_active.md (typed YAML)                │
│  ├─ INDEX.md (auto)                                      │
│  └─ archive/                                             │
│                                                          │
│  --local：~/.cline-skills/handoffs/<hash>/               │
└──────────────────────────────────────────────────────────┘
```

### 关键设计决策

| 决策 | 选择 | 理由（证据等级） |
|------|------|----------|
| YAML 解析库 | `yaml` (npm，纯 JS) | [文档] 零额外原生编译依赖，与本仓宪法对齐；[实测]待验证安装大小 |
| nanoid | `nanoid/non-secure` | [文档] 6 字符短 ID 避免引入 crypto 重依赖；归档 ID 不需要安全性 |
| git 探测 | `child_process.execSync('git rev-parse ...')` | [实测]本仓 windows + cmd.exe 已验证；不引入 simple-git 等包 |
| 时间戳格式 | ISO8601 含时区，`new Date().toISOString()` 返回 UTC，**手动加本地偏移** | [文档] 用户偏好显示本地时区（详见 §3.2 实现细节） |
| 原子写入 | 写 `.tmp` → `fs.renameSync` | [社区] Node 跨平台兼容做法 |
| project_hash 算法 | `sha256(absolute-project-root)[:12]` | [源码] 与 `lib/db.js` `getDb()` 复用，**不重复实现** |

---

## 2. 实施顺序（依赖驱动）

执行顺序按依赖图：先底层 lib → 再 handler → 再 Skill → 最后测试 + 文档。

### Phase 2A · 基础库（约 2 小时）

#### Step 1: `skills-mcp-server/lib/git.js` ✏️ 新增
导出函数：
- `getCurrentBranch(): string` — `git rev-parse --abbrev-ref HEAD`，失败返回 `null`
- `isInGitRepo(): boolean` — 检测 `.git` 目录是否存在
- `getProjectRoot(): string` — `git rev-parse --show-toplevel`，失败 fallback 到 `process.env.CLINE_PROJECT_ROOT || process.cwd()`

#### Step 2: `skills-mcp-server/lib/handoff-fs.js` ✏️ 新增
导出函数：
- `slugify(branch): string` — 实现 schema §1.3
- `getHandoffDir(opts): { dir, isLocal }` — 返回默认 `.cline/handoffs/` 或 `--local` 路径
- `getActivePath(branch, opts): string` — 完整路径
- `listActiveFiles(opts): string[]` — 扫描所有 active
- `archivePath(branch, opts): string` — 归档目标路径（含 date + nanoid）
- `atomicWriteFile(path, content): void` — `.tmp` → `rename`
- `ensureDir(path): void`

#### Step 3: `skills-mcp-server/lib/handoff-schema.js` ✏️ 新增
导出：
- `SCHEMA_VERSION = "1.0"`
- `STATUSES = ["active", "blocked", "done", "stale"]`
- `STALE_DAYS_DEFAULT = 14`
- `parseHandoff(content): { frontmatter, body, raw }` — YAML + Markdown body 章节切分
- `serializeHandoff({ frontmatter, sections }): string` — 反向渲染
- `validate(handoff, opts): { errors: ['E001',...], warnings: ['W001',...] }`
- `isStale(updated_at, threshold_days): boolean`
- `formatLocalTimezoneISO(date): string` — 输出 `2026-06-18T15:30:00+08:00`（不是 UTC `Z`）

测试覆盖：12 E + 8 W 全部走过

#### Step 4: 单元测试 `skills-mcp-server/test-handoff-lib.js` ✏️ 新增
针对 §1-3 的库函数。要求：
- slugify 边界（`feature/AUTH_v2` → `feature-auth-v2`）
- parseHandoff 处理各种边缘（缺 frontmatter / 章节顺序乱 / 空章节）
- validate 12 个 E0xx + 8 个 W0xx 各至少 1 个用例
- atomicWriteFile 原子性 happy path
- isStale 14 天阈值边界

---

### Phase 2B · P0 Handlers（约 3 小时）

#### Step 5: `skills-mcp-server/handlers/handoff-write.js` ✏️ 新增

按 schema §6 实现：
- toolDefinition 参数 schema 完全对齐 schema §6
- handler 流程 10 步（读 git → 计算 hash → 合并旧值 → 时间戳 → 校验 → 原子写入 → done 自动归档 → 重建 INDEX）
- 错误返回：`NOT_IN_GIT` / `BLOCKED_REQUIRES_REASON` / `FS_PERMISSION` / `INVALID_HANDOFF`
- 成功返回 markdown，包含 path + status + 简短 frontmatter 预览

#### Step 6: `skills-mcp-server/handlers/handoff-resume.js` ✏️ 新增

按 schema §5 实现 7 步流程：
1. 定位 → 2. 存在性 → 3. 解析校验 → 4. branch 一致 → 5. stale 检测 → 6. project_hash 一致 → 7. 返回结构化恢复包

返回字段严格按 schema 附录 C。失败时附 `code` + `errors[]`。

特别注意：
- **stale 自动改 status 但不归档**（只回写 frontmatter，updated_at 保持原值，让用户看见过期天数）
- **branch mismatch 不阻塞**：返回错误码让 Cline 询问用户，不直接改 frontmatter

#### Step 7: 内部 helper `lib/index-md.js` ✏️ 新增
- `regenerateIndex(opts): void` — 扫描 active + 最近 5 个 archive，重写 `INDEX.md`
- 由 write/resume/validate 自动调用

#### Step 8: 集成测试 `skills-mcp-server/test-handoff-handlers.js` ✏️ 新增
- 端到端：write 首创 → resume → write 更新 → write done → 文件归档 + INDEX 重建
- 7 个失败路径 happy/error 全覆盖
- branch mismatch / stale / hash mismatch 三个真实场景模拟

---

### Phase 2C · P1/P2 Handlers + Skill（约 2 小时）

#### Step 9: `skills-mcp-server/handlers/handoff-validate.js` ✏️ 新增 (P1)
- 参数：`{ path?, all?, check_stale? }`
- `path` 给定 → 校验单文件
- `all=true` → 扫所有 active + archive，重建 INDEX
- 输出 markdown 报告：✅ N 个文件通过 / ❌ M 个 E0xx 错误 / ⚠️ K 个 W0xx 警告

#### Step 10: `skills-mcp-server/handlers/handoff-list.js` ✏️ 新增 (P2)
- 参数：`{ status_filter?, include_archive? }`
- 输出 markdown 表格

#### Step 11: `skills/handoff-protocol/SKILL.md` ✏️ 新增
按 `docs/skill-spec.md` 全部 12 字段 + 4 必备章节。要点：
- **何时调用 `handoff_write`**：长任务结束、token 接近上限、跨日切换
- **何时调用 `handoff_resume`**：每个新会话**开局第二件事**（第一件是 `memory_recall`）
- **如何与 memory 配合**：do_not 列表中的"项目级不变量"用户可手动 commit 到 memory
- **示例**：完整 happy path + branch mismatch / stale 处理

附 `examples/basic-usage.md` + `SKILL.test.md`。

---

### Phase 2D · 集成与验收（约 1 小时）

#### Step 12: 更新 `skills-mcp-server/package.json`
- 加 `yaml` (^2.x) 和 `nanoid` (^5.x，仅 non-secure 子模块)
- 验证 install 后 `node skills-mcp-server/test-handoff-handlers.js` 全绿

#### Step 13: 更新 `tools/validate-skills.js` 兼容性
- 检测新 SKILL `skills/handoff-protocol/SKILL.md` 通过 12 字段 + 4 章节
- 跑 `node tools/validate-skills.js` 期望零 ERROR

#### Step 14: 真实使用验证（自举）
- 在本仓库 `feat/handoff-protocol` 分支上，**自己用 handoff_write** 写一份 active handoff
- 关闭会话，新开一个 Cline task，调用 `handoff_resume` 验证恢复
- 截图 / 日志保存为 `docs/examples/handoff-bootstrap.md`

#### Step 15: 文档收尾
- 更新 `README.md` 首屏（按定位文档 §8 的英文主标题 + 中文 tagline）
- 在 `LEARNINGS.md` 追加复盘条目（schema 设计的关键取舍 / 实现踩坑）
- 归档旧 plan：在 `docs/superpowers/plans/2026-06-18-context-and-memory-mvp.md` 顶部加 superseded 提示

#### Step 16: 用户验证检查点（高风险确认）
按宪法规范 6（git 推送原则）：
- 跑 `node tools/validate-skills.js` 零 ERROR
- 跑 `node skills-mcp-server/test-handoff-handlers.js` 全绿
- 跑 `node skills-mcp-server/test-memory.js`（不破坏现有）
- 切 `feat/handoff-protocol` branch
- 向用户演示 §14 自举结果
- 用户确认 → Conventional Commits（`feat(handoff): typed state protocol v1.0`）→ 请求授权 push

---

## 3. 实现细节备注

### 3.1 yaml 库选择

候选：
- `yaml`（@types/yaml，纯 JS，~100KB unpacked）✅ 推荐
- `js-yaml`（更老，~200KB）
- 手写 frontmatter parser（risk：边缘 case 多）

选 `yaml`：API 干净（`YAML.parse` / `YAML.stringify`）、保持 key 顺序、零额外原生编译依赖（纯 JS）。

### 3.2 时区处理（避坑）

`new Date().toISOString()` 返回 UTC `Z` 后缀。schema 要求**含时区偏移**（如 `+08:00`）以保留用户本地时间语义。

实现：

```js
function formatLocalTimezoneISO(date = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  const tz = -date.getTimezoneOffset(); // 分钟
  const sign = tz >= 0 ? "+" : "-";
  const tzH = pad(Math.floor(Math.abs(tz) / 60));
  const tzM = pad(Math.abs(tz) % 60);
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${tzH}:${tzM}`;
}
```

测试：东八区 → `+08:00`；UTC → `+00:00`；负偏移 `-05:00`。

### 3.3 git 命令的失败处理

`git rev-parse --abbrev-ref HEAD` 在以下场景失败：
- 不在 git 仓库（exit 128）
- 仓库刚初始化无 commit（返回 `HEAD`，应当作 detached）
- 本身是 detached HEAD（返回 `HEAD`）

实现层处理：
- 不在 git 仓库 → `handoff_write` 报 `NOT_IN_GIT`，要求 `--local`
- detached HEAD → 用 `git rev-parse --short HEAD` commit hash 作为 slug 替代

### 3.4 cline_project_root 优先级

按本仓既有约定（参考 memory 库，见记忆 #4 / #5）：

```
project_root = 
  process.env.CLINE_PROJECT_ROOT 
  ?? git rev-parse --show-toplevel 
  ?? process.cwd()
```

`project_hash = sha256(project_root)[:12]`

### 3.5 INDEX.md 重建策略

每次 `handoff_write` / `handoff_resume`（status 变化时）/ `handoff_validate --all` 重建。

**不要**在 `handoff_resume` 仅返回成功时也重写（否则每次 resume 都会污染 git status）。仅当 stale 检测触发改 status 时才回写。

### 3.6 nanoid 引入

仅在归档时用一次：

```js
import { customAlphabet } from "nanoid/non-secure";
const archiveId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);
```

Lowercase + digit，6 字符 = 36^6 ≈ 22 亿空间，单 branch 单日归档冲突概率 < 10^-6。

---

## 4. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `yaml` 包对 `2026-06-18T17:30:00+08:00` 字符串处理为 Date 对象，导致序列化丢精度 | 中 | 中 | 用 `YAML.parse` 时传 option `customTags`，时间字段强制保留为字符串；测试覆盖 |
| Windows 路径 `\` vs `/` 在 slug / 文件查找时混用 | 中 | 低 | 统一用 `path.posix` 处理 slug 与 schema 内字符串；fs 操作用 `path.join` 自动适配 |
| 大文件（artifacts 路径列表过长）导致校验 W005 误报 | 低 | 低 | W005 仅警告不阻塞；用户决定 |
| `git rev-parse` 在 worktree 中行为与主仓不同 | 低 | 中 | 文档明确说明 worktree 场景未在 MVP 测试；issue 跟踪 |
| 同 branch 多个 active（用户手动复制文件）触发 E010 | 中 | 中 | E010 致命错误强制用户解决；提供清理建议 |
| 用户跨电脑 / clone 后 `project_hash` 变化导致 PROJECT_HASH_MISMATCH | 高 | 低 | resume 给出明确提示 + 一键 `--accept-new-hash` 选项（Phase 3 加） |
| stale handoff 用户长期不处理累积 | 中 | 低 | INDEX.md 自动 surface；后续可加自动归档命令 |

---

## 5. 测试矩阵

### 5.1 单元测试（`test-handoff-lib.js`）

| 模块 | 用例数 |
|------|--------|
| `slugify` | 5（普通 / 含 `_` / 含 `/` / 大写 / 仅数字） |
| `parseHandoff` | 6（happy / 缺 frontmatter / 章节缺失 / 章节乱序 / 空章节 / 含禁用元素） |
| `serializeHandoff` | 3（往返一致 / 章节顺序 / 时间字段保留字符串） |
| `validate` 致命 | 12（每个 E0xx 1 个） |
| `validate` 警告 | 8（每个 W0xx 1 个） |
| `isStale` | 4（13d / 14d / 15d / 0d） |
| `formatLocalTimezoneISO` | 3（东八区 / UTC / 负偏移） |
| `atomicWriteFile` | 2（happy / .tmp 残留清理） |

预期：≥ 43 个 case 全部 pass。

### 5.2 集成测试（`test-handoff-handlers.js`）

| 场景 | 步骤 |
|------|------|
| 完整生命周期 | write 首创 → resume → write 更新 → write done → 校验归档 + INDEX |
| 错误路径 | not_in_git / blocked_no_reason / branch_mismatch / project_hash_mismatch |
| stale 自动检测 | mock updated_at = 15 天前，resume 应返回 STALE_HANDOFF 并改 frontmatter |
| `--local` 模式 | 落 ~/.cline-skills/ 不污染 .cline/ |
| INDEX 重建 | 手动删除 INDEX → resume 自动重建 |

### 5.3 端到端（自举）
本仓 `feat/handoff-protocol` 分支上真实跑一遍。

---

## 6. 时间预算

| Phase | 任务 | 预估 |
|-------|------|------|
| 2A | 基础库（git/fs/schema） | 2 h |
| 2A | 单元测试 | 1 h |
| 2B | handoff_write | 1 h |
| 2B | handoff_resume | 1 h |
| 2B | INDEX 工具 + 集成测试 | 1 h |
| 2C | handoff_validate (P1) | 30 min |
| 2C | handoff_list (P2) | 20 min |
| 2C | SKILL.md + examples + test | 1 h |
| 2D | package.json / validate-skills 调整 | 20 min |
| 2D | 自举验证 + README 更新 | 40 min |
| 2D | 用户审核 + commit + push | 30 min |

**合计：~9 h**（按宪法规范，单次 ACT 会话不必跑完，可分批 + 用 handoff 自己接力 🌀）

---

## 7. 与宪法的对齐

| 条款 | 满足方式 |
|------|---------|
| 证据 > 推测 | §1 决策表逐条标 [文档]/[实测]/[源码]/[社区]；§3.x 实现细节备注引用现有代码（db.js / memory 库） |
| 问题 > 方案 | §0 引用定位文档明确"间歇式开发的连续性丢失"；handoff schema 作为方案在前置规范中已论证 |
| 复杂度必须被证明 | §0 列出 5 项 YAGNI；§1 lib 仅 3 个新文件；handler 拆分对齐既有 drop-in 架构，不改 index.js |
| 规范 1 工具调用观察周期 | Step 14 自举验证、Step 16 用户审核都设为高风险确认点 |
| 规范 4 Skill 加载 | Step 11 严格按 docs/skill-spec.md 12 字段 + 4 章节 |
| 规范 6 Git 推送原则 | Step 16 切 `feat/handoff-protocol` 分支；Conventional Commits；零 ERROR 通过 validate-skills 后再请求授权 |
| 规范 7 终端兼容性 | 测试脚本用 `;` 串联（Cline 走 PowerShell 5.1）；`.ps1` 不在交付物中 |

---

## 8. 后续路线（不在本 Phase 范围）

| 版本 | 增量 |
|------|------|
| Phase 3 | git pre-commit hook 自动 `handoff_validate`；`--accept-new-hash` 选项；自动归档 stale > N 天 |
| Phase 3 | `handoff_resume --interactive`：列出多个候选时让用户选 |
| Phase 4 | finishing-a-development-branch Skill 自动调 `handoff_write status=done` |
| Phase 4 | LEARNINGS.md / git log 自动建议 do_not 条目 |
| v2.0 | `handoff_migrate` 工具支持 schema_version 升级 |

---

## 9. 一句话总结

> 实现 typed YAML handoff 协议，让任意会话能用 1 条命令恢复上次工作；与现有 memory 互补但概念独立；零新增 native 依赖；端到端 ~9 h，分批 + 自举验证。

---

## 附录 A：文件清单（执行时 checklist）

### 新增

- [ ] `skills-mcp-server/lib/git.js`
- [ ] `skills-mcp-server/lib/handoff-fs.js`
- [ ] `skills-mcp-server/lib/handoff-schema.js`
- [ ] `skills-mcp-server/lib/index-md.js`
- [ ] `skills-mcp-server/handlers/handoff-write.js`
- [ ] `skills-mcp-server/handlers/handoff-resume.js`
- [ ] `skills-mcp-server/handlers/handoff-validate.js` (P1)
- [ ] `skills-mcp-server/handlers/handoff-list.js` (P2)
- [ ] `skills-mcp-server/test-handoff-lib.js`
- [ ] `skills-mcp-server/test-handoff-handlers.js`
- [ ] `skills/handoff-protocol/SKILL.md`
- [ ] `skills/handoff-protocol/examples/basic-usage.md`
- [ ] `skills/handoff-protocol/SKILL.test.md`
- [ ] `docs/examples/handoff-bootstrap.md`（自举证据）

### 修改

- [ ] `skills-mcp-server/package.json`（加 yaml + nanoid 依赖）
- [ ] `tools/validate-skills.js`（如需要新增 SKILL 类型支持）
- [ ] `README.md`（首屏切换为 Project Continuity 叙事）
- [ ] `LEARNINGS.md`（追加复盘条目）
- [ ] `docs/superpowers/plans/2026-06-18-context-and-memory-mvp.md`（顶部加 superseded 提示）

### 不动

- ✅ `skills-mcp-server/index.js`（drop-in 架构自动加载新 handler）
- ✅ `skills-mcp-server/lib/db.js`（memory 库不变）
- ✅ 现有 4 个 memory/compact handler

---

## 附录 B：执行入口（ACT 模式开干指令）

新会话开局按此顺序：

1. `memory_recall { limit: 20 }` 拉取记忆 #7/#8/#9 作为基线
2. `read_file docs/product-positioning.md` 确认方向
3. `read_file docs/handoff-schema.md` 锁定 schema
4. `read_file docs/superpowers/plans/2026-06-18-handoff-protocol-phase-2.md`（即本文）
5. 按 §2 顺序逐 Step 执行
6. 完成 §2D Step 16 后向用户请求授权 push

---

**本 plan 定稿于 2026-06-18。下一步：用户授权后切 `feat/handoff-protocol` 分支开始 Phase 2A 实现。**
