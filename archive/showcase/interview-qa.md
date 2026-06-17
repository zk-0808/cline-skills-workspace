# 面试问答库

## Q1: 为什么不用 LangGraph？

**回答框架**:
- LangGraph 是多 Agent 编排框架，适合复杂 AI 工作流
- 本系统的定位是 **MCP 协议的工程实践**，而非 Agent 框架
- MCP + Workflow Advisor 足以覆盖"需求 → 方案 → 代码 → 审查 → 验证"的标准开发流程
- 面试时可直接展示源码和 MCP 调用过程，无需依赖外部框架

## Q2: 为什么选择 MCP？

**回答框架**:
- MCP 是 AI 助手（Cline/Claude）与外部工具之间的标准协议
- 与 Cline 原生集成，无需额外通信层
- 每个 Skill = 一个 MCP tool，即插即用
- 轻量级：纯 Node.js + MCP SDK，无数据库/微服务依赖

## Q3: Workflow Advisor 和 Agent 的区别？

**回答框架**:
- Workflow Advisor 是**推荐引擎**，不是执行引擎
- 它根据需求输出 Skill 调用顺序，但**不替 AI 决定调用哪个 Skill**
- 真正的 Agent 行为在 Cline/Claude 侧——它理解 Advisor 的输出后自主调用
- 这种设计保持了灵活性：AI 可以跳过或修改步骤

## Q4: Skill 标准化有什么价值？

**回答框架**:
- 统一接口（场景/输入/输出/下一步）让 10 个 Skill 可插拔、可组合
- 新 Skill 只需实现 toolDefinition + handler 即可注册
- 面试时可直接展示任意 handler 的统一元数据表结构

## Q5: Parallel Agent 未来如何实现？

**回答框架**:
- 当前 dispatching_parallel_agents 已支持任务拆分
- 未来方向：Workflow Advisor 识别可并行步骤 → 派发多个 subagent → 汇总结果
- MVP 阶段优先保证串行流程正确，并行是自然扩展

## Q6: 为什么不做 Web UI？

**回答框架**:
- 目标用户是 AI 开发者，使用 Cline/Claude 终端交互
- Web UI 增加维护成本，对求职展示价值有限
- 面试时直接共享 Cline 屏幕，展示 MCP 调用过程更直观