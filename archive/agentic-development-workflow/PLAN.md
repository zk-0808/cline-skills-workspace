# Agentic Development Workflow System — MVP Plan

## 1. 项目目录结构

```
agentic-development-workflow/
├── README.md                        ← 项目介绍（已有）
├── PLAN.md                          ← 本文件：开发计划
├── workflows/                       ← 工作流定义（YAML）
│   ├── feature_development.yaml     ✅
│   ├── bug_fix.yaml                 ✅
│   └── research.yaml                ✅
├── demo/                            ← 完整演示案例
│   └── user-registration/
│       ├── README.md
│       ├── 1-workflow-advisor.md
│       ├── 2-writing-plans.md
│       ├── 3-executing-plans.md
│       ├── 4-code-review.md
│       └── 5-verification.md
└── showcase/                        ← 求职文案
    ├── resume-bullet-points.md
    ├── demo-script.md
    ├── architecture.md
    └── interview-qa.md
```

**砍掉的目录**: `skill-library/` — handler 的 description + 尾部 Skill 元数据表已覆盖标准化信息，单独 markdown 文档是重复劳动。

---

## 2. MVP 功能列表

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 1 | **Workflow Advisor 增强** | ✅ | 增加 research 类型，统一输出格式 |
| 2 | **4个核心handler统一输出** | ✅ | writing_plans, executing_plans, code_review, verification 尾部追加元数据表 |
| 3 | **Workflow Definitions** | ✅ | 3个 YAML：feature / bugfix / research |
| 4 | **Demo 案例** | ⏳ | user-registration 端到端 |
| 5 | **Showcase 文案** | ⏳ | resume + demo-script + architecture + interview-qa |
| 6 | **MCP Server 启动日志增强** | ✅ | 结构化输出，一眼看清加载结果 |
| 7 | **Windows ESM 路径修复** | ✅ | pathToFileURL 解决 e:\ 被解析为协议 scheme |

---

## 3. 开发顺序 & 预计耗时

**核心原则**: 能运行 > 有文档

### Day 1（完成）

| 步骤 | 状态 | 说明 |
|------|------|------|
| workflow-advisor.js 增强 | ✅ | 增加 research 类型，统一输出格式 |
| 4个核心 handler 统一输出 | ✅ | 尾部追加 Skill 元数据表 |
| feature_development.yaml | ✅ | 5步骤 YAML 定义 |
| bug_fix.yaml | ✅ | 4步骤 YAML 定义 |
| research.yaml | ✅ | 3步骤 YAML 定义 |
| Windows ESM loader 修复 | ✅ | pathToFileURL |
| 启动日志增强 | ✅ | 结构化输出 |

### Day 2（~30分钟）: Demo 案例

| 步骤 | 预计耗时 | 说明 |
|------|----------|------|
| demo/user-registration/README.md | 15min | 案例说明：需求、目标、预期结果 |
| 执行完整步骤，记录中间结果 | 15min | 记录每一步的输入/输出 |

### Day 3（~30分钟）: Showcase 文案

| 步骤 | 预计耗时 | 说明 |
|------|----------|------|
| resume-bullet-points.md | 10min | 3-5 条简历亮点 |
| demo-script.md | 10min | 演示脚本 |
| architecture.md | 5min | 架构图文档 |
| interview-qa.md | 5min | 面试问答库 |

**总工时：约 2 小时**

---

## 4. 哪些内容已排除

| 项目 | 原因 |
|------|------|
| **skill-library/\*.md 文档** | handler 元数据表已覆盖，无需重复 |
| **可视化 UI / Dashboard** | 面试展示 MCP 调用过程即可 |
| **数据库持久化** | 每个 Skill 输出在终端可见 |
| **Web 前端** | 增加维护成本，求职价值低 |
| **Auth / 权限系统** | 单人开发工具，不需要 |
| **动态工作流引擎** | workflow_advisor 推荐已够用 |
| **CrewAI / LangGraph** | 面试重点是 MCP 实践 |
| **证据链增强** | 对求职展示无直接帮助 |

---

## 5. 面试亮点

> "这是一个基于 MCP 协议的 AI Agent 开发工作流系统。
> 包含 10 个标准化 Skill，覆盖开发全生命周期。
> Workflow Advisor 能根据自然语言需求自动推荐工作流编排。
> 每个 Skill 有统一的输入/输出/下一步建议格式，可插拔、可组合。
> 完整演示：从需求 → 方案 → 代码 → 审查 → 验证，全流程在 Cline 中自动化完成。"