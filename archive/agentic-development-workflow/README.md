# Agentic Development Workflow System

> 基于 MCP 的开发工作流系统 — 让 AI Agent 按标准化开发流程完成需求分析、方案设计、代码实现、审查和验证。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      Cline / Claude                      │
│            (AI 助手，理解需求并调用 Skill)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │              Workflow Advisor                    │   │
│   │    (根据需求推荐最佳工作流编排)                    │   │
│   └──────────┬───────────────────────────────────────┘   │
│              │                                            │
│   ┌──────────▼───────────────────────────────────────┐   │
│   │              Skills Library                      │   │
│   │  ┌──────────┬──────────┬──────────┬──────────┐   │   │
│   │  │ writing  │executing │ code     │verif-    │   │   │
│   │  │_plans    │_plans    │_review   │ication   │   │   │
│   │  ├──────────┼──────────┼──────────┼──────────┤   │   │
│   │  │systematic│test_driven│brain-   │subagent  │   │   │
│   │  │_debugging│_dev      │storming  │_driven   │   │   │
│   │  └──────────┴──────────┴──────────┴──────────┘   │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │              MCP Server (Transport Layer)         │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 工作流执行示例

### Feature Development（功能开发）

```
Input: "开发用户注册功能（邮箱+密码）"

Step 1: writing_plans
        → 输出技术方案文档
Step 2: executing_plans
        → 按计划分步实现代码
Step 3: requesting_code_review
        → 输出审查报告
Step 4: verification_before_completion
        → 输出验证结果
Step 5: finishing_development_branch
        → 提 PR 收尾
```

### Bug Fix（缺陷修复）

```
Input: "修复登录页面 500 错误"

Step 1: systematic_debugging
        → 定位根因 + 修复方案
Step 2: executing_plans
        → 执行修复
Step 3: requesting_code_review
        → 审查修复代码
Step 4: verification_before_completion
        → 验证修复完整性
```

## 核心能力

| 能力 | 说明 |
|------|------|
| **Workflow Advisor** | 输入需求，自动推荐最佳工作流编排 |
| **12 个 Skill** | 覆盖开发全生命周期（计划→实现→审查→验证） |
| **标准化流程** | 每个 Skill 有统一的输入/输出/下一步建议 |
| **即插即用** | 基于 MCP 协议，与 Cline/Claude 等 AI 助手原生集成 |

## 项目结构

```
agentic-development-workflow/
├── README.md              ← 本文件：项目介绍
├── workflows/             ← 工作流定义（YAML）
├── skill-library/         ← Skill 资料库（统一格式文档）
├── demo/                  ← 完整演示案例
└── showcase/              ← 简历文案 + 演示脚本
```

## 技术栈

- **MCP Server**: Node.js + `@modelcontextprotocol/sdk`
- **AI 助手**: Cline / Claude
- **协议**: Model Context Protocol (MCP)
- **文档格式**: YAML + Markdown

## 架构澄清：两个文件的关系

```
skills-mcp-server/index.js               ← 这是「发动机」— 14 个 Skill 的真实代码
  ├── get_platform_rules()                ← 每个 Skill = 一个函数
  ├── workflow_advisor()                  ← 接收参数 → 处理逻辑 → 返回结果
  ├── writing_plans()
  ├── ...（共 14 个 Skill）
  └── get_skill_stats()

cline_mcp_settings.json                   ← 这是「钥匙」— 告诉 Cline 去启动发动机
  └── skills-mcp-server:                  ← 指定 index.js 路径 + 免确认名单
      command: node index.js
      autoApprove: [14 个 Skill]
```

**核心规则**：所有 Skill 的定义和实现**只在** `index.js` 中。`cline_mcp_settings.json` 只是配置，不含任何 Skill 代码。

## 快速开始

```bash
# 1. 确保 MCP Server 已注册（已在 cline_mcp_settings.json 中配置）
# 2. 在 Cline 中调用 workflow_advisor
# 输入你的需求，获取推荐工作流

# 3. 按推荐顺序依次调用 Skill
# 前一个 Skill 的输出作为下一个的输入
```

## 求职亮点

- ✅ 完整展示了 MCP 协议的实际工程应用
- ✅ 12 个可独立演示的 AI Agent 开发 Skill
- ✅ Workflow Advisor 展示 AI 工作流编排能力
- ✅ 端到端演示：从需求到 PR 的全流程自动化
- ✅ 展示工程化思维：标准化、可复用、可组合