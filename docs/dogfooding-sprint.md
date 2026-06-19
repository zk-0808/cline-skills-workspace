# Dogfooding Sprint · 2026-06-18 起 14 天

> **目的**：验证 Project Continuity MVP 在真实使用中是否成立，而不是在设计上是否成立。
> **上层锚点**：[`product-positioning.md`](./product-positioning.md) §1 / [`2026-06-18-status-and-directions.md`](./2026-06-18-status-and-directions.md) 项目阶段
> **冻结期**：本 Sprint 期间不接受任何 P0 新增（含 ChatGPT 第二意见 / Browser Automation / 新 Skill / 新 Workflow）

---

## 0. Sprint 起止

- **开始**：2026-06-18
- **结束**：~~2026-07-02（14 天）~~ → **2026-06-21（3 天，2026-06-19 用户决定缩短）**
- **缩短理由**：实际工作推进快，14 天验证窗口过长；提前进入 retro + Sprint 后 P1
- **可提前中止条件**：核心问题已得到清晰答案，不必凑满 3 天

---

## 1. Sprint 目标

不是"用了多少次"，而是回答 **3 个真实问题**：

### Q1. handoff 会不会被持续使用？

- 不是"能不能用"（已证）
- 是"两周后还会不会主动用"

**度量**：
- 每个开发会话结束时是否真的 `handoff_write`
- 每个新会话开局是否真的 `handoff_resume`
- "懒得写"或"忘了写"的次数

### Q2. handoff 字段对不对？

现状字段：`goal / completed / in_progress / next_action / do_not / artifacts / blocked_by`

**度量**：
- 哪些字段经常空着不填？→ 候选删除
- 写完后是否觉得缺少表达某种状态的字段？→ 候选新增
- 哪些字段每次都填得很草率？→ 可能字段定义不清

### Q3. memory 和 handoff 是否重叠？

最关键的设计验证。

**度量**：写每条记录时是否会犹豫"这条该写 memory 还是 handoff？"。

- **情况 A（理想）**：每次都很清楚归属，从不犹豫
- **情况 B（警报）**：经常犹豫，或同一条信息既写了 memory 又写了 handoff

如果出现情况 B → 触发 schema 重新设计。

---

## 2. 强制使用规则（仅 Sprint 期内）

| 场景 | 必须做的事 |
|---|---|
| 新会话开局 | 第一条 thinking 内调用 `handoff_resume`，无论是否需要 |
| 当前 branch 无 active handoff，且用户给出第一个具体目标 | 立即 `handoff_write`（即使任务很小） |
| 会话结束 / 上下文 ≥ 60% / 切换大方向 | 必须 `handoff_write`，不允许"算了不写" |
| 完成一个里程碑 | `handoff_write completed: [...]` |
| feature 完成、准备 PR | `handoff_write status: done` |
| 阻塞超过 1 小时 | `handoff_write status: blocked, blocked_by: [...]` |

**例外**：单条 quick fix（一问一答）不强制——但要自问"这真的是 quick fix 吗？还是只是懒？"

---

## 3. Sprint 日志格式

在 `docs/dogfooding-log.md`（本 Sprint 期间逐条追加）记录：

```markdown
## 2026-06-XX

### 会话 N

- **时长**：约 ?? 分钟
- **handoff_resume 调用**：是 / 否（原因：...）
- **handoff_write 调用次数**：?
- **填写难度**：哪些字段写得顺手 / 写得别扭
- **memory vs handoff 犹豫**：是 / 否（具体内容）
- **想加新字段**：?
- **想删字段**：?
- **触发 P0 冲动**：是 / 否（具体想法 + 是否压住）
```

---

## 4. Sprint 中允许的工作

- 所有 P1 任务（如评估 `agentic-development-workflow/` 是否归档）
- 所有 P2 观察项
- bugfix（包括 handoff 工具自身的 bug）
- 文档更新（README / handoff-schema 修订）
- 真实业务任务（任何带 do_not 价值的工作）
- 微调 SKILL.md（不改协议，只改触发提示语）

## 5. Sprint 中禁止的工作

- 新增 P0 功能
- 设计新的 MCP 工具（`handoff_validate` / `handoff_list` 也押后）
- 重构 handoff schema（除非 §1 Q3 出现情况 B）
- 接入新外部能力（OpenAI API / 浏览器自动化 / 向量库）
- 修改 `.clinerules` 宪法（v1.0 已冻结）

---

## 6. Sprint 收尾产出（2026-07-02 当天）

写入 `docs/dogfooding-sprint-retrospective.md`，必须回答：

1. Q1/Q2/Q3 的明确答复（含证据，引用 dogfooding-log）
2. **被反复使用 vs 仅设计时显得重要** 的组件清单（可能要砍掉一些）
3. 下一阶段建议：
   - 继续 Validate（再延 N 天）
   - 进入 Refine（基于发现修订 schema/SKILL）
   - 进入 Build 新方向（且新方向是 dogfooding 真实暴露的需求，不是想象）
4. handoff schema v1.1 候选修订（如果有）

---

## 7. 防漂移条款

如果 Sprint 期内出现"我突然想做 X"的强烈冲动，**必须**：

1. 在 dogfooding-log 当天条目中记录"触发 P0 冲动 + X 内容"
2. 写一句"先不做的理由"——通常是"它不在 Sprint 目标内"
3. 把 X 写入 `docs/sprint-deferred-ideas.md`（无此文件则新建），等 Sprint 结束后统一评审

如果连续 3 次出现同一个想法 → 它可能是真需求，但仍等 Sprint 结束再评估。

---

## 8. 与项目宪法的对齐

- **证据优于推测**：Sprint 的核心就是用真实使用证据替代设计推测
- **问题定义优于方案设计**：Q1/Q2/Q3 是问题定义层级；现在不是设计新方案的时候
- **复杂度必须被证明**：任何"能不能加 X"的诱惑都先回答"现有的 handoff/memory 真的不够吗？"——而这个回答必须基于 dogfooding-log，不是脑补

---

## 附录：Sprint 心态校准（来自 GPT 2026-06-18 评审）

> 「这时候开始出现一个新的东西：用户状态生命周期（State Lifecycle）。这是很多 Agent 项目都没有的。」
>
> 「现在不要继续扩展 P0。很多项目在这里会犯一个错误：P0 完成 → 发现新想法 → 再加一个 P0 → 永远没有完成。」
>
> 「接下来最有价值的事情不再是写代码。而是验证三个问题。」
>
> 「哪个组件在真实工作中被反复使用，哪个组件只是设计时看起来很重要？这个答案往往比再写 3000 行代码更有价值。」