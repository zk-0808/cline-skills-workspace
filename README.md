# Cline Skills Workspace

> Cline Agent 技能的质量标杆仓库。每个 Skill 都经过测试验证、有明确版本、可独立安装使用。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-17-blue)](skills/)
[![Runtime](https://img.shields.io/badge/runtime-memory%20%2B%20context%20compactor-green)](skills-mcp-server/)

---

## 快速开始

将 `skills/` 下任意 Skill 目录复制到你的 Cline 配置目录即可使用：

```bash
cp -r skills/brainstorming ~/.claude/skills/
```

**5 分钟体验**：用 brainstorming 技能设计一个新功能。

1. 在 Cline 中输入: "我想设计一个用户标签系统"
2. Cline 自动加载 brainstorming 技能，通过协作对话逐步产出完整设计文档

---

## 技能目录

| 分类 | 技能 | 版本 | 说明 |
|------|------|------|------|
| **workflow** | [brainstorming](skills/brainstorming/) | 1.0.0 | 创意构思前置 |
| | [writing-plans](skills/writing-plans/) | 1.0.0 | 编写实施计划 |
| | [executing-plans](skills/executing-plans/) | 1.0.0 | 执行实施计划 |
| | [systematic-debugging](skills/systematic-debugging/) | 1.0.0 | 系统化调试 |
| | [test-driven-development](skills/test-driven-development/) | 1.0.0 | 测试驱动开发 |
| | [hypothesis-driven-research](skills/hypothesis-driven-research/) | 1.0.0 | 假设驱动调研 |
| | [search-orchestrator](skills/search-orchestrator/) | 1.0.0 | 搜索编排 |
| | [finishing-a-development-branch](skills/finishing-a-development-branch/) | 1.0.0 | 分支收尾 |
| **meta** | [requesting-code-review](skills/requesting-code-review/) | 1.0.0 | 代码审查 |
| | [verification-before-completion](skills/verification-before-completion/) | 1.0.0 | 完成前验证 |
| **domain** | [pptx](skills/pptx/) | 1.0.0 | PowerPoint 操作 |
| | [file-search](skills/file-search/) | 1.0.0 | 文件搜索 |
| **utility** | [skill-installer](skills/skill-installer/) | 1.0.0 | 技能安装管理 |
| | [dispatching-parallel-agents](skills/dispatching-parallel-agents/) | 1.0.0 | 并行代理调度 |
| | [subagent-driven-development](skills/subagent-driven-development/) | 1.0.0 | 子代理驱动开发 |
| | [memory-keeper](skills/memory-keeper/) | 0.1.0 | 跨会话长期记忆（SQLite + FTS5） |
| **workflow** | [context-compactor](skills/context-compactor/) | 0.1.0 | 上下文压缩与会话交接 |

---

## 运行时层 · Memory & Context

> 让 Agent 跨会话不再失忆，长任务接近窗口上限时自动打包交接。

`skills-mcp-server` 暴露 4 个新工具：

| 工具 | 用途 |
|------|------|
| `memory_commit` | 持久化关键事实/决策/经验到项目本地 SQLite |
| `memory_recall` | FTS5 全文检索 + bm25 排序，可按 kind/tag 过滤 |
| `memory_list` | list/stats/delete/pin/unpin 管理记忆条目 |
| `compact_context` | 生成结构化交接包（目标/进度/决策/下一步），可选写入 episodic 记忆 |

**零外部依赖**：使用 Node 22.5+ 内置的 `node:sqlite`，无需 `better-sqlite3` 等需要编译的 native module。

**项目隔离**：记忆库按 `sha256(项目路径)[:12]` 哈希隔离，存于 `~/.cline-skills/memory/{hash}/memory.db`。

```bash
# 跑端到端测试
cd skills-mcp-server
node test-memory.js
# === 结果: 13 passed, 0 failed ===
```

详见 [docs/gap-analysis-runtime-layer.md](docs/gap-analysis-runtime-layer.md) 与 [docs/superpowers/plans/2026-06-18-context-and-memory-mvp.md](docs/superpowers/plans/2026-06-18-context-and-memory-mvp.md)。

---

## 技能标准

每个 Skill 遵循 [SKILL.md 规范](docs/skill-spec.md) — 12 个必填 frontmatter 字段，4 个正文章节。

```bash
node tools/validate-skills.js
# ✅ 所有 Skill 通过校验!
```

---

## 项目结构

```
cline-skills-workspace/
├── skills/                       # 技能定义（核心资产）
│   ├── brainstorming/
│   │   ├── SKILL.md              # 标准化技能定义
│   │   ├── SKILL.test.md         # 测试用例
│   │   └── examples/             # 使用示例
│   └── ... (14 more)
├── skills-mcp-server/            # MCP 服务器
├── tools/
│   └── validate-skills.js        # 技能格式校验
├── docs/
│   ├── skill-spec.md             # 规范标准
│   ├── roadmap.md                # 发展规划
│   └── examples/                 # 演示案例
└── CONTRIBUTING.md               # 贡献指南
```

---

## 愿景

成为 Cline 生态的「npm for skills」— 每个 Skill 可发现、可安装、可验证。

**当前阶段**: 深度优先 — 将 15 个 Skill 做到工业级质量。

详见 [发展规划](docs/superpowers/specs/2026-06-17-project-roadmap-design.md)。

---

## 贡献

欢迎贡献新 Skill！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解提交流程和审核标准。

---

## License

MIT