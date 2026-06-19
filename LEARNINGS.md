# 项目经验教训日志

> 记录每次重要决策、错误、用户纠正和建议。定期回顾以完善 .clinerules 规则。

---

## 格式说明

每条记录包含：

```
### YYYY-MM-DD: 简短标题

- **类型**：错误 / 用户纠正 / 用户建议 / 社区发现 / 架构决策
- **背景**：当时在做什么
- **问题**：出了什么问题
- **教训**：应该怎么做
- **来源**：谁提出的 / 从哪里学到的
- **关联规则**：影响到的 .clinerules 规则编号
```

---

## 日志

### 2024-06-17: MCP Tool 包装 Skill 导致不一致

- **类型**：架构决策 / 错误
- **背景**：将 10 个 superpowers Skill 包装为 MCP Tools
- **问题**：
  1. MCP Handler 返回的是 SKILL.md 的摘要模板文本，与真实内容有偏差
  2. 证据链系统（record_source_read）是在绕路弥补不一致，增加了 2-3 步调用
  3. Cline 原生支持 use_skill，MCP 包装层完全冗余
- **教训**：引入额外架构层前必须验证现有机制是否已支持目标能力
- **关联规则**：规则八、规则九

### 2024-06-17: 假设 use_skill 能加载 superpowers Skill

- **类型**：错误
- **背景**：设计迁移方案时假设 superpowers Skill 可通过 use_skill 加载
- **问题**：实际测试发现 superpowers 的 Skill 在 `C:\Users\19936\.claude\skills\` 下，不在 Cline 搜索路径中，`use_skill("brainstorming")` 返回 "Skill not found"
- **教训**：Skill 文件存在 ≠ Cline 能自动发现。必须实测验证
- **来源**：GPT 评审意见
- **关联规则**：规则八

### 2024-06-17: GitHub 下载的 SKILL.md 可直接使用

- **类型**：社区发现
- **背景**：从 https://github.com/obra/superpowers 下载 SKILL.md 到 `.claude/skills/<name>/`
- **发现**：superpowers 的 SKILL.md 使用 YAML frontmatter（name + description），与 pptx Skill 格式一致，Cline 完美兼容
- **教训**：GitHub 上的原始 Skill 比手动复制的 Handler 代理层更可靠
- **关联规则**：规则五

### 2024-06-17: workflow-advisor Skill 是冗余的

- **类型**：用户建议
- **背景**：将 MCP workflow_advisor 转换为 Skill
- **问题**：
  1. `.clinerules` 规则六已包含相同的关键词匹配 + 调用链
  2. 各 Skill 的 SKILL.md 末尾已包含链式调用指令
  3. workflow-advisor 成为三步调用（规则 → advisor → 实际 Skill）中的冗余中间步
- **教训**：信息不要在三处存在。.clinerules（始终生效）+ Skill 自描述（触发时生效）已足够
- **来源**：用户建议 → 社区搜索验证
- **关联规则**：规则六

### 2024-06-17: 用户建议的价值

- **类型**：用户建议
- **背景**：GPT 对迁移方案的评审意见
- **关键建议**：
  1. 不确定时可以搜索社区方案，为问题解决拓宽思路
  2. 推测必须明确标注 `[未验证]`，不得编造
  3. 架构变更前先做最小验证实验
  4. "分析"关键字不应自动归于 research，先看目标语义
- **教训**：用户/评审者的质疑往往是发现盲点的最好方式
- **关联规则**：规则八、规则九、规则六

### 2024-06-17: 不确定时搜索社区方案

- **类型**：用户建议
- **背景**：用户要求搜索 Cline 社区中 Skill 调度方案
- **发现**：
  1. [cline/skills 仓库](https://github.com/cline/skills) 说明了 Skill 的自动加载机制
  2. [awesome-cline-skills](https://github.com/TheArchitectit/awesome-cline-skills) 说明了 Rules vs Skills 的区别
  3. 社区确认：Rules 始终激活，Skills 按需加载
- **教训**：不确定时优先搜索社区方案，不要闭门造车
- **关联规则**：规则十

### 2024-06-17: 日志机制建立

- **类型**：用户建议
- **背景**：用户要求建立经验教训日志
- **目的**：
  1. 记录每次重要错误和纠正
  2. 记录用户的关键建议
  3. 定期回顾 → 完善 .clinerules 规则
  4. 防止重复踩坑
- **机制**：LEARNINGS.md + .clinerules 规则十
- **关联规则**：规则十

### 2026-06-17: 选择 better-sqlite3 → 实测后切换到 node:sqlite

- **类型**：架构决策 / 错误 → 修正
- **背景**：实施 memory-keeper / context-compactor MVP，按计划用 better-sqlite3
- **问题**：
  1. 本机 Node v24.15.0 + better-sqlite3@11.10.0 没有匹配的 prebuilt 二进制
  2. 本机没装 Visual Studio C++ Build Tools，源码编译失败（gyp ERR）
  3. PowerShell 执行策略阻止 `npm.ps1`，只能 `npm.cmd`
- **替代假设**：(A) 降版本 (B) 装 VS 编译 (C) 换 sql.js (WASM) (D) 用 Node 22.5+ 内置的 `node:sqlite`
- **实测**：写 probe 脚本验证 → `node:sqlite` 默认启用 FTS5 + bm25 + unicode61 tokenizer，对中文混排可索引
- **决策**：切到 `node:sqlite`，零额外原生编译依赖（无 node-gyp、无 better-sqlite3 二进制）。代价是 `engines.node` 提到 ≥22.5
- **教训**：
  1. 选依赖前先看 prebuilt 矩阵覆盖的 Node 版本
  2. 宁可加最低 Node 版本要求，也比让用户装 VS Build Tools 友好
  3. 宪法二「问题定义优于方案设计」：先承认计划假设是错的，再列竞争方案选最低复杂度的
- **关联规则**：宪法三、规则七

### 2026-06-17: validate-skills.js 不兼容 CRLF

- **类型**：错误
- **背景**：在 Windows 上写新 SKILL.md，校验报"缺少有效 YAML frontmatter"
- **问题**：正则 `/^---\n([\s\S]*?)\n---/` 只匹配 LF 行尾。新建文件被自动转 CRLF（`0d 0a`），匹配失败
- **教训**：跨平台脚本的换行处理必须用 `\r?\n`；`String.split('\n')` 也要换成 `split(/\r?\n/)` 防止把 `\r` 残留在 key 中
- **修复**：单行替换正则即可，不需要全文转换文件
- **关联规则**：规则七

### 2026-06-17: PowerShell 不支持 `&&`

- **类型**：错误（重复触发）
- **背景**：执行 `cd dir && cmd` 链式命令
- **教训**：本机默认 PowerShell 5.1 用 `;` 分隔（顺序执行，与 bash `;` 一致），不支持短路 `&&`
- **关联规则**：规则七（已记录在 .clinerules）

### 2024-06-17: 规则十二——方案设计前必须验证问题定义

- **类型**：用户建议
- **背景**：GPT 评审指出 AI 的根本问题不是能力不足，而是"太快相信了第一个看起来合理的解释"
- **问题**：
  1. 想到 Skill 可能不能直接加载 → 立即开始做 MCP 包装层，未验证
  2. 听到"搜索效果不好" → 立即假设缺少搜索规划 → 创建 Skill，未验证
  3. 用户/GPT/自己提出的解释 → 直接认同 → 开始实现
- **教训**：任何问题解释必须先视为「假设」，列出替代解释，收集证据，只有证据充分才能进入设计
- **关联规则**：规则十二

### 2026-06-18: 证据没有时间戳——用"当前快照"否定了"历史推断"

- **类型**：错误（认知模式）
- **背景**：用户反馈"一句 hello 消耗 40k 上下文"，我归因到 playwright MCP server（~15k 工具定义）是元凶。用户随即在后台手动禁用了 playwright。我读取 `cline_mcp_settings.json`，看到 `disabled: true`，立即"自我纠正"：认为之前的归因错了，写了一段诚恳的"我违反宪法一"的复盘。但实际上原始归因是对的——只是证据状态被用户改变了。

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

> **⚠️ 被后续决策取代**：下面记录的是第一次切到 cmd.exe 的决策，但最后在 2026-06-19（晚）重新切换到 PowerShell 7。此条目仅作历史追踪，不作为当前实践依据。详见下面的折返复盘。

- **类型**：架构决策（已废弃 skip）
- **背景**：`.clinerules` 规范 7 长期累积了 5 条 PowerShell 特定约束（`&&` → `;`、`.ps1` UTF-8 BOM、`npm.ps1` ExecutionPolicy → `npm.cmd`、`$env:VAR` vs `%VAR%`、`-ExecutionPolicy Bypass`），每次新坑就往规范加一条提示词，但根因没解决——本机 VS Code 集成终端默认是 PowerShell 5.1
- **问题**：用户反馈"修复 PowerShell 问题以减少提示词约束"
- **替代方案**：
  - (A) 改 VS Code `terminal.integrated.defaultProfile.windows` 为 `Command Prompt`——零侵入、可逆
  - (B) 装 PowerShell 7：仍要解决 ExecutionPolicy
  - (C) Git Bash：路径风格混合引入新问题
- **决策**：选 A。在 `%APPDATA%\Code\User\settings.json` 加 `"terminal.integrated.defaultProfile.windows": "Command Prompt"`。同步精简 `.clinerules` 规范 7：cmd.exe 为主，PowerShell 退化为「显式启动 PS 终端时」的兜底说明
- **教训**：
  1. 当一条规范越长越像「绕过指令」时，是切换底层而非加更多绕过的信号
  2. 治本永远比治标省 token——5 条 PS 兼容提示 → 4 行 cmd 主路径 + 3 行 PS 兜底
  3. 用户级 settings.json 改动可逆（已备份 `settings.json.bak-20260619`），是低风险高收益的"基础设施修复"
- **关联规则**：规范 7（已重写）
- **生效条件**：VS Code 重启后新开终端生效；当前会话的 PS 终端继续保留直到关闭

### 2026-06-19（晚）: cmd.exe 切换的事后翻车 — Shell Integration 维度被遗漏

- **类型**：错误（决策维度不全）→ 二次修正
- **背景**：上一条 LEARNINGS 决定切 cmd.exe 后，重启 VS Code 实测，遇到所有命令"输出无法捕获"——VS Code 弹窗：「Shell Integration Unavailable，请用 zsh/bash/fish/PowerShell」
- **问题**：cmd.exe **不在 VS Code 官方支持的 Shell Integration 列表里**。我做决策时只对比了「语法兼容性」和「ExecutionPolicy 阻力」，**完全没考虑 Shell Integration 这一维**——而 Shell Integration 是 Cline 命令观察周期（规范 1）的前提

- **Q0（系统性 vs 偶然）**：系统性。任何"工具决策"都要列**完整维度表**，缺一维就可能整体翻车。本次缺的是"工具运行时可观测性"

- **Q1（错在哪）**：决策对比表只有 4 列（语法 / 复杂度 / 稳定性 / 上下文成本），漏了「与 Cline 工具观察周期的兼容性」这一关键维度

- **Q2（为什么错）**：
  1. 「shell 切换」这种"基础设施事务"被默认是低风险的——但实际上影响所有后续工具调用
  2. 当时聚焦在「绕过指令」这个文本表象，没退一步问"切换后哪些 Cline 能力会变"
  3. PowerShell 7 在第一轮被否的理由是"还要解决 ExecutionPolicy"，被我评为高代价；实际上一行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 就解决，根本不算阻力。**我误判了选项 B 的代价**

- **Q3（现有规则为何没阻止）**：
  - 宪法二「问题定义优于方案设计」要求列竞争方案，但**没规定方案对比的维度完整性检查**
  - 规范 1「工具调用观察周期」假设 Cline 总能看到命令输出——但没规定"如果切换 Shell 影响这个能力，必须先验证"

- **Q4（规则调整）**：建议在宪法二补充：「方案对比表必须显式列出『与现有工具链/可观测性的兼容性』维度，否则视为维度不全」。但权重不高，先观察 1-2 次。

- **Q5（未来如何更早发现）**：
  1. 切 Shell / 切包管理器 / 切运行时这种"底座变更"，对比表至少 5 列：语法 / 性能 / 装机成本 / **可观测性（输出/调试/日志）** / **与现有工具链兼容性**
  2. 在 ACT 之前做一次"反向问题"：「如果选了 X，原本 work 的 Y 会不会坏？」
  3. 「装机成本」要按"用户实际操作步骤"算，而不是凭印象——`Set-ExecutionPolicy` 一行命令 vs 我当时印象中的"复杂"

- **修正动作**：
  - 用户授权 `winget install Microsoft.PowerShell` 装 pwsh
  - settings.json profile 改回 `PowerShell 7` + 显式路径 `C:/Program Files/PowerShell/7/pwsh.exe`
  - .clinerules 规范 7 重写为 PS 7 主路径，cmd / PS 5.1 退化为兜底
  - PowerShell 7 同时满足：`&&` 语法 ✅ + Shell Integration ✅ + npm.ps1 直接可用 ✅（一次性 RemoteSigned）

- **关联规则**：宪法二（候选补充：维度完整性检查）、规范 7（已二次重写）
- **来源**：用户引用 VS Code 弹窗"Shell Integration Unavailable"

### 2026-06-19（夜）: 终端进入交互式 pager 导致 Cline 卡死无回复

- **类型**：错误（系统性）/ 用户纠正
- **背景**：执行 `git status --short; git log --oneline -20; git branch --show-current` 探索工程状态。`git log` 默认会进入 `less` 风格 pager，终端停在 `:` 提示符等待按键。Cline 端表现为命令"还在运行"，模型陷入静默等待

- **Q0（系统性 vs 偶然）**：系统性。所有可能进入交互式状态的命令都会触发同类问题：
  - pager 类：`git log` / `git diff` / `git show` / `man` / `less` / `more`
  - 确认提示类：`rm -i` / `npm init`（无 `-y`） / `gh auth login` / `apt install`（无 `-y`）
  - REPL 类：纯 `python` / `node` / `sqlite3`（无脚本参数）
  - 长驻服务类：`npm run dev` / `npm start` / `node server.js`（不带超时/后台）

- **Q1（错在哪）**：链式命令中包含 `git log` 但未加 `--no-pager`，也未设 `GIT_PAGER=cat`。我"知道这事"但没在第一时间防御性加上

- **Q2（为什么错）**：
  1. 习惯性把 PowerShell 7 + Shell Integration 当作"输出总是可观测"的保证，忽略了**交互式输入**这个独立维度
  2. 链式命令的"原子性"幻觉：以为三个命令会一起完成，实际上中间命令阻塞会让后续命令永不执行
  3. 没有事先列"本次命令是否可能进入交互态"的检查

- **Q3（现有规则为何没阻止）**：
  - 规范 1 提到"非交互式优先"原则，但只在 `execute_command` 描述里隐含，**没作为强制检查项放进规范**
  - 没有显式的"交互式陷阱清单"（pager / 确认 / REPL / 长驻）

- **Q4（规则调整）**：建议**新增规范 10：命令非交互化检查**。在 `execute_command` 之前必须自检：
  1. 是否进 pager？→ git 系列加 `--no-pager`，或 `| cat`，或设 `GIT_PAGER=cat`
  2. 是否有交互确认？→ 加 `-y` / `--yes` / `--force`（在用户授权前提下）
  3. 是否是 REPL？→ 必须带脚本/参数，禁止裸调
  4. 是否长驻？→ 显式说明"长驻服务"并在用户确认前不直接 `execute_command`，或用后台模式
  
  这条规则权重高，应直接进入操作规范，不是候选

- **Q5（未来如何更早发现）**：
  1. **失联兜底**：当 Cline 感觉到"终端命令长时间无返回"时，应主动 `ask_followup_question` 询问用户终端状态（如本次用户反馈），而不是默默等待
  2. 命令模板预防：`git log` → `git --no-pager log`；`git diff` → `git --no-pager diff`；这是肌肉记忆级别的改写
  3. 链式命令拆短：`A; B; C` 中只要有一个可能交互，就拆成多次 `execute_command`，每次观察一个

- **修正动作**：
  1. 已在本次会话中改用 `git --no-pager` 调用
  2. 待办：把"非交互化检查"补入 `.clinerules` 规范 10
  3. 待办：在规范 1 "工具调用观察周期"中显式声明"交互态等同于阻塞"

- **关联规则**：规范 1（候选补充）、规范 10（新增）
- **来源**：用户当面纠正"这种问题记录一下，终端需要交互以及其他无故导致模型没有回复的情况需要处理"

### 2026-06-19（夜·续）: handoff 测试套件污染真实工作树 — 22:50 active 文件神秘消失事件破案

- **类型**：错误（测试设计） / 调查方法论
- **背景**：在本会话 22:50:38 跑 `node skills-mcp-server/test-handoff-handlers.js` 后，`.cline/handoffs/HANDOFF_feat-handoff-protocol_active.md` 被删除、archive 目录被创建为空。git 显示 `deleted:`，但 handler 代码的 GOAL_REQUIRED 分支根本不会触达 fs 操作 — 看似无解
- **破案路径**：
  1. 直接读 `tools/analyze-recent-tasks.mjs` 输出 → 锁定本会话覆盖 22:50（首条消息 22:45:06）
  2. 写 `tools/inspect-task-window.mjs` 按 ts 提取窗口内全部 ui 消息 → 看到 22:50:38 跑测试 → 22:50:57 environment_details 提示 "Recently Modified Files: handoff_active.md"
  3. 读测试源码 → `const projectRoot = path.resolve(__dirname, "..")` + `getCurrentBranch(projectRoot)` + `path.join(projectRoot, ".cline", "handoffs")` —— **测试直接在真实工作目录的 .cline/handoffs/ 下读写，slug 与当前 branch 一致 = 真实 active 文件**

- **测试做了什么**：用例包括「status=done 触发归档」「归档后 resume 报 NO_HANDOFF」，会真实归档 active 文件、再清归档目录。每次 `node test-handoff-handlers.js` 都会把人类用户当前的 active handoff 移走。
  - 19 个测试中至少 4 个直接动 active 槽位
  - 测试结尾没有恢复原 active 文件（清空了 archive，但 active 也没回来）

- **Q0（系统性 vs 偶然）**：系统性。任何"E2E 测试用真实工作目录"的设计都会污染开发者环境。本仓另外几个测试（lib / memory / project-hash / escape-fts）都用 `os.tmpdir()` 或 `mkdtempSync`，**唯独 handoff-handlers 用真实目录** —— 是孤立设计错误

- **Q1（错在哪）**：
  1. 测试设计：handoff_write/handoff_resume handler 内部写死 `getProjectRoot()` 从 git 推导，无法注入 `cwd`，只能让测试 `process.chdir()` 到临时目录或在真目录跑。作者选了后者
  2. 调查初期：只读了 handler 源码就下结论"代码不会触达 fs"，没检查测试套件本身。**应该把"测试副作用"列入假设池**

- **Q2（为什么错）**：
  1. handler 副作用排除后，潜意识把"代码 = 唯一行为者"等同；忽略了测试也是同一份代码的执行路径
  2. 22:50 事件的反向推理"从删除时间倒推执行了什么"没做——直接靠会话日志才破案，过于绕远
  3. 测试输出里其实就有线索：「工作目录：E:\vscode for claude」，但当时被滚屏冲掉，没引起警觉

- **Q3（现有规则为何没阻止）**：
  - 没有规则规定"E2E 测试不得污染真实工作树"，是项目工程惯例缺失
  - 调查方法上，宪法二要求列竞争假设，但我只列了 5 个候选都聚焦在"handler 自己删"，没列"测试套件"作为独立假设源

- **Q4（规则调整）**：
  1. **测试规范候选**：所有写文件的测试必须用 `os.tmpdir()` 或 `mkdtempSync`，禁止动真实工作树。修复方法：让 handoff handler 接受可选 `cwd` 参数，测试传临时目录 — **新功能，单独 feat/test-isolation 分支处理，不在本会话范围**
  2. **调查方法论补充**：根因调查的假设池必须包含"非业务代码路径"——测试、CI 脚本、git hook、IDE 自动保存、文件系统监听器、备份工具 等，至少列 1-2 个

- **Q5（未来如何更早发现）**：
  1. 写测试时强制问"如果开发者跑这个测试 100 次，工作树会变什么样？" 答"什么都不变"才及格
  2. 调查"文件被删"类问题，先查"文件被谁打开 / 谁有写权限的进程清单"——本机 Windows 可用 `handle.exe`（SysInternals）或 PowerShell `Get-Process | ?{$_.Modules ...}`
  3. 看到测试输出有 "工作目录：<真实路径>" 字样，应立即停下来质疑测试隔离性

- **关联规则**：测试规范（候选新增）、宪法二（候选补充：调查时假设池要含"非业务路径"）
- **来源**：用户反馈"我查一下那时候的会话发生了什么就行了" → 自查会话日志破案

### 2026-06-19（夜·副产品）: 用户提示「对话时间戳追溯」需求 — 已有 ts 字段，缺约定与查询工具

- **类型**：用户建议（产品方向，非本会话实施）
- **背景**：调查 22:50 事件用户提出"如果每条对话都有时间记录的话就好追溯了，考虑给每个对话打上时间戳，同时这个机制要在后台静默运行，不刻意占用上下文"

- **现状评估**（基于本次破案过程的实测）：
  1. **Cline 已经给每条 ui 消息打了 ts**（毫秒时间戳）—— `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\tasks\<task-id>\ui_messages.json` 中每条消息都有 `ts` 字段
  2. 已有 `tools/analyze-recent-tasks.mjs`（task 级别汇总）和本会话新写的 `tools/inspect-task-window.mjs`（消息级别窗口提取）
  3. 这两个工具已经能做"按时间窗口回溯具体动作"的查询，**机制层面无需新增**

- **真正缺的东西**：
  1. **约定**：什么时候需要追溯？（debug 时序问题、复盘 bug、查环境变更）→ 应作为 Skill 沉淀（`session-archaeology` 之类）
  2. **零上下文成本**：上述脚本只读 `ui_messages.json`（项目外，不增加上下文）；输出可重定向到文件而非主对话流。这部分**已经满足**用户"后台静默不占用上下文"要求
  3. **隐私边界**：消息内容含敏感信息（路径、token、用户输入），追溯工具应该提供"仅元数据/含工具调用/含完整内容"三档过滤

- **建议产物（未来单独会话实施）**：
  1. 把 `tools/analyze-recent-tasks.mjs` + `tools/inspect-task-window.mjs` 收编为 `tools/session-archaeology/`
  2. 写 `skills/session-archaeology/SKILL.md`（触发场景：「查上次 X 时序」「定位某个文件被谁改」）
  3. 不强制后台运行——按需调用即可，避免增加任何被动开销

- **关联规则**：暂无（产品方向，非规则）
- **来源**：用户当面提议
