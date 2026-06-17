# 演示脚本

## 环境准备（2分钟）

```bash
# 1. 确认 MCP Server 已加载
# 在 Cline 中检查 Available Tools 列表包含 16 个工具

# 2. 打开项目目录
cd agentic-development-workflow
```

## Step 1: Workflow Advisor（30秒）

**操作**: 在 Cline 中调用 `workflow_advisor`

**说辞**:
> "这是 Workflow Advisor。我输入自然语言需求'开发用户注册功能'，
> 系统自动识别为 feature 工作流，返回推荐的 Skill 调用顺序。"

**展示要点**:
- 展示输出中的 🔵 Feature 标识
- 指向 5 个步骤的执行顺序
- 指向参数传递建议

## Step 2: Writing Plans（30秒）

**操作**: 调用 `writing_plans`

**说辞**:
> "Writing Plans 基于需求生成完整技术方案，包含文件结构、任务拆分，
> 每个任务精确到代码块级别。这是系统中最核心的 Skill。"

**展示要点**:
- 展示文件结构规划表格
- 展示任务拆分粒度（2-5分钟/步）

## Step 3-5（可选，各20秒）

**说辞**:
> "后续步骤依次是 executing_plans 执行编码、
> requesting_code_review 代码审查、
> verification_before_completion 完成验证，
> 形成完整闭环。"

## 面试常见追问

| 问题 | 回答要点 |
|------|----------|
| 为什么用 MCP？ | 与 Cline/Claude 原生集成，无需额外通信层 |
| 不用 LangGraph？ | MCP 更轻量，本系统是编排而非 Agent 框架 |
| 10 个 Skill 如何标准化？ | 统一输入/输出/元数据格式，工具=Handler 模式 |