# Dogfooding Sprint 日志

> **起止**：2026-06-18 → 2026-07-02
> **规则**：见 [dogfooding-sprint.md](2026-06-18-dogfooding-sprint.md)
> **本体系组件**：handoff_write / handoff_resume / memory_commit / memory_recall / compact_context

---

## 2026-06-18

### 会话：Sprint 首日 — 评估 agentic-development-workflow/

**目标**：判断 `agentic-development-workflow/` 是否与 `.clinerules` 规范 5 重叠 → 决定归档或保留

**使用情况记录：**

| 操作 | 组件 | 是否触发 | 观察 |
|---|---|---|---|
| 恢复上次 handoff | handoff_resume | ✅ | handoff 未标志 stale，正确恢复上下文 |
| 记录目标 | handoff_write | ✅ | goal + next_action 更新（多次更新） |
| 沉淀发现 | memory_commit | ✅ | id 19（semantic，归档评估结论） |
| 上下文压缩 | compact_context | — | (未触发) |

**调查过程：**

1. 读取 agentic-development-workflow/README.md → 系统架构（Workflow Advisor + Skills Library）、工作流执行示例（5 步 feature / 4 步 bugfix）
2. 读取 agentic-development-workflow/PLAN.md → MVP 计划（含砍掉的目录说明和面试亮点）
3. 读取 3 个 YAML 工作流定义（feature_development / bug_fix / research）→ 每个含 input_mapping / output_usage / skip_option
4. 读取 .clinerules 规范 5 → 4 种工作流的 skill 链（bugfix / refactor / research / feature）
5. 检查 skills-mcp-server/handlers/ → 确认**无** workflow-advisor.js 实现，YAML 文件无人消费
6. 检查 agentic-development-workflow 目录结构 → demo-project/ 是后端代码试装，非核心内容

**评估结论**：**可归档。** 重叠度 ~60%（规范 5 已覆盖核心逻辑）。非重叠部分（README 求职文案、PLAN.md 开发计划）属于一次性求职产出，Sprint 期间无使用价值。

| 维度 | 判定 |
|---|---|
| 功能重叠度 | ~60% — 规范 5 已覆盖 skill 链定义 |
| 实际使用率 | 0% — YAML 无人解析，workflow_advisor 未实现 |
| 剩余价值 | 求职文案、面试 QA（非 Sprint 目标） |
| 推荐操作 | 归档到 archive/ |
| 宪法三验证 | 现有机制（.clinerules 规范 5）已满足需求 |

**执行结果**：✅ 归档成功 → `archive/agentic-development-workflow/`
**验证结果**：✅ `validate-skills.js` 0 error。skills-mcp-server 无依赖该目录，功能不受影响。

---

### 会话：Sprint 首日（夜） — 落实外部评审 §6 的 6 项必做修复

**目标**：把 `docs/reviews/2026-06-18-external-review.md` §6 Sprint 期内 6 项必做全部落实

**使用情况记录：**

| 操作 | 组件 | 是否触发 | 观察 |
|---|---|---|---|
| 开局恢复 | handoff_resume | ✅ | 流畅返回 next_action / do_not，且自动复述阻止漂移 |
| 中途记录 | handoff_write | ⚠️ | **首次调用未传 goal 直接报 GOAL_REQUIRED_ON_FIRST_WRITE**——见下方 Bug 观察 |
| 沉淀决策 | memory_commit | — | （未触发；本次任务全部转化成了 handoff 而非 memory） |
| 上下文压缩 | compact_context | — | （未触发；任务规模可控） |

**完成项**（按 §6 顺序）：

1. ✅ 文档措辞「零 native 依赖」→「零额外原生编译依赖 / 零 node-gyp」共 8 处
   - LEARNINGS.md / interview-answers.md / phase-2 plan / review-prompt-for-opus.md (×2) / product-positioning.md (×3)
2. ✅ `escapeFts` 重写：按 token 拆 + 逐 token `"` → `""` 转义；保留高级用户透传分支（OR/AND/NOT/NEAR/`*`）
3. ✅ `lib/db.js` 加 `PRAGMA busy_timeout = 5000`（注释引用评审 §4.1）
4. ✅ handoff `atomicWriteFile` 复核——`.tmp + rename` 已实现，无需改动
5. ✅ `index.js` 加 Node 版本预检（≥22.5）+ handler 加载失败硬退出（含 `SKILLS_MCP_LENIENT_LOAD=1` 降级口）+ 工具名重复检测
6. ✅ `package.json` engines 已设 `>=22.5.0`，无需改动

**新增 / 验证**：
- 新增 `skills-mcp-server/test-escape-fts.js`（23 用例覆盖：空/单 token/多 token/双引号/操作符透传/控制字符/中英混合）
- 全量回归：`test-escape-fts.js` 23/23、`test-memory.js` 13/13、`test-handoff-lib.js` 58/58、`test-handoff-handlers.js` 15/15
- `tools/validate-skills.js`：0 ERROR（4 个历史 WARN 不影响）

**🐛 Bug 观察（dogfooding 真实价值信号）**：

调用 `handoff_write` 不传 `goal` 字段时，server 报 `GOAL_REQUIRED_ON_FIRST_WRITE`——但本 branch 当前**已有 active handoff**（同会话内 `handoff_resume` 刚刚成功读到）。

按 schema 设计，`goal` 应该只在「首次创建」时必填，存量 handoff 的 `handoff_write` 应能合并旧 frontmatter 自动保留 goal。

**两种可能性**：
- 假设 A：handler 的「合并旧值」探测路径有 bug——被误判为首次创建
- 假设 B：schema 设计本身的边界不清——只要本调用没传 goal，就一律按首次处理

**绕过方式**：每次显式传 goal，但这违背了 schema §6 的"部分字段更新"承诺。

**Sprint 价值**：这是第一条**靠真实使用而非测试覆盖暴露的**问题——`test-handoff-handlers.js` 中"更新 - 部分字段合并保留旧值"用例传入了完整 goal，没踩这条路径。

**处理决策**：列入 Sprint 后 P1 调查清单，不在本次冻结期内修复（遵守 sprint 规则 §2 / §5：bugfix 允许，但要先记录 + 评估再动手）。
