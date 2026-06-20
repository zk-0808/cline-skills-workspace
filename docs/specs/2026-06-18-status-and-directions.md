# 2026-06-18 状态梳理与方向决策

> 目的：收口 2026-06-17~18 几次发散讨论产生的零散观察，给"近期下一步做什么"一个明确的优先级排序。
> 上层锚点：[`docs/product-positioning.md`](../product-positioning.md) §1（一句话定位）+ §3（不做列表）+ §7（MVP 范围）
> 不替代 product-positioning，仅做近期落地决策。

---

## 🚦 项目阶段：Build → **Validate**（2026-06-18 转换）

> **P0 已冻结。下一阶段唯一目标是真实使用验证，不是新功能。**

### 转换证据

| 维度 | 6/17 | 6/18（现在） |
|---|---|---|
| 定位 | 清晰 | 清晰 |
| 架构 | 清晰 | 清晰 |
| 实现 | 多但核心链路未闭环 | **核心链路已闭环** |
| 真实使用 | 无 | **完成一次 dogfooding（write→resume→update→done→archive）** |
| 性质 | 一套 Agent 工程体系 | 拥有"用户状态生命周期"的连续性产品 |

### 反模式警告

完成 P0 后最常见的错误：「P0 完成 → 发现新想法 → 再加一个 P0 → 永远没有完成」。

近期已出现的"挤进核心"倾向：ChatGPT 第二意见 / Browser Automation / 新 Skill / 新 Workflow。**全部押后**——见 [`dogfooding-sprint.md`](../logs/2026-06-18-dogfooding-sprint.md) 验证完成前不再扩 P0。

### 三个待验证问题（非代码问题）

1. **handoff 会不会被持续使用**？两周后还会主动用，还是只用了一次？
2. **handoff 字段对不对**？是否缺字段、字段冗余、用户懒得填？
3. **memory 和 handoff 是否重叠**？真实使用中边界是否清晰？

详见 [`docs/logs/2026-06-18-dogfooding-sprint.md`](../logs/2026-06-18-dogfooding-sprint.md)。

---

---

## 1. 当前实现状态盘点

### 1.1 已落地（可用）

| 模块 | 状态 | 备注 |
|---|---|---|
| `.clinerules` Agent Constitution v1.0 | ✅ 冻结 | 3 宪法 + 8 规范（本次新增规范 8） |
| `LEARNINGS.md` | ✅ 持续更新 | 11 条经验，最新一条「证据没有时间戳」|
| `.claude/skills/` 全局 skills | ✅ | 12 个 |
| `skills/` 项目本地 skills | ✅ | 17 个（部分与全局重叠） |
| `skills-mcp-server` | ✅ | memory_commit/recall/list/compact_context 4 个工具 |
| `node:sqlite` 持久化层 | ✅ | FTS5 + bm25 + 中文 unicode61 |
| `agentic-development-workflow/` 工作流定义 | ✅ | bugfix/feature/research/refactor 4 类 |

### 1.2 设计完成但未实现

| 模块 | 状态 | 阻塞点 |
|---|---|---|
| ~~`handoff_write` MCP 工具~~ | ✅ 已落地（`handlers/handoff-write.js`） | 2026-06-18，15/15 端到端测试通过 |
| ~~`handoff_resume` MCP 工具~~ | ✅ 已落地（`handlers/handoff-resume.js`） | 同上 |
| `handoff_validate` / `handoff_list` | ⏸ | P1/P2，独立扩展 |
| ~~`skills/handoff-protocol/`~~ | ✅ 已创建（SKILL.md + examples + SKILL.test.md） | 2026-06-18，validator 0 error / 0 warning |

### 1.3 空壳或冗余

| 模块 | 状态 | 处置建议 |
|---|---|---|
| `agentic-development-workflow/PLAN.md` | 🟡 早期产物 | 与 .clinerules 规范 5 重叠，待评估归档 |
| `skills/search-orchestrator/` | 🟡 326 行精密文档 | 已加规范 8 调用机制，保留 |
| ~~`skills/dispatching-parallel-agents` / `subagent-driven-development`~~ | ✅ 已归档 → `archive/skills/` | 2026-06-18 |
| ~~`skills/pptx/`~~ | ✅ 已归档 → `archive/skills/` | 2026-06-18 |

---

## 2. 本次对话（2026-06-18）的关键发现

### 2.1 上下文成本拆解 [实测]

一次空白 hello 消耗 ~40k token，归因如下（new conversation 起点）：

| 来源 | token | 可控 |
|---|---|---|
| Cline 内置 system prompt | ~10k | ❌ |
| MCP 工具定义（playwright 单独 ~15k） | ~17k → 已禁 playwright | ✅ |
| Skills description 列表（17 个） | ~2k | 🟡 |
| .clinerules | ~3k | 🟡 |
| environment_details（cwd 文件树 + open tabs） | ~2-3k/轮 | 🟡 |

**已采取行动**：禁用 playwright MCP server（用户手动），下次新会话省 ~15k。

### 2.2 真正的累积消耗：Agent 自身回复

**[实测]** 本次对话 8 轮，Agent 长篇 Markdown 回复贡献了约一半的累积上下文。

**已落地**：写入 procedural memory（id 17）：默认短回复，调试型对话优先「结论 + 下一步」两行结构。

### 2.3 search-orchestrator 触发悖论

**问题**：326 行精密设计的搜索流程 skill，实际触发率接近零。原因是 Cline 没有 hook 机制，skill 只能被 Agent 主动看到，且触发判定本身需要轻量判定。

**已落地**：`.clinerules` 规范 8——默认单轮搜索，结论后主动询问用户是否需要深度调研。把判定权交给用户而非 Agent。

### 2.4 元教训：证据没有时间戳

**[已写入 LEARNINGS.md]** 调查过程中，环境状态可能被外部（用户、并发 agent、CI）改变。Agent 看到反证时不应立即翻转结论，要先问"原结论基于哪个时刻的证据？新证据是哪个时刻读到的？"

候选规则（未硬性入宪法，观察 1-2 次类似场景再决定）。

---

## 3. 近期被提出但未决策的新方向

### 3.1 浏览器自动化获取 ChatGPT 第二意见

**用户表述**：「我还想做浏览器自动化操作实现 ChatGPT 的第二意见自动获取」

#### 与 product-positioning 的对齐检查

| 检查项 | 结果 |
|---|---|
| 是否在 §3 不做列表？ | ❌ 不在（§3 禁的是 multi-agent 协同/向量库/Web UI/团队） |
| 是否服务 §1 一句话定位（Project Continuity）？ | ⚠️ 间接——「第二意见」可作为 handoff `do_not` 来源，但不直接 |
| 是否服务 §4 第一层用户（重度 AI Coding）？ | ✅ 是——重度用户已在手动来回粘贴 |
| 复杂度是否被证明（宪法三）？ | ❌ **未证明** |

#### 宪法三审视：现有机制为什么不行？

**当前替代方案**：
- **A. 用户手动**：Ctrl+C / Ctrl+V 到 ChatGPT 网页，粘回结论。成本 = 30 秒/次
- **B. OpenAI API 直接调**：注册 key，写一个 MCP tool（30 行代码），不用浏览器
- **C. duckduckgo MCP + AI 总结**：已有，但拿不到 ChatGPT 的"第二意见"，是公开搜索

**B 方案对比浏览器自动化**：
| 维度 | 浏览器自动化 | OpenAI API |
|---|---|---|
| 实现复杂度 | 高（playwright + 登录态 + 反爬 + DOM 变化适配） | 低（HTTP POST） |
| 稳定性 | 中（OpenAI 改 UI 就坏） | 高（API 稳定） |
| 上下文成本 | 高（playwright MCP 占 15k） | 低 |
| 是否绕过付费 | 是（用网页订阅） | 否（按 token 付费） |
| 法律/ToS 风险 | 中（网页爬可能违 ToS） | 无 |

**[未验证]** 假设核心动机是"白嫖 ChatGPT Plus 订阅，不另付 API token 费"——如果是，浏览器自动化合理；如果不是，API 方案完胜。

#### 建议

**先回答以下问题，再决定是否做：**

1. 你的核心动机是什么？（省钱/稳定性/避免付费/其他）
2. 这个能力服务谁？（自己日常用？做成产品给用户用？）
3. 与 product-positioning §1（Project Continuity）什么关系？是 handoff 的输入源（自动收集决策依据）？还是独立功能？

**如果是独立功能、与 Project Continuity 无关 → 建议放到独立项目，不混入 cline-skills-workspace。**

**如果是 handoff 的输入源 → 用最简方案（OpenAI API 一个 MCP tool）即可，不要浏览器自动化。**

#### 决策（2026-06-18 用户确认）

| 问题 | 用户回答 |
|---|---|
| 1. 核心动机 | 低成本独立意见评审者，防走歪；网页版 GPT 已够，自动化只为省事 |
| 2. 服务谁 | 自己用，用户端无法复用（需录操作） |
| 3. 与 Project Continuity 关系 | 不确定 |

**结论：暂缓。** 不是硬性需求，等找到更通用、更方便的方案（如 OpenAI API 直调、或社区出现成熟的"第二意见"协议）再做。

**触发重启条件**：
- 出现稳定的"第二意见 MCP"开源方案 → 评估接入
- 真实使用中频繁手动复制 ChatGPT 反馈 → 重新评估自动化价值
- 该能力变成多用户共享需求（不再是"自己用"）→ 重新过 §3 检查

---

## 4. 优先级建议

按 product-positioning §7 锚点 + 本文 §1 状态，排序：

### 🔴 P0：完成 Project Continuity MVP（应当做）

**当前最大的项目级缺口**——`handoff_write` / `handoff_resume` MCP 工具未注册。lib 代码已写，距离可用只差：

1. `skills-mcp-server/handlers/handoff-write.js` —— 写 handler
2. `skills-mcp-server/handlers/handoff-resume.js` —— 写 handler
3. 在 `skills-mcp-server/index.js` 注册两个 tool
4. 写 `skills/handoff-protocol/SKILL.md` 教 Cline 何时用

**预计工作量**：1-2 个会话。这是 product-positioning §7 P0 列表里最后未完成的。

### 🟡 P1：清理冗余（一次性收益）

按 GPT 评审意见 D 项：

1. 归档明显不用的 skills（pptx / dispatching-parallel-agents / subagent-driven-development）→ 移到 `archive/skills/`
2. 评估 `agentic-development-workflow/` 是否与 .clinerules 规范 5 重叠到可以删除

**预计工作量**：30 分钟。

### 🟢 P2：观察期（不立刻动）

1. .clinerules 规范 8（搜索深度自适应）—— 跑 5-10 次搜索任务后看效果
2. procedural memory（短回复偏好）—— 看后续会话回复长度是否真的下降
3. playwright 禁用后的实际 token 节省 —— 下次新会话验证

### ⏸ P3：暂缓决策（等回答完 §3 的问题）

ChatGPT 第二意见自动化——回答动机问题后再定。

### ❌ 不做

- 修改 `.clinerules` 宪法（GPT 已建议冻结 v1.0）
- 关闭 VS Code tabs（收益太小）
- 引入向量库（§3 已禁）

---

## 5. 行动清单（如果你今天/下周想做事）

按性价比排序：

- [x] ~~**第 1 件**（P0）：写 `handoff_write` handler + `handoff_resume` handler~~ ✅ 2026-06-18 完成（`test-handoff-handlers.js` 15/15 通过）
- [x] ~~**第 2 件**（P0）：写 `skills/handoff-protocol/SKILL.md`~~ ✅ 2026-06-18 完成（含 examples/basic-usage.md + SKILL.test.md，validator 通过）
- [x] ~~**第 3 件**（P1）：归档 3 个明确无用的 skills（pptx, dispatching-parallel-agents, subagent-driven-development）~~ ✅ 2026-06-18 完成
- [x] ~~**第 4 件**（P3，需先答问题）：决定 ChatGPT 第二意见自动化的去留~~ ✅ 2026-06-18 用户决定**暂缓**（非硬性需求，等更通用方案；详见 §3.1 决策）

---

## 6. 防漂移检查

写到这里，对照 product-positioning §3 不做列表：

- ❌ 没有引入向量库
- ❌ 没有开始多 agent 协同
- ❌ 没有计划 Web UI
- ❌ 没有跨工具同步
- ✅ 所有 P0 项都直接服务 §1 一句话定位

如果 ChatGPT 第二意见最终决定做，需重新过一次 §3 检查；如果发现冲突，先改 product-positioning。

---

## 附录：本次对话改动清单

| 文件 | 改动 | 理由 |
|---|---|---|
| `cline_mcp_settings.json` | playwright `disabled: true` | 节省 ~15k 上下文 |
| `.clinerules` | 新增规范 8（搜索深度自适应） | 解决 search-orchestrator 触发悖论 |
| `LEARNINGS.md` | 追加「证据没有时间戳」复盘 | 沉淀认知教训 |
| `skills-mcp-server` memory | id 17 procedural（短回复偏好） | 跨会话指导 Agent 风格 |
| `docs/specs/2026-06-18-status-and-directions.md` | 新建 | 收口本次发散 |
| `skills/{pptx,dispatching-parallel-agents,subagent-driven-development}` → `archive/skills/` | 归档 3 个 | 减少 ~300-450 token / 会话 |
| `skills-mcp-server/handlers/handoff-write.js` | 新建 | handoff_write MCP 工具 |
| `skills-mcp-server/handlers/handoff-resume.js` | 新建 | handoff_resume MCP 工具 |
| `skills-mcp-server/test-handoff-handlers.js` | 新建 | 端到端测试，15/15 通过 |
| `skills/handoff-protocol/SKILL.md` | 新建 | 教 Cline 何时调用 write/resume |
| `skills/handoff-protocol/examples/basic-usage.md` | 新建 | 5 个典型场景 |
| `skills/handoff-protocol/SKILL.test.md` | 新建 | 5 条 LLM-judge 测试用例 |
