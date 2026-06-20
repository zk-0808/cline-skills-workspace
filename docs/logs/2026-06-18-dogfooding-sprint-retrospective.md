# Dogfooding Sprint Retrospective · 2026-06-18 → 06-21（3 天）

> **状态**：Sprint Day 2 写（实际工作推进比预期快，14 天缩短为 3 天，2026-06-21 收尾）
> **上层锚点**：[dogfooding-sprint.md](2026-06-18-dogfooding-sprint.md) §6 Sprint 收尾产出要求
> **目的**：在记忆还热的时候沉淀 Sprint 期内的全部决策、教训、踩坑——比代码本身更值钱

---

## 0. 阅读建议

- 找答案 → 直接看 §1（Q1/Q2/Q3）
- 找决策依据 → §3（关键决策档案）
- 找复用经验 → §5（教训）
- 找未完成的事 → §6（Sprint 后路线）

---

## 1. Sprint 三大问题的明确答复

> 问题来自 `dogfooding-sprint.md §1`。本节 = Sprint 价值的核心交付。

### Q1：handoff 会不会被持续使用？

**答：会。3 天内完成 4 次完整 write/resume 循环，每次都不是为了演示而是为了真实记录。**

**证据**：
- `2026-06-18`：会话首日（评估 agentic-development-workflow） → write
- `2026-06-18 晚`：external-review §6 落实 → write + resume
- `2026-06-19 早`：cmd 切换 → write
- `2026-06-19 中-晚`：pwsh 折返 + D2 + D1 + 评审反馈 → write + resume
- `2026-06-19 写本文前`：再次 write

**但出现 1 次"懒得用"信号**：
- 在 retro 写作过程中，曾有念头"这次手写就够了，不必 handoff_write"
- 自我纠正：本次 retro 跨会话，**必须 write 才能让下一会话恢复**

**推论**：
- ✅ Sprint 期间高频使用 → 工具不是"装饰"，是 daily driver
- ⚠️ "懒得写"诱惑只在**单会话内能完成的小任务**出现 → schema §2 已经给出"单条 quick fix 不强制"的例外，正确

### Q2：handoff 字段对不对？

**答：8 个字段全部用过，无明显冗余；但 `goal` 的"首次必填"边界有 bug。**

**字段使用频率**（基于 4 次 write）：

| 字段 | 4 次都用 | 用过 | 从未用 | 备注 |
|---|---|---|---|---|
| `status` | ✅ | | | 全是 active |
| `branch` | ✅ | | | server 自动填 |
| `goal` | ✅ | | | 见下面 Bug |
| `next_action` | ✅ | | | 强制要求合理 |
| `do_not` | ✅ | | | **Sprint 中价值最高字段**——见下方 |
| `completed` | ✅ | | | 累积式 |
| `artifacts` | ✅ | | | 持续追加 |
| `in_progress` | | | ✅ | 4 次都为空 |
| `blocked_by` | | | ✅ | 4 次都为空（Sprint 顺利） |

**关键发现**：

1. **`do_not` 是差异化最强的字段** —— Sprint 期间累积到 8 项，每条都阻止过具体的漂移倾向。最有用的 3 条：
   - "不要切换默认 Shell 为 cmd.exe（缺 Shell Integration）" — 阻止了今晚再次试错
   - "不要替换 getProjectHash 为 getProjectHashByGitUrl（会让现有 26+ memory 看似消失）" — 阻止了"让设计更干净"的诱惑
   - "不要把 install.mjs 改回 .js" — 阻止了 30 秒后又触碰
2. **`in_progress` / `blocked_by` 是空字段候选** —— 但**不要急着删**，3 天数据不足以否定它们；blocked 在真实长任务中才会出现
3. **`completed` 累积式很重要** —— 不是"本次完成"而是"截至现在累积完成"，新会话恢复时一眼看清整体进度

**🐛 Bug：goal 在更新时仍被要求**（见 dogfooding-log 06-18 晚）：

写本文前最后一次 `handoff_write` 也踩到了：明明同会话刚 resume 过，update 时仍报 `GOAL_REQUIRED_ON_FIRST_WRITE`。

**两种假设**：
- A：handler "合并旧值" 探测路径 bug
- B：schema 设计本身边界不清

**Sprint 后必修。** 这是第一条**靠真实使用而非测试覆盖暴露的**问题。

### Q3：memory 和 handoff 是否重叠？

**答：边界清晰，3 天 0 次犹豫。**

**Sprint 期间记忆沉淀分布**：

| 类型 | 数量 | 例子 | 归属判定 |
|---|---|---|---|
| 跨会话长期事实（procedural / semantic） | 4 条新增（#25-28） | "本机 Shell 是 PS 7"、"Unblock-File 解决 npm.ps1" | 100% memory |
| 当前任务状态（goal / next_action / do_not） | 4 次 write | "Sprint 完成什么"、"下一步合并 main" | 100% handoff |
| **混淆边缘情况** | **0 次** | — | **从未犹豫** |

**结论**：三层模型（memory / handoff / compact）的职责切分**在真实使用中成立**。情况 A（理想）：每次都很清楚归属。

**反例验证**：
- "今天用户决定 Sprint 缩短到 3 天" → handoff（任务状态）✅
- "winget install 装 PowerShell 7 后 npm.ps1 仍被 RemoteSigned 拦截，需 Unblock-File" → memory #28（procedural，跨会话教训）✅
- 边界清晰得**反直觉**——之前担心的"重叠"是设计阶段的过虑

---

## 2. 被反复使用 vs 仅设计时显得重要

> 问题来自 `dogfooding-sprint.md §6 收尾产出第 2 项`。

### 高使用率（保留 + 加强）

| 组件 | 使用次数 | 价值 |
|---|---|---|
| `handoff_write` | 4 次 | 跨会话连续性核心 |
| `handoff_resume` | 4 次 | 同上 |
| `memory_commit` | 4 次新条目 | 长期事实沉淀 |
| `memory_recall` | 多次（开局 + 调试） | 找过去决策依据 |
| `memory_list` | 2 次（删过时偏好） | memory 维护必要 |
| `.clinerules` 规范 1 / 7 | 持续生效 | 没有它就会再切错 Shell |
| LEARNINGS Q0-Q5 框架 | 2 次复盘 | 第二次（pwsh 折返）质量高于第一次 |

### 中使用率（保留但观察）

| 组件 | 状态 | 备注 |
|---|---|---|
| `handoff_validate` | 未使用 | 设计期产物；CI 友好；保留 |
| 规范 5（工作流自动判断） | 隐式触发 | bugfix/refactor 走 systematic-debugging 等链 |
| 规范 8（搜索深度自适应） | 1 次主动询问 | "BM25 够用吗" → 走 search-orchestrator 路径 |

### 低使用率（候选 review）

| 组件 | 状态 | Sprint 后决策 |
|---|---|---|
| `compact_context` | **未触发** | 单次会话规模可控；保留——长任务才会暴露价值 |
| `in_progress` / `blocked_by` 字段 | 4 次都为空 | 保留——3 天数据不足以删 |
| `agentic-development-workflow/` | Day 1 已归档 | 已处理 ✅ |

### 复盘 Q0-Q5 框架的"过用"

第一条（cmd 切换）的 Q0-Q5 偏机械——本质是基础设施决策，不是认知错误。**第二条（pwsh 折返）的 Q0-Q5 才是真正高价值——揭示了"决策维度遗漏"这种系统性认知问题。**

**教训**：Q0-Q5 不是"复盘模板"，是"系统性问题诊断仪"。判定标准 = **Q0 的答案是不是"系统性"**，不是。如果 Q0 答案是"偶然 / 一次性优化"，就不要硬套 Q0-Q5，写四段式即可。

**已处理**：第一条已标记 `已废弃 / superseded`，避免读历史的人误以为 cmd 是最终方案。

---

## 3. 关键决策档案（按时间序）

> 给一个月后的自己看。**代码未来还能看懂，"为什么这样做"会迅速遗失。**

### D-01 · 2026-06-18：Dogfooding Sprint 启动 + 14 天冻结期

- **背景**：P0 完成、外部评审输出大量 P1/P2 建议
- **诱惑**：立刻继续做 P1（让进度条更长）
- **决策**：14 天 Sprint 期内**只验证不扩展**，全部 P1 押后到 retro
- **依据**：GPT 评审"现在最有价值的不是再写代码，是验证 3 个问题"
- **结果**：成立——dogfooding 暴露了 1 个真 bug（goal 边界），单测覆盖不到

### D-02 · 2026-06-18：归档 agentic-development-workflow

- **背景**：旧目录与 .clinerules 规范 5 重叠 ~60%，且 workflow_advisor 未实现
- **决策**：归档到 `archive/`，不删
- **依据**：宪法三 — 现有机制（规范 5 + 各 SKILL.md 末尾链式调用）已满足
- **结果**：减 ~300-450 token / 会话；功能不受影响

### D-03 · 2026-06-18：external-review §6 全部 6 项落实

- 措辞改口径、escapeFts 重写、PRAGMA busy_timeout、原子写复核、handler eager import、engines 字段
- **结果**：109 → 132 测试全绿；为后续评审打下基础

### D-04 · 2026-06-19 早：Sprint 14 天 → 3 天

- **背景**：实际工作推进比预期快
- **诱惑**：保持 14 天显得"严谨"
- **决策**：缩短到 3 天，提前进入 retro + Sprint 后 P1
- **依据**：sprint.md §0 已留口子"可提前中止条件"——Q1/Q2/Q3 已得到清晰答案
- **结果**：本文（你正在读）

### D-05 · 2026-06-19 早：默认 Shell cmd.exe → 6 小时后回 PowerShell 7（折返）

- **第一次决策**：切 cmd（满足语法 + 装机成本 0）
- **重启实测**：cmd **不在 VS Code Shell Integration 列表**，命令输出全丢
- **第二次决策**：winget 装 pwsh 7 + ExecutionPolicy + Unblock-File
- **教训**：决策维度漏了"可观测性"。已写入 LEARNINGS Q0-Q5 + 规范 1 抽象化预检条款 + 规范 9（workflow 不绕过确认）

### D-06 · 2026-06-19 中：getProjectHashByGitUrl 不替代 getProjectHash

- **诱惑**：直接替换，让设计更干净
- **决策**：新增独立函数，旧 `getProjectHash` 不动
- **依据**：现有 26 条 memory + active handoff 都依赖旧 hash；切换会让数据"看似消失"
- **结果**：23 单测，跨设备问题留给未来 P1.3 memory_export/import

### D-07 · 2026-06-19 下：install.mjs 不强制写入用户文件

- **GPT 评审 P0**：JSON 损坏静默覆盖 → 修复为"区分 missing / corrupted / valid"，损坏时报错停止
- **依据**：用户文件 = 不可逆；任何"安静覆盖"都是反模式

### D-08 · 2026-06-19 晚：normalizeRemoteUrl 扩展（GPT 评审 P1）

- 加 `ssh://` / `git://` / userinfo / query/fragment / 只 lower host
- **依据**：评审指出企业仓库、CI token URL 等真实场景
- **结果**：23 → 28 单测

### D-09 · 2026-06-19 晚：规范变动（评审反馈）

- 规范 1 "Shell Integration" 抽象为 "可观测性"
- 删除规范 8 重复
- 新增规范 9 "workflow 不绕过规范 1 确认"
- LEARNINGS 第一条标记已废弃
- **依据**：GPT "表述略微过窄 / 维护风险 / 隐式张力"

### D-10 · 2026-06-19 夜：B → D → A → C 优先级

- **诱惑**：直接做 A（memory_export/import）—— 看起来"有进度"
- **决策**：先 B（benchmark plan）→ D（本文）→ A → C
- **依据**：GPT "你最容易犯的错误是连续实现，没停下来验证"
- **结果**：B 已完成（`docs/logs/2026-06-19-benchmark-plan.md`），D 进行中

---

## 4. Sprint 期间的实际数据点

| 维度 | 数据 |
|---|---|
| Sprint 长度 | 14 天 → 3 天（缩短 78%） |
| handoff 写入次数 | 5 次 |
| handoff 恢复次数 | 4 次 |
| memory 新增条目 | 4 条（#25-28，删 1 条 #26） |
| 新增代码（净）| ~700 行（install.mjs ~410、git.js +60、db.js +25、test +200） |
| 新增测试用例 | 23（test-project-hash.js） |
| 文档变动 | `.clinerules` 2 次、`README.md` 1 次重写、`LEARNINGS.md` +2 条复盘、3 个新文档（benchmark-plan / 本文 / 1 个待写） |
| commit 数 | 6 个（含 2 个 merge） |
| 测试基线 | 109 → 137 全绿（0 regression） |
| 外部评审接收 → 落地周期 | <12 小时（评审 → 全部反馈修复 + push） |
| 收到 GPT 评审反馈次数 | 2 次（external-review-2026-06-18 + 2026-06-19 三组 review） |
| 1 次大型决策折返（系统性教训） | 1 次（cmd → pwsh） |

---

## 5. 教训总结（已入 LEARNINGS / .clinerules，再列一次便于检索）

### T-01：决策维度完整性

- 切 Shell / 切运行时 / 切包管理器，对比表至少 5 列：语法 / 性能 / 装机成本 / **可观测性** / **工具链兼容性**
- 反向问"如果选了 X，原本 work 的 Y 会不会坏？"
- 装机成本要按"用户实际操作步骤"算，不是凭印象

### T-02：环境变更前必须验证可观测性

- VS Code Shell Integration 是 Cline 命令观察周期的前提
- 切到不在支持列表（zsh/bash/fish/PowerShell）的环境 = 盲打
- 已抽象到规范 1（不绑定 Shell Integration 这个具体实现）

### T-03：数据迁移类决策"延迟成本递增"

- 现在 26 条 memory 改 hash → 0 痛苦
- 100 条改 → 有点痛
- 1000 条改 → 用户认为数据丢了
- 因此 P1.3 memory_export/import 越早做越好

### T-04：诚实的复盘 vs 框架驱动复盘

- Q0-Q5 用于**系统性认知错误**（如"决策维度遗漏"）
- 基础设施一次性优化用四段式（背景 / 方案对比 / 决策 / 教训）即可
- 别为了"看起来严谨"硬套 Q0-Q5

### T-05：用户文件 = 神圣

- install.mjs 的 readJsonSafe 必须区分 missing / corrupted / valid
- 任何"我觉得它坏了所以覆盖"都是 bug

### T-06：连续实现是隐性反模式

- "做完 A 立刻做 B" → 容易忽视"A 是不是真在被使用"
- Sprint = 强制停下来 → 这个机制证明有价值

---

## 6. Sprint 后路线（基于 GPT 战略评审 ⑤）

### P0（优先级最高）：本周内做

1. **B 已完成** —— `docs/logs/2026-06-19-benchmark-plan.md`（设计完成，未实现）
2. **D 已完成** —— 本文
3. **A 待做** —— memory_export/import 设计文档（不实现）
   - 解决：导出格式 / project_id 选择 / 迁移策略 / 兼容策略
   - 依据：T-03 延迟成本递增、D-06 旧 hash 不动的承诺
4. **handoff goal 边界 bug 修复** —— Q2 暴露的真 bug

### P1（下周内做）

5. benchmark 框架实现（`bench/` 目录、`run.mjs`、`corpus-gen.mjs`、smoke 10 条 query）
6. README "Before / After" 占位（**等 benchmark 出 1 次数据后**再补，避免先宣传后补证据）

### P2（再等等）

7. memory_export/import 实现（基于设计）
8. project_id 进 git 的 UUID 机制（与 memory_export 配套）
9. do_not 主动检测（external-review §2.3 的 L3 detector schema）

### 不做（产品宪法保护）

- 向量库 / Web UI / LLM in server / 多 agent 协同 / 跨工具同步

---

## 7. 给一个月后的自己

如果未来打开这份文档，你最该记住三件事：

1. **代码 ≠ 价值。** 验证才是。Sprint 这 3 天的最大产出不是 700 行代码，是 6 个关键决策档案 + 6 条复用教训。
2. **延迟成本递增的事，不要拖。** memory_export/import 是这条规则的标的物。
3. **当一条规则越长越像"绕过指令"，是切换底层而非加更多绕过的信号。** 这条规则今天救了规范 7。

---

## 附录 A：相关文档

- [dogfooding-sprint.md](2026-06-18-dogfooding-sprint.md) — Sprint 规则
- [dogfooding-log.md](2026-06-18-dogfooding-log.md) — 每日日志
- [external-review-2026-06-18.md](../reviews/2026-06-18-external-review.md) — 外部评审
- [benchmark-plan.md](2026-06-19-benchmark-plan.md) — Sprint 后 P1 入口
- [LEARNINGS.md](../../LEARNINGS.md) — 全部经验沉淀
- [.clinerules](../../.clinerules) — 当前生效规则

## 附录 B：本文写作过程中的反讽

写到 §1 Q1 时，发现自己想"算了不用 handoff_write，写完文档直接 attempt_completion"——立即纠正。

> **dogfooding 的本质就是：让真实使用的诱惑暴露设计的边界。**

写本文 = 跨会话任务，必须 handoff_write。这条诱惑本身已记入 §1 Q1。