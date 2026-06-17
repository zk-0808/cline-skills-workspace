# Cline Skills Workspace

Cline Agent 的技能集合、工作流定义与工具链。

## 项目结构

```
.
├── .clinerules                  # Agent 宪法 — 注入 System Prompt 的行为约束
├── LEARNINGS.md                 # 经验库 — 五问复盘记录
├── AGENT_TUNING_HISTORY.md      # Agent 调优历史
├── .claude/skills/              # 技能定义（安装到 Claude Code 使用）
│   ├── brainstorming/           # 创意构思前置
│   ├── dispatching-parallel-agents/ # 并行子任务调度
│   ├── executing-plans/         # 实施计划执行
│   ├── file-search/             # 代码搜索（文本/AST/文件查找）
│   ├── finishing-a-development-branch/ # 分支完成收尾
│   ├── hypothesis-driven-research/ # 假设驱动调研
│   ├── pptx/                    # PowerPoint 操作
│   ├── requesting-code-review/  # 代码审查
│   ├── search-orchestrator/     # 多步骤搜索编排
│   ├── skill-installer/         # Skill 安装管理
│   ├── subagent-driven-development/ # 子代理驱动开发
│   ├── systematic-debugging/    # 系统化调试
│   ├── test-driven-development/ # 测试驱动开发
│   ├── verification-before-completion/ # 完成前验证
│   └── writing-plans/           # 实施计划编写
├── agentic-development-workflow/ # Agent 工作流配置
│   ├── workflows/               # 工作流定义（bug_fix / feature / research）
│   ├── demo/                    # 演示用例
│   └── showcase/                # 展示材料
└── skills-mcp-server/           # Skills MCP 服务器
```

## 核心概念

### Agent Constitution (.clinerules)

三条基本原则约束 Agent 行为：

1. **证据优于推测** — 结论标注来源（实测 > 源码 > 文档 > 社区 > 推测）
2. **问题定义优于方案设计** — 设计前先验证问题假设
3. **复杂度必须被证明** — 新增组件前证明现有机制不足

### 工作流自动判断

| 任务类型 | 工作流链 |
|----------|----------|
| bugfix | systematic-debugging → executing-plans → code-review → verification |
| refactor | brainstorming → writing-plans → executing-plans → code-review → verification |
| research | hypothesis-driven-research → brainstorming → writing-plans → verification |
| feature | writing-plans → executing-plans → code-review → verification → finishing-branch |

## 安装

将 `.claude/skills/` 下所需 skill 复制到你的 Claude Code 配置目录中。

重启 Claude Code 后 skill 即生效。

## License

MIT