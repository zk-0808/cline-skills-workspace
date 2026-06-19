# DEV_NOTES — 项目开发者私有笔记

> 本文件**不分发给最终使用者**，install.mjs 只复制 `skills/*` 到 `~/.claude/skills/`，不会触达根目录文件。
> 内容分两类：
> 1. **开发本项目时的本机环境约束**（PowerShell 7、Windows 11 GBK 936、ExecutionPolicy 等）
> 2. **开发期踩坑日志**（原 LEARNINGS.md 全量迁移）
>
> 与 `.clinerules` 的分工：
> - `.clinerules` = 通用 Agent 工作准则（最终使用者也会读到）
> - `DEV_NOTES.md` = 本机/本项目特化的实践与历史（仅开发者读）
>
> 修订原则：本机环境变更时同步更新「环境约束」段；遇到新坑按五问复盘补「踩坑日志」段。

---

## 一、本机环境约束（开发期生效）

### Shell / 终端

- 系统：Windows 11 中文系统（GBK 936）
- VS Code 集成终端默认 Shell：**PowerShell 7（pwsh.exe）**
  - settings.json 路径：`%APPDATA%\Code\User\settings.json`
  - 配置：`"terminal.integrated.defaultProfile.windows": "PowerShell 7"`
  - 显式路径：`C:/Program Files/PowerShell/7/pwsh.exe`
- 选择 PS 7 的三条理由（同时满足）：
  - ✅ `&&` / `||` 短路链接（PS 7+ 原生）
  - ✅ VS Code Shell Integration（输出可被 Cline 正确捕获）
  - ✅ UTF-8 默认（中文不乱码）
- 一次性设置：`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
  - 解决 `npm.ps1 cannot be loaded because running scripts is disabled` 报错
  - 之后 `npm install` / `npm.ps1` 可直接运行，无需 `npm.cmd` 兜底

### PS 7 命令书写约定（开发期）

- 路径含空格必须双引号包裹
- 环境变量用 `$env:VAR`（如 `$env:APPDATA`、`$env:PATH`）
- 链式命令用 `&&`（PS 7+ 已支持）
- 多行/嵌套用 `|` 管道；`;` 仅用于"无依赖顺序执行"
- npm 直接 `npm install`（已配 RemoteSigned，无需 `npm.cmd`）

### 回退兜底（极少数场景才用）

- **cmd.exe**：`%VAR%` 取环境变量；**无 Shell Integration**，避免使用
- **PS 5.1**：`;` 而非 `&&`；`npm` 用 `npm.cmd`；`.ps1` 须加 `-ExecutionPolicy Bypass`

### Node / 依赖

- Node 版本：v24.15.0（≥ 22.5 即可，`node:sqlite` stable 起点）
- **不使用 `better-sqlite3`**：本机无 prebuilt 二进制 + 无 VS C++ Build Tools，编译失败
- 改用 Node 内置 `node:sqlite`（自带 FTS5 + bm25 + unicode61 tokenizer）
- 零额外原生编译依赖

### 测试相关已知问题

- ⚠️ `skills-mcp-server/test-handoff-handlers.js` **会污染真实工作树**
  - 测试直接在 `<repo>/.cline/handoffs/` 下读写，slug 与当前 branch 一致
  - 跑前先 `git stash` 或备份 `.cline/handoffs/HANDOFF_*_active.md`
  - 根因：handler 内部从 git 推导 projectRoot，无法注入 cwd
  - 根本修复：待 `feat/test-isolation` 分支让 handler 接受可选 cwd 参数

---

## 二、开发期踩坑日志（原 LEARNINGS.md 全量迁移）

> 格式：每条记录包含类型 / 背景 / 问题 / 教训 / 关联规则。
> 重大失误按五问复盘（Q0 系统性 vs 偶然 / Q1 错在哪 / Q2 为什么错 / Q3 现有规则为何没阻止 / Q4 规则调整 / Q5 未来如何更早发现）。

---

### 2024-06-17: MCP Tool 包装 Skill 导致不一致

- **类型**：架构决策 / 错误
- **背景**：将 10 个 superpowers Skill 包装为 MCP Tools
- **问题**：
  1. MCP Handler 返回的是 SKILL.md 的摘要模板文本，与真实内容有偏差
  2. 证据链系统（record_source_read）是在绕路弥补不一致，增加了 2-3 步调用
  3. Cline 原生支持 use_skill，MCP 包装层完全冗余
- **教训**：引入额外架构层前必须验证现有机制是否已支持目标能力
- **关联规则**：宪法三、规范 4

### 2024-06-17: 假设 use_skill 能加载 superpowers Skill

- **类型**：错误
- **背景**：设计迁移方案时假设 superpowers Skill 可通过 use_skill 加载
- **问题**：实际测试发现 superpowers 的 Skill 在 `C:\Users\19936\.claude\skills\` 下，不在 Cline 搜索路径中，`use_skill("brainstorming")` 返回 "Skill not found"
- **教训**：Skill 文件存在 ≠ Cline 能自动发现。必须实测验证
- **来源**：GPT 评审意见
- **关联规则**：宪法一

### 2024-06-17: GitHub 下载的 SKILL.md 可直接使用

- **类型**：社区发现
- **背景**：从 https://github.com/obra/superpowers 下载 SKILL.md 到 `.claude/skills/<name>/`
- **发现**：superpowers 的 SKILL.md 使用 YAML frontmatter（name + description），与 pptx Skill 格式一致，Cline 完美兼容
- **教训**：GitHub 上的原始 Skill 比手动复制的 Handler 代理层更可靠
- **关联规则**：规范 4

### 2024-06-17: workflow-advisor Skill 是冗余的

- **类型**：用户建议
- **背景**：将 MCP workflow_advisor 转换为 Skill
- **问题**：
  1. `.clinerules` 规范 5 已包含相同的关键词匹配 + 调用链
  2. 各 Skill 的 SKILL.md 末尾已包含链式调用指令
  3. workflow-advisor 成为三步调用（规则 → advisor → 实际 Skill）中的冗余中间步
- **教训**：信息不要在三处存在。.clinerules（始终生效）+ Skill 自描述（触发时生效）已足够
- **来源**：用户建议 → 社区搜索验证
- **关联规则**：规范 5

### 2024-06-17: 用户建议的价值

- **类型**：用户建议
- **关键建议**：
  1. 不确定时可以搜索社区方案，为问题解决拓宽思路
  2. 推测必须明确标注 `[未验证]`，不得编造
  3. 架构变更前先做最小验证实验
  4. "分析"关键字不应自动归于 research，先看目标语义
- **教训**：用户/评审者的质疑往往是发现盲点的最好方式

### 2024-06-17: 不确定时搜索社区方案

- **类型**：用户建议
- **发现**：
  1. [cline/skills 仓库](https://github.com/cline/skills) 说明了 Skill 的自动加载机制
  2. [awesome-cline-skills](https://github.com/TheArchitectit/awesome-cline-skills) 说明了 Rules vs Skills 的区别
  3. 社区确认：Rules 始终激活，Skills 按需加载
- **教训**：不确定时优先搜索社区方案，不要闭门造车

### 2024-06-17: 日志机制建立

- **类型**：用户建议
- **目的**：
  1. 记录每次重要错误和纠正
  2. 记录用户的关键建议
  3. 定期回顾 → 完善 .clinerules 规则
  4. 防止重复踩坑
- **机制**：DEV_NOTES.md（原 LEARNINGS.md）+ .clinerules 经验库章节

### 2026-06-17: 选择 better-sqlite3 → 实测后切换到 node:sqlite

- **类型**：架构决策 / 错误 → 修正
- **背景**：实施 memory-keeper / context-compactor MVP，按计划用 better-sqlite3
- **问题**：
  1. 本机 Node v24.15.0 + better-sqlite3@11.10.0 没有匹配的 prebuilt 二进制
  2. 本机没装 Visual Studio C++ Build Tools，源码编译失败（gyp ERR）
  3. PowerShell 执行策略阻止 `npm.ps1`，只能 `npm.cmd`
- **替代假设**：(A) 降版本 (B) 装 VS 编译 (C) 换 sql.js (WASM) (D) 用 Node 22.5+ 内置的 `node:sqlite`
- **实测**：写 probe 脚本验证 → `node:sqlite` 默认启用 FTS5 + bm25 + unicode61 tokenizer，对中文混排可索引
- **决策**：切到 `node:sqlite`，零额外原生编译依赖。代价是 `engines.node` 提到 ≥22.5
- **教训**：
  1. 选依赖前先看 prebuilt 矩阵覆盖的 Node 版本
  2. 宁可加最低 Node 版本要求，也比让用户装 VS Build Tools 友好
  3. 宪法二「问题定义优于方案设计」：先承认计划假设是错的，再列竞争方案选最低复杂度的
- **关联规则**：宪法三

### 2026-06-17: validate-skills.js 不兼容 CRLF

- **类型**：错误
- **背景**：在 Windows 上写新 SKILL.md，校验报"缺少有效 YAML frontmatter"
- **问题**：正则 `/^---\n([\s\S]*?)\n---/` 只匹配 LF 行尾。新建文件被自动转 CRLF（`0d 0a`），匹配失败
- **教训**：跨平台脚本的换行处理必须用 `\r?\n`；`String.split('\n')` 也要换成 `split(/\r?\n/)` 防止把 `\r` 残留在 key 中
- **修复**：单行替换正则即可，不需要全文转换文件

### 2026-06-17: PowerShell 不支持 `&&`（PS 5.1 时代）

- **类型**：错误（已通过切换 PS 7 根治）
- **背景**：执行 `cd dir && cmd` 链式命令
- **教训**：本机默认 PowerShell 5.1 用 `;` 分隔，不支持短路 `&&`
- **现状**：已切到 PS 7（支持 `&&`），此条仅作历史

### 2024-06-17: 方案设计前必须验证问题定义

- **类型**：用户建议
- **背景**：GPT 评审指出 AI 的根本问题不是能力不足，而是"太快相信了第一个看起来合理的解释"
- **问题**：
  1. 想到 Skill 可能不能直接加载 → 立即开始做 MCP 包装层，未验证
  2. 听到"搜索效果不好" → 立即假设缺少搜索规划 → 创建 Skill，未验证
  3. 用户/GPT/自己提出的解释 → 直接认同 → 开始实现
- **教训**：任何问题解释必须先视为「假设」，列出替代解释，收集证据，只有证据充分才能进入设计
- **关联规则**：宪法二

### 2026-06-18: 证据没有时间戳——用"当前快照"否定了"历史推断"

- **类型**：错误（认知模式）
- **背景**：用户反馈"一句 hello 消耗 40k 上下文"，我归因到 playwright MCP server（~15k 工具定义）是元凶。用户随即在后台手动禁用了 playwright。我读取 `cline_mcp_settings.json`，看到 `disabled: true`，立即"自我纠正"：认为之前的归因错了。但实际上原始归因是对的——只是证据状态被用户改变了。

- **Q0（系统性 vs 偶然）**：系统性。任何"调查过程中环境被修改"场景都会触发此问题（用户改文件、并发 agent 改文件、CI 状态变化）

- **Q1（错在哪）**：把"t1 时刻读到的状态"等同于"用户提问时 t0 的状态"。证据正确，时间锚错了，导致结论翻转

- **Q2（为什么错）**：
  1. 没有问"这个状态是从一开始就这样，还是刚被改？"
  2. 看到反证后过度自责（"我违反了宪法一"），把对的归因主动推翻
  3. `disabled: true` 本身没有时间信息，文件系统不暴露"上次修改原因"

- **Q3（现有规则为何没阻止）**：
  - 宪法一要求标注证据来源（实测/源码/文档/推测），但**没要求标注时间**
  - 实测证据被默认是"稳定快照"，没区分"读取瞬间值"和"调查目标时刻值"

- **Q4（规则调整）**：建议在宪法一补充一句："关键证据需注明读取时刻（now / 任务开始时 / 历史推断），当证据可能被会话内事件改变时，必须区分时间窗口。" —— 但权重不高，建议先观察 1-2 次类似场景再决定是否硬性入宪法

- **Q5（未来如何更早发现）**：
  1. 看到反证立刻翻转结论前，先问"原结论是基于什么时刻的证据？现在的证据是什么时刻的？"
  2. 用户在对话中说"我刚改了 X" / "我刚关了 Y" 是高价值信号，应主动询问而非默认环境静止
  3. 调查类任务可在 thinking 中维护一个"证据时间线"，而非只记"证据是什么"

- **关联规则**：宪法一（候选补充）
- **来源**：用户当面纠正"是我刚刚手动关闭了"

### 2026-06-19（已废弃）: PowerShell 兼容性约束 → 切换默认 Shell 根治 ⚠️

> **⚠️ 被后续决策取代**：下面记录的是第一次切到 cmd.exe 的决策，但最后在 2026-06-19（晚）重新切换到 PowerShell 7。此条目仅作历史追踪。

- **类型**：架构决策（已废弃）
- **背景**：`.clinerules` 规范 7 长期累积了 5 条 PowerShell 特定约束，每次新坑就往规范加一条提示词
- **替代方案**：(A) 改默认 Shell 为 cmd / (B) 装 PowerShell 7 / (C) Git Bash
- **决策**：当时选 A（在 settings.json 加 `"terminal.integrated.defaultProfile.windows": "Command Prompt"`）
- **教训**：当一条规范越长越像「绕过指令」时，是切换底层而非加更多绕过的信号
- **后续**：被下一条覆盖（cmd.exe 翻车）

### 2026-06-19（晚）: cmd.exe 切换的事后翻车 — Shell Integration 维度被遗漏

- **类型**：错误（决策维度不全）→ 二次修正
- **背景**：上一条切 cmd.exe 后，重启 VS Code 实测，遇到所有命令"输出无法捕获"——VS Code 弹窗"Shell Integration Unavailable，请用 zsh/bash/fish/PowerShell"
- **问题**：cmd.exe **不在 VS Code 官方支持的 Shell Integration 列表里**。我做决策时只对比了"语法兼容性"和"ExecutionPolicy 阻力"，**完全没考虑 Shell Integration 这一维**

- **Q0（系统性 vs 偶然）**：系统性。任何"工具决策"都要列**完整维度表**，缺一维就可能整体翻车
- **Q1（错在哪）**：决策对比表只有 4 列（语法 / 复杂度 / 稳定性 / 上下文成本），漏了「与 Cline 工具观察周期的兼容性」这一关键维度
- **Q2（为什么错）**：
  1. "shell 切换"这种"基础设施事务"被默认是低风险的——但实际上影响所有后续工具调用
  2. 当时聚焦在「绕过指令」这个文本表象，没退一步问"切换后哪些 Cline 能力会变"
  3. PowerShell 7 在第一轮被否的理由是"还要解决 ExecutionPolicy"，被我评为高代价；实际上一行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 就解决，根本不算阻力

- **Q3（现有规则为何没阻止）**：
  - 宪法二「问题定义优于方案设计」要求列竞争方案，但**没规定方案对比的维度完整性检查**
  - 规范 1 假设 Cline 总能看到命令输出，没规定"如果切换 Shell 影响这个能力，必须先验证"

- **Q4（规则调整）**：宪法二候选补充：「方案对比表必须显式列出『与现有工具链/可观测性的兼容性』维度」
- **Q5（未来如何更早发现）**：
  1. 切 Shell / 切包管理器 / 切运行时这种"底座变更"，对比表至少 5 列：语法 / 性能 / 装机成本 / **可观测性** / **与现有工具链兼容性**
  2. 在 ACT 之前做一次"反向问题"：「如果选了 X，原本 work 的 Y 会不会坏？」

- **修正动作**：
  - 用户授权 `winget install Microsoft.PowerShell` 装 pwsh
  - settings.json profile 改回 `PowerShell 7`
  - .clinerules 规范 7 重写为 PS 7 主路径
  - PowerShell 7 同时满足：`&&` ✅ + Shell Integration ✅ + npm.ps1 直接可用 ✅

- **关联规则**：宪法二、规范 1
- **来源**：用户引用 VS Code 弹窗"Shell Integration Unavailable"

### 2026-06-19（夜）: 终端进入交互式 pager 导致 Cline 卡死无回复

- **类型**：错误（系统性）/ 用户纠正
- **背景**：执行 `git status --short; git log --oneline -20; git branch --show-current`。`git log` 默认进入 `less` 风格 pager，终端停在 `:` 提示符等待按键。Cline 端表现为命令"还在运行"，模型陷入静默等待

- **Q0（系统性 vs 偶然）**：系统性。所有可能进入交互式状态的命令都会触发同类问题：
  - pager 类：`git log` / `git diff` / `git show` / `man` / `less` / `more`
  - 确认提示类：`rm -i` / `npm init`（无 `-y`） / `gh auth login` / `apt install`（无 `-y`）
  - REPL 类：纯 `python` / `node` / `sqlite3`（无脚本参数）
  - 长驻服务类：`npm run dev` / `npm start` / `node server.js`

- **Q1（错在哪）**：链式命令中包含 `git log` 但未加 `--no-pager`
- **Q2（为什么错）**：
  1. 习惯性把 PS 7 + Shell Integration 当作"输出总是可观测"的保证，忽略了**交互式输入**这个独立维度
  2. 链式命令的"原子性"幻觉：以为三个命令会一起完成
  3. 没有事先列"本次命令是否可能进入交互态"的检查

- **Q3（现有规则为何没阻止）**：
  - 规范 1 提到"非交互式优先"原则，但只在 `execute_command` 描述里隐含

- **Q4（规则调整）**：**新增规范 10：命令非交互化检查**。已落地

- **Q5（未来如何更早发现）**：
  1. **失联兜底**：当 Cline 感觉到"终端命令长时间无返回"时，应主动 ask_followup_question
  2. 命令模板预防：`git log` → `git --no-pager log`
  3. 链式命令拆短

- **关联规则**：规范 1、规范 10（已新增）
- **来源**：用户当面纠正

### 2026-06-19（夜·续）: handoff 测试套件污染真实工作树 — 22:50 active 文件神秘消失事件破案

- **类型**：错误（测试设计） / 调查方法论
- **背景**：在会话 22:50:38 跑 `node skills-mcp-server/test-handoff-handlers.js` 后，`.cline/handoffs/HANDOFF_feat-handoff-protocol_active.md` 被删除、archive 目录被创建为空
- **破案路径**：
  1. 直接读 `tools/analyze-recent-tasks.mjs` 输出 → 锁定本会话覆盖 22:50
  2. 写 `tools/inspect-task-window.mjs` 按 ts 提取窗口内全部 ui 消息 → 看到 22:50:38 跑测试 → 22:50:57 environment_details 提示 "Recently Modified Files: handoff_active.md"
  3. 读测试源码 → `path.resolve(__dirname, "..")` + `getCurrentBranch(projectRoot)` + `path.join(projectRoot, ".cline", "handoffs")` —— **测试直接在真实工作目录的 .cline/handoffs/ 下读写**

- **测试做了什么**：用例包括「status=done 触发归档」「归档后 resume 报 NO_HANDOFF」，会真实归档 active 文件、再清归档目录

- **Q0（系统性 vs 偶然）**：系统性。任何"E2E 测试用真实工作目录"的设计都会污染开发者环境
- **Q1（错在哪）**：
  1. 测试设计：handoff_write/handoff_resume handler 内部写死 `getProjectRoot()` 从 git 推导，无法注入 `cwd`
  2. 调查初期：只读了 handler 源码就下结论"代码不会触达 fs"，没检查测试套件本身

- **Q2（为什么错）**：
  1. handler 副作用排除后，潜意识把"代码 = 唯一行为者"等同；忽略了测试也是同一份代码的执行路径
  2. 22:50 事件的反向推理"从删除时间倒推执行了什么"没做——直接靠会话日志才破案

- **Q3（现有规则为何没阻止）**：
  - 没有规则规定"E2E 测试不得污染真实工作树"
  - 调查方法上，宪法二要求列竞争假设，但我只列了 5 个候选都聚焦在"handler 自己删"，没列"测试套件"作为独立假设源

- **Q4（规则调整）**：
  1. **测试规范候选**：所有写文件的测试必须用 `os.tmpdir()` 或 `mkdtempSync` — **新功能，单独 feat/test-isolation 分支处理**
  2. **调查方法论补充**：根因调查的假设池必须包含"非业务代码路径"——测试、CI 脚本、git hook、IDE 自动保存等

- **Q5（未来如何更早发现）**：
  1. 写测试时强制问"如果开发者跑这个测试 100 次，工作树会变什么样？"
  2. 调查"文件被删"类问题，先查"文件被谁打开 / 谁有写权限的进程清单"
  3. 看到测试输出有"工作目录：<真实路径>"字样，应立即停下来质疑测试隔离性

- **关联规则**：测试规范（候选新增）、宪法二（候选补充）

### 2026-06-19（夜·副产品）: 用户提示「对话时间戳追溯」需求

- **类型**：用户建议（产品方向，非本会话实施）
- **背景**：调查 22:50 事件用户提出"如果每条对话都有时间记录的话就好追溯了"
- **现状评估**：
  1. **Cline 已经给每条 ui 消息打了 ts**（毫秒时间戳）—— `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\tasks\<task-id>\ui_messages.json` 中每条消息都有 `ts` 字段
  2. 已有 `tools/analyze-recent-tasks.mjs`（task 级别汇总）和 `tools/inspect-task-window.mjs`（消息级别窗口提取）
  3. 这两个工具已经能做"按时间窗口回溯具体动作"的查询

- **真正缺的东西**：
  1. **约定**：什么时候需要追溯？→ 应作为 Skill 沉淀（`session-archaeology`）
  2. **零上下文成本**：上述脚本只读 `ui_messages.json`，已经满足
  3. **隐私边界**：消息内容含敏感信息，追溯工具应该提供"仅元数据/含工具调用/含完整内容"三档过滤

- **建议产物（未来单独会话实施）**：
  1. 把 `tools/analyze-recent-tasks.mjs` + `tools/inspect-task-window.mjs` 收编为 `tools/session-archaeology/`
  2. 写 `skills/session-archaeology/SKILL.md`
  3. 不强制后台运行——按需调用即可

- **来源**：用户当面提议

---

## 三、本文件维护原则

- 新增条目时，按时间倒序追加在「踩坑日志」段落顶部
- 通用经验（不绑本机/本项目）应提炼到 `.clinerules` 操作规范，不留在这里
- 重大失误必须按五问复盘格式
- 偶然事件记录即可，不用补规则；系统性问题才调整规则
- 当某条本机环境约束已被根治（如 PS 5.1 不支持 `&&` 已被切 PS 7 解决），保留作为历史，并标注「已废弃」或「现状」