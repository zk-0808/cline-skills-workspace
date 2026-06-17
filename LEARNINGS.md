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
- **决策**：切到 `node:sqlite`，零 native 依赖、零编译。代价是 `engines.node` 提到 ≥22.5
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
