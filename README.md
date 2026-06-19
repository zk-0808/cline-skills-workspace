# 🧠 cline-skills-workspace

> **Project Continuity for AI Coding.**
> Resume your project exactly where you left off.
>
> 让 AI 从上次停下的地方继续工作。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-15-blue)](skills/)
[![Runtime](https://img.shields.io/badge/runtime-memory%20%2B%20handoff%20%2B%20compact-green)](skills-mcp-server/)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.5-brightgreen)](https://nodejs.org/)

---

## 它解决什么

间歇式开发的**连续性丢失**：

1. **跨会话失忆** —— 周一聊 2 小时做到一半，周四回来 Cline 完全不知道上次在哪里。
2. **重启踩同一个坑** —— 上次确认过「不要改 X 表」，新会话又被建议改一次。
3. **token 爆炸断档** —— 一个 task 太长被截断，关键决策丢失，被迫从零解释。

详见 [`docs/product-positioning.md`](docs/product-positioning.md) — 项目定位文档（本仓最高锚点）。

---

## 三层模型

```
┌─────────────────────────────────────────────────────────────┐
│  memory   = 长期事实层（架构、用户偏好、失败教训）             │
│             生命周期：项目级，跨所有会话                        │
│             工具：memory_commit / memory_recall / memory_list │
├─────────────────────────────────────────────────────────────┤
│  handoff  = 当前工作状态层（status / next_action / do_not）   │
│             生命周期：会话之间，单分支单 active                 │
│             工具：handoff_write / handoff_resume              │
├─────────────────────────────────────────────────────────────┤
│  compact  = 会话内压缩（防 token 爆炸）                        │
│             生命周期：单次会话内部                              │
│             工具：compact_context                              │
└─────────────────────────────────────────────────────────────┘
```

三层职责互不重叠，**禁止合并**。

---

## 快速开始

### 一键安装（推荐）

```bash
git clone https://github.com/zk-0808/cline-skills-workspace.git
cd cline-skills-workspace
node install.mjs
```

`install.mjs` 会自动完成：
1. `skills-mcp-server` 依赖安装（`npm install`）
2. 在 Cline 的 `cline_mcp_settings.json` **自动注册** `skills-mcp-server`（Windows / macOS / Linux 全部检测）
3. 复制 `skills/` 全部目录到 `~/.claude/skills/`（Cline 全局发现）
4. 跑 `validate-skills` + 全部 server 测试做 sanity check

> Node 必须 ≥ **22.5**（启动期会预检；低版本直接拒绝，避免 `node:sqlite` 隐蔽报错）。

完成后**重启 VS Code / Cursor** 即可。

### 进阶选项

```bash
node install.mjs --dry-run     # 预览，不实际写入
node install.mjs --force       # 覆盖已有配置
node install.mjs --server-only # 只装 server
node install.mjs --skills-only # 只复制 skills
node install.mjs --no-test     # 跳过测试
node install.mjs --help        # 显示全部参数
```

### 手动安装（如果一键失败）

<details>
<summary>展开 5 步手动流程</summary>

#### 1. 安装 MCP server

```bash
cd skills-mcp-server
npm install
```

在 Cline 的 `cline_mcp_settings.json` 注册：

```json
{
  "mcpServers": {
    "skills-mcp-server": {
      "command": "node",
      "args": ["E:/path/to/cline-skills-workspace/skills-mcp-server/index.js"]
    }
  }
}
```

#### 2. 复制 Skills 到 Cline 全局目录

```bash
cp -r skills/handoff-protocol ~/.claude/skills/
cp -r skills/memory-keeper    ~/.claude/skills/
cp -r skills/context-compactor ~/.claude/skills/
# 或一次性全装：
cp -r skills/*                 ~/.claude/skills/
```

</details>

### 体验跨会话连续性

**会话 1**：完成一些工作后写交接：
```
用户：把今天的进度写成 handoff
Cline → handoff_write({ goal, completed, next_action, do_not })
       ✅ 已写入 .cline/handoffs/HANDOFF_<branch>_active.md（进 git）
```

**会话 2**（几天后，新窗口）：
```
用户：继续上次对话
Cline → handoff_resume()
       ## 📋 handoff 已恢复
       - branch: feat/xxx
       - status: active（3 天前更新）
       - goal: ...
       ### ▶️ next_action（2 项）...
       ### 🚫 do_not（4 项）...
```

---

## 运行时层 · MCP 工具集

`skills-mcp-server` 暴露 6 个工具：

| 工具 | 层 | 用途 |
|------|----|------|
| `memory_commit` | memory | 持久化关键事实/决策/经验到项目本地 SQLite |
| `memory_recall` | memory | FTS5 全文检索 + bm25 排序，可按 kind/tag 过滤；多 token 词序无关 |
| `memory_list`   | memory | list / stats / delete / pin / unpin 管理记忆条目 |
| `handoff_write` | handoff | 写入 typed YAML 到 `.cline/handoffs/<branch>_active.md`，进 git |
| `handoff_resume`| handoff | 自动校验 branch + status + stale + project_hash，恢复结构化恢复包 |
| `compact_context` | compact | 生成结构化交接包（目标/进度/决策/下一步），可选写入 episodic 记忆 |

**零额外原生编译依赖**：使用 Node 22.5+ 内置的 `node:sqlite`（FTS5 默认启用），无需 `better-sqlite3` 等 node-gyp 编译过程。

**项目隔离**：记忆库按 `sha256(项目路径)[:12]` 哈希隔离，存于 `~/.cline-skills/memory/<hash>/memory.db`。

**Handoff 默认进 git**：`.cline/handoffs/HANDOFF_<branch>_active.md` 跟随项目，PR review 可见 `status: active → done` 的 diff，天然审计；`--local` 模式可落到 `~/.cline-skills/handoffs/<hash>/`。

```bash
# 跑端到端测试
cd skills-mcp-server
node test-memory.js          # 13 passed, 0 failed
node test-escape-fts.js      # 23 passed, 0 failed
node test-handoff-lib.js     # 58 passed, 0 failed
node test-handoff-handlers.js # 15 passed, 0 failed
```

详见：
- [`docs/handoff-schema.md`](docs/handoff-schema.md) — Handoff Schema v1.0（已锁定）
- [`docs/gap-analysis-runtime-layer.md`](docs/gap-analysis-runtime-layer.md) — 运行时层差距分析

---

## Skills 目录

| 分类 | 技能 | 版本 | 说明 |
|------|------|------|------|
| **continuity** ⭐ | [handoff-protocol](skills/handoff-protocol/) | 1.0.0 | 教 Cline 何时写、何时 resume、字段含义 |
| | [memory-keeper](skills/memory-keeper/) | 0.1.0 | 跨会话长期记忆（SQLite + FTS5）|
| | [context-compactor](skills/context-compactor/) | 0.1.0 | 上下文压缩与会话交接 |
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
| **utility** | [file-search](skills/file-search/) | 1.0.0 | 文件搜索 |
| | [skill-installer](skills/skill-installer/) | 1.0.0 | 技能安装管理 |

> 已归档 Skills 见 [`archive/skills/`](archive/skills/)（pptx / dispatching-parallel-agents / subagent-driven-development —— 与 Project Continuity 定位无关）。

---

## 技能标准

每个 Skill 遵循 [`docs/skill-spec.md`](docs/skill-spec.md) — 12 个必填 frontmatter 字段，4 个正文章节。

```bash
node tools/validate-skills.js
# ✅ 所有 Skill 通过校验! (15 skills, 0 errors)
```

---

## 项目结构

```
cline-skills-workspace/
├── skills/                       # Skills（Cline 端提示词层）
│   ├── handoff-protocol/         # ⭐ Project Continuity 核心
│   ├── memory-keeper/
│   ├── context-compactor/
│   └── ... (12 more)
├── skills-mcp-server/            # MCP 服务器（运行时层）
│   ├── handlers/                 # memory_* / handoff_* / compact_context
│   ├── lib/                      # db / git / handoff-{schema,fs}
│   └── test-*.js                 # 109 个用例
├── docs/
│   ├── product-positioning.md    # ⭐ 项目定位（最高锚点）
│   ├── handoff-schema.md         # Handoff Schema v1.0
│   ├── skill-spec.md             # Skill 规范
│   └── ...
├── tools/
│   └── validate-skills.js        # Skill 格式校验
├── archive/                      # 已归档（与定位无关的历史资产）
└── CONTRIBUTING.md
```

---

## 为什么不用其他方案

| 方案 | 局限 | 我们的差异 |
|------|------|----------|
| Cline 官方 memory | 单 agent，KV black-box | git-trackable + typed state |
| `CLAUDE.md` / `AGENTS.md` | 启动时注入，单文件 | 有 status / next_action / 时间维度 |
| Iranti | Postgres + pgvector | 零额外原生编译依赖、不做事实层 |
| Memorix | 跨客户端 memory | 我们聚焦 handoff 而非 memory |
| 向量数据库（pgvector / sqlite-vec） | 需要 node-gyp / native 编译 | FTS5 + bm25 已够用 |

完整对比见 [`docs/product-positioning.md`](docs/product-positioning.md) 附录 B。

---

## 我们**不**做什么（YAGNI）

为防止后续漂移，明确禁止以下方向（详见 `docs/product-positioning.md` §3）：

- ❌ 多 Agent 协同平台
- ❌ 向量数据库 / 语义检索
- ❌ 跨工具实时同步
- ❌ 团队协同 / 权限模型
- ❌ Web UI / 仪表盘
- ❌ Server 内嵌 LLM 调用

任何打破禁令的提议，**先改 `docs/product-positioning.md`，再改其他**。

---

## 当前阶段

**Dogfooding sprint**（2026-06-18 ~ 06-21，缩短为 3 天）— 通过实际使用验证 Project Continuity 体系价值，并落实外部评审反馈（见 [`docs/dogfooding-sprint.md`](docs/dogfooding-sprint.md) / [`docs/external-review-2026-06-18.md`](docs/external-review-2026-06-18.md)）。

Sprint 期间已完成的 P1：
- ✅ external-review §6「Sprint 期内必做」全部 6 项（PRAGMA busy_timeout / handoff 原子写 / handler eager import / Node engines / escapeFts 转义 / 「零额外原生编译依赖」措辞）
- ✅ `getProjectHashByGitUrl()` —— 跨设备稳定的项目身份键（为未来 P1.3 memory_export/import 准备）
- ✅ `install.mjs` —— 一键安装脚本（替代 5 步手动配置）
- ✅ Shell 基建：PowerShell 7 + Shell Integration（`&&` 链式 + 输出捕获）

---

## 贡献

欢迎贡献 Skill 或运行时改进！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

PR 前请确保：
- `node tools/validate-skills.js` 0 ERROR
- `skills-mcp-server` 全部测试通过
- 与 `docs/product-positioning.md` 不冲突；冲突时**先改定位文件**

---

## License

MIT