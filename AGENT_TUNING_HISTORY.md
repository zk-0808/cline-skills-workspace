# Agent 调优历程：从规则碎片到治理框架

> 基于 Cline 对话历史（26 个任务会话）真实还原。
> 关键决策点和用户纠正均来自 api_conversation_history.json。

---

## 阶段零：探索期（2024-06-15 之前）

**背景**：用户正在探索如何让 Cline AI Agent 更可靠地工作。

**已有基础设施**：
- `.clinerules` — 来自 superpowers CLINE.md 的行为规则文件（7条）
- `C:\Users\19936\.claude\skills\superpowers\` — obra/superpowers 的 14 个 Skill（全局安装）

**未察觉的架构问题**：
- superpowers Skill 不在工作区搜索路径内，Cline 无法通过 `use_skill` 发现
- 用户尚未完全理解 Cline 的 Rule（始终生效）与 Skill（按需触发）的机制差异

---

## 阶段一：基础建设期（2024-06-15 早期）

### 1.1 本机环境适配

**触发**：用户在多个任务中遇到 Windows 兼容性问题。

**关键任务**：
- `task_1781386506759`：整理 E 盘目录结构
- `task_1781514214378`：分析本机环境（Windows 11, 代码页 936, PS 5.1, cmd 默认 shell）

**产出**：
- `common_tips.ps1` — PowerShell/CMD 常见错误排查脚本
- 平台规则写入 `.clinerules` 规则七

**用户的关键强调**（来自对话记录）：
> PowerShell 不支持 `&&`，改分号

### 1.2 MCP 探索

**触发**：用户研究 Hermes Agent 和 MCP 概念。

**关键任务**：
- `task_1781510138297`："hermes的相关信息"
- 研究 Nous Research Hermes Agent 的 self-improving 机制
- 开始理解 Model Context Protocol 的工具注册方式

**此时尚无 skills-mcp-server**，用户仍在理解 MCP 的工作原理。

### 1.3 Agent 路由审查

**关键任务**：
- `task_1781516729786`："审查一下主agent规则触发是否合理"

**用户的原始问题**：
> 我给出指令内容和agent执行任务过程产生内容是否需要区分

**处理过程**：
- 读取 skills-mcp-server/index.js 分析 master_agent 逻辑
- 搜索社区方案（Intent Recognition、AI Agent Routing）
- 评估多种路由方案后决定实施意图分类器

**用户的中途指令**：
> 规划搜索方向，搜索主流的解决方案，然后评估可行性

这条指令后来成为 `hypothesis-driven-research` Skill 和宪法二的灵感来源——"先规划、再搜索、后评估"。

---

## 阶段二：MCP 包装层构建期（2024-06-15 中期）

### 2.1 skills-mcp-server 项目创建

**关键任务**：
- `task_1781510138297`："创建 skills-mcp-server 项目"

**当时的决策逻辑**（事后被证明是基于错误前提）：

```
【当前假设】
Skill 需要通过 MCP Tool 来调用

→ 创建 MCP Server
→ 每个 Skill 写一个 handler
→ handler 返回 Skill 的方法论摘要
```

### 2.2 Workflow Orchestrator 设计

**关键任务**：
- `task_1781520283390`："当前对话各类提示词文件读取流程"

**产出**：
- `agentic-development-workflow/workflows/` — bugfix/feature/research/refactor 四种流程定义
- `workflow_orchestrator.md` — 工作流编排设计文档
- `agent_strategy_analysis.md` — 多智能体工作方案可行性分析

### 2.3 MCP Tool 体系建成

**关键任务**：
- `task_1781526254544`：添加 `get_skill_stats` 调用统计
- `task_1781516126519`：修复 `finishing_development_branch` 注册问题
- `task_1781536894458`：项目目录结构规划

**最终 MCP Tool 列表**（16 个）：
- 10 个：第三方 Skill 的包装 handler（brainstorming, writing-plans, ...）
- 4 个：原创能力（workflow_advisor, get_platform_rules, inject_platform_rules, get_skill_stats）
- 2 个：证据链基础设施（record_source_read, check_evidence_chain）

**此时架构**：
```
Agent → use_mcp_tool → Handler（生成摘要模板）→ Agent 看到不完整摘要
                    ↓ 另外需要
               record_source_read（验证是否读了 SKILL.md）
```

---

## 阶段三：问题暴露期（2024-06-15 后期 → 2024-06-16）

### 3.1 AutoApprove Bug 定位

**关键任务**：
- `task_1781539943982`："定位这种 Bug"

**用户的原始指令**（极为关键）：
> 定位这种 Bug 最怕一上来改 Prompt，因为 Prompt 往往只能掩盖问题，不能证明根因。
> 你需要把问题拆成几个层次，逐层排除。

**处理过程**：
1. 设计最小复现测试（仅执行 `pwd`）
2. 发现 Act Mode 下 AutoApprove 跳过了 `ask()` 阻塞
3. 导致链式执行不停
4. 关闭 AutoApprove 后正常

**这条指令的意义**：
用户的这个思路——"不先改 Prompt，先证明根因"——后来成为 **宪法二（问题定义优于方案设计）** 的直接原型。

### 3.2 PPT Skill 搜索——触发转折

**关键任务**：
- `task_1781625440868`："搜索最好用的PPT-skill"

**关键事件**：
1. Agent 尝试调用 `workflow_advisor` MCP Tool → **连接失败**
2. 改用 duckduckgo 直接搜索
3. 发现 GitHub 上有大量现成的 pptx Skill（包括 Anthropic 官方的）

**这次失败的隐含教训**：
> MCP Tool 不可靠——它依赖于 MCP Server 正常运行，而 MCP Server 本身可能挂掉。
> GitHub 上的 Skill 是纯文件，没有运行时依赖。

### 3.3 证据积累

在 PPT Skill 搜索任务中，Agent 发现：
- 社区有 32+ 个 Cline Skill 可用
- Rules (.clinerules/) 始终激活，Skills (.cline/skills/) 按需加载
- Cline 的 Skill 发现机制基于工作区路径

**这些发现后来直接支撑了 "MCP → Skill 迁移" 方案的可行性论证。**

---

## 阶段四：MCP → Skill 迁移（2024-06-17，本次对话）

### 4.1 触发

**用户明确指令**：
> 我之前将大量 Skill 包装成 MCP Tools 使用。经过验证，当前方案存在问题：
> MCP Tool 经常无法正确调用，存在包装层与真实 Skill 逻辑不一致的问题

### 4.2 调研阶段

**16 个 handler 逐一读取**，确认：
- A 类（10 个）：纯包装层，handler 内只有模板文本生成，无独立逻辑
- B 类（4 个）：原创能力（workflow_advisor, platform_rules, inject, stats）
- C 类（2 个）：MCP 专属基础设施（evidence chain）

**use_skill 可用性验证**：
- `use_skill("pptx")` ✅ 成功
- `use_skill("brainstorming")` ❌ "not found"

**GitHub 源仓库确认**：obra/superpowers（230k stars, MIT, v5.1.0, 442 commits）

### 4.3 GPT 评审介入——第一次关键纠正

**GPT 评审意见**（部分原文记录）：
> 如果我是架构评审，我不会批准直接执行，原因是它里面有几个未经验证的前提。
> 整个方案建立在 `use_skill("brainstorming")` 这个前提上，但没有证据证明当前 Cline 真的支持。

> 执行前必须验证：当前 Agent 是否支持 Skill 机制、Skill 搜索路径是什么、是否真的存在 use_skill()

**这条评审直接阻止了不成熟的执行**，并触发了 `use_skill("brainstorming")` 的实测——结果果然是 "not found"。

### 4.4 执行迁移

**修正后方案**：从 GitHub 下载原始 SKILL.md → 安装到 `.claude/skills/`

| 步骤 | 操作 | 结果 |
|------|------|:----:|
| 1 | 下载 brainstorming SKILL.md 试点 | ✅ |
| 2 | `use_skill("brainstorming")` 验证 | ✅ 164 行全文加载 |
| 3 | 批量下载 9 个 Skill | ✅ |
| 4 | 删除 16 个 MCP handler | ✅ |
| 5 | 移除 skills-mcp-server MCP 配置 | ✅ |

---

## 阶段五：规则体系演进（2024-06-17，本次对话）

### 5.1 GPT 继续评审——规则修改建议

**第一轮修改**（GPT 对迁移方案的评审）：
- 规则二：放宽连续调用限制
- 规则五：增加禁止猜测/跳过/总结替代
- 规则六：增加目标语义优先级
- 规则八（新增）：区分已验证事实与推测
- 规则九（新增）：架构变更前验证现有机制

### 5.2 用户持续纠正——Skill 使用习惯建立

**关键交互**：
- 用户要求评价 workflow-advisor 是否还有存在意义
- 用户要求搜索社区方案（而非闭门造车）
- 用户要求建立经验教训日志（LEARNINGS.md）

**产出**：
- workflow-advisor 被删除（功能被 .clinerules + Skill 自描述覆盖）
- LEARNINGS.md 建成（8 条初始记录 + 格式模板）
- hypothesis-driven-research Skill 创建（五阶段搜索流程）

### 5.3 规则体系膨胀到 12 条

在 GPT 和用户的反复建议下，.clinerules 从 7 条增长到 12 条：
- 规则八：验证事实与推测
- 规则九：架构变更前验证
- 规则十：经验教训记录
- 规则十一：引用事实来源
- 规则十二：方案设计前验证问题定义

### 5.4 架构重构——12 条 → 3 宪法

**GPT 的关键警告**：
> 当前版本最大的风险已经不是规则不足，而是规则正在逐渐变成"规则债务"。
> 12 条平级规则，重要性根本不在一个层级。应该拆成三层。

**重构为三层治理框架**：

```
核心宪法（3条，不可违反）
├── 宪法一：证据优于推测
├── 宪法二：问题定义优于方案设计
└── 宪法三：复杂度必须被证明

操作规范（6条，可调整）

经验库（LEARNINGS.md + Q0-Q5 六问复盘）
```

**关键修正**（来自 GPT 试运行审查）：
1. 宪法一：来源等级 ≠ 自动正确；冲突时优先近环境证据
2. 宪法二：ACH 条件触发（非全局强制）；证据充分时可跳过构造竞争假设
3. 规范一：区分高风险操作（需确认）和普通操作（可继续）
4. 经验库：新增 Q5（未来如何更早发现？）

### 5.5 冻结 v1.0

**GPT 最终建议**：
> 继续讨论"宪法一最后一句怎么写"这种级别，收益已经很小。已经进入典型的 80/20 曲线——80% 效果用 20% 工作量，剩下 20% 效果需要 80% 工作量。

**决定**：冻结 Agent Constitution v1.0，下次修改触发条件为累计 10-20 个真实任务后。

---

## 阶段六：经验总结（当前）

### 调优历程全景时间线

```
Day 1-2（基础建设）
  本机环境适配 → common_tips.ps1
  MCP 概念探索 → Hermes Agent 研究
  Agent 路由审查 → 意图分类器

Day 3-4（MCP 包装层构建）
  创建 skills-mcp-server
  Workflow Orchestrator 设计
  agentic-development-workflow 建成
  16 个 MCP Tool 上线

Day 4-5（问题暴露）
  AutoApprove Bug 定位
  PPT Skill 搜索触发 workflow_advisor 连接失败
  意识到 MCP 不可靠

Day 6（迁移执行）
  调研 → GPT 评审纠正 → 修正方案
  从 GitHub 下载 10 个 SKILL.md
  删除 16 个 handler
  移除 skills-mcp-server

Day 6（规则进化）
  7 → 12 条规则
  12 条平级 → 3 宪法 + 6 规范
  新增 hypothesis-driven-research Skill
  删除 workflow-advisor Skill
  冻结 v1.0
```

### 用户的关键贡献（来自真实对话记录）

| 用户输入 | 产生的影响 |
|---------|-----------|
| "规划搜索方向，搜索主流的解决方案，然后评估可行性" | → hypothesis-driven-research Skill + 宪法二的原型 |
| "定位 Bug 最怕一上来改 Prompt，Prompt 只能掩盖问题，不能证明根因" | → 宪法二（问题定义优于方案设计）的直接原型 |
| "评价 workflow-advisor 是否还有存在意义" | → 触发冗余分析，最终删除 redundant Skill |
| "搜索一下社区的处理方案" | → 发现 Rules vs Skills 机制差异 |
| "给我增添总日志，方便汲取教训" | → LEARNINGS.md + 规则十 |
| "不确定时可以搜索社区方案" | → 规则十条件 #5 |
| "将我的调优过程整理成阶段性文档" | → 本文档 |

### GPT 作为外部评审的 6 次关键纠正

1. **阻止直接执行**：指出 use_skill 前提未验证
2. **纠正定义偏差**："简单优于复杂" → "复杂度必须被证明"
3. **避免流程噪音**：ACH 从全局强制改为条件触发
4. **防止规则膨胀**：12 条平级 → 3 宪法 + 6 规范
5. **消除规则冲突**：规则一与规则二对齐
6. **阻止过度优化**：指出收益递减，建议冻结 v1.0

### 最大的教训

> **不是能力不足，而是太快相信了第一个看起来合理的解释。**
>
> MCP 绕路的根源：「Skill 可能不能直接加载」→ 不验证 → 创建 MCP → 生产 3 个月的技术债务。
>
> **如果当时能问一句「现有机制为什么不行？」并实测一下 use_skill，大部分后续工作根本不会发生。**

---

## 阶段七：元认知发现——AI Agent 的主要失败模式

### 贯穿始终的规律

回顾全部 6 个阶段，真正反复出现导致大规模返工的不是「不会写代码」或「能力不足」，而是一个统一的模式：

```
发现问题
 ↓
形成解释
 ↓
相信解释（跳过验证）
 ↓
围绕解释构建系统
 ↓
后来发现解释错了
```

### 五个典型案例

#### 案例 1：MCP 包装层

```
【解释】Skill 可能不能直接调用
【验证】无
【结果】skills-mcp-server + 16 个 handler + 证据链
【真相】use_skill 原生支持，只是搜索路径不对
```

#### 案例 2：搜索规划 Skill

```
【解释】搜索效果不好是因为缺少搜索规划
【验证】无（直接被采纳后创建 Skill）
【问题】实际可能只是搜索词写错了
```

#### 案例 3：workflow-advisor

```
【解释】Agent 需要显式的编排顾问来决定工作流
【验证】无（直接从 MCP Tool 转换为 Skill）
【真相】.clinerules + 各 Skill 自描述已完全覆盖
```

#### 案例 4：evidence-chain（证据链系统）

```
【解释】Agent 可能声称已读 SKILL.md 但实际没读
【验证】无（直接设计 record_source_read + check_evidence_chain）
【真相】use_skill 天然保证 Skill 内容已加载
```

#### 案例 5：主人路由审查

```
【用户原话】"我给出指令内容和 agent 执行任务过程产生内容是否需要区分"
【处理】搜索社区方案 → 评估可行性 → 实施意图分类器
【教训】用户已具备「先规划 → 搜方案 → 后评估」的正确思路，但 Agent 仍然跳过了验证步骤
```

### AI Agent 的 5 种主要失败模式

所有案例可以归纳为 5 种模式：

| 模式 | 描述 | 典型案例 |
|:----:|------|---------|
| 模式 1 | **未经验证的问题定义** | "Skill 不能直接加载" |
| 模式 2 | **未经验证的能力边界** | "Cline 不支持 Skill" |
| 模式 3 | **未经验证的架构假设** | "需要 MCP 包装层" |
| 模式 4 | **未经验证的社区共识** | "需要 workflow-advisor" |
| 模式 5 | **未经验证的优化方向** | "需要更强的搜索规划" |

### 统一解决方案

三条宪法恰好各自覆盖这些模式：

```
宪法一（证据优于推测）  → 模式 1-5 的通用防线
宪法二（问题定义优于方案设计） → 模式 1 的专项拦截
宪法三（复杂度必须被证明） → 模式 2、3、4 的专项拦截
```

### 第一性教训

> **不是能力不足，而是太快相信了第一个看起来合理的解释。**

这已从工程规则上升为认知层规律。

---

## Agent Constitution v1.0 状态评估

| 维度 | 状态 |
|------|:----:|
| 防过早相信第一个解释 | 已达标（宪法二 + ACH 触发条件） |
| 防推测当事实 | 已达标（宪法一 + 5 级来源标注） |
| 防过度设计 | 已达标（宪法三 + "为什么不行？"门禁） |
| 可维护性 / 可扩展性 | 已达标（三层架构 + 规则可删除） |
| 经验沉淀机制 | 已达标（LEARNINGS.md + Q0-Q5 六问） |
| **数据驱动迭代** | **未验证**（需真实任务积累） |
| **长期稳定性** | **未验证**（需时间检验） |

> **Agent Constitution v1.0 已完成设计验证，进入运行验证阶段。除非出现系统性失败模式，否则禁止修改宪法；仅允许向 LEARNINGS.md 追加证据。**

---

## 当前交付物

| 文件 | 版本 | 说明 |
|------|:----:|------|
| `.clinerules` | Agent Constitution v1.0 | 3宪法+6规范+六问复盘 |
| `LEARNINGS.md` | — | 8条经验记录 |
| `AGENT_TUNING_HISTORY.md` | — | 本文档 |
| `.claude/skills/` | — | 12个Skill |
| `agentic-development-workflow/` | — | 工作流定义 |
| `skills-mcp-server/` | 空壳 | handlers 已全删除 |

---

## 后续计划

- 用真实项目验证 Constitution v1.0
- 只记录 LEARNINGS，不修改规则
- 累计 10-20 个任务后回顾
- 根据实际失败模式（非想象问题）决定是否需要 v1.1