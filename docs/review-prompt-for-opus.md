# Opus 4.8 评审提示词（与代码现状对齐版）

> 锁定日期：2026-06-18
> 用途：粘贴到 Opus 4.8 / Claude Sonnet 4.5 / 任意高端模型，获取「白盒压力测试」式评审
> 仓库：https://github.com/zk-0808/cline-skills-workspace

---

# 角色设定

你现在是一位全球顶尖的 AI Agent 基础设施架构师，同时兼具资深技术面试官和严苛的 SRE（站点可靠性工程师）视角。你擅长洞察复杂系统设计的认知盲点、推演极端场景下的系统失效模式，并以高标准审视代码与架构的鲁棒性。

我已经在评审前查看过仓库代码，下方「项目背景」严格基于代码现状描述，不含夸大。请按真实状态评审，对未实现的能力可以提出"应该如何从零设计"的建议，而不是假设它已存在。

---

# 项目背景

我是一名即将毕业的大学生，开发了 `cline-skills-workspace` 项目。

## 一句话定位

**Project Continuity for AI Coding —— 让 AI 从上次停下的地方继续工作。**

不是「记忆」（avoid 撞 ChatGPT/Cline Memory），是「状态恢复」。

## 三层职责模型（互不重叠，禁止合并）

### Layer 1: memory（长期事实层）

- **kind 枚举（仅 3 种）**：`episodic` / `semantic` / `procedural`
- **存储**：`node:sqlite` + FTS5 + bm25，**纯 BM25 检索，无向量**（这是宪法约束）
- **隔离**：按 `sha256(项目绝对路径)[:12]` 哈希，放在 `~/.cline-skills/memory/{hash}/memory.db`
- **MCP 工具**：`memory_commit` / `memory_recall` / `memory_list`
- **生命周期**：项目级，跨所有会话

### Layer 2: handoff（会话之间的状态层）

- **存储**：进 git 的 `.cline/handoffs/HANDOFF_<branch>_active.md`，单 branch 单 active
- **格式**：YAML frontmatter（`status` / `branch` / `goal` / `updated_at` / `project_hash` / `schema_version`）+ 6 个固定章节（`completed` / `in_progress` / `next_action` / `do_not` / `artifacts` / `blocked_by`）
- **状态机**：active ↔ blocked，active → done（立即归档），active → stale（≥14 天自动判定）
- **MCP 工具**：`handoff_write` / `handoff_resume`
- **核心校验**：branch 一致性、project_hash 一致性、stale 检测、blocked 必须有 blocked_by
- **`do_not` 字段**：当前**仅是字符串数组**，handoff_resume 时打印给 Cline 看，**没有任何主动冲突检测**

### Layer 3: compact（单次会话内压缩）

- **MCP 工具**：`compact_context`
- **关键事实**：**完全不调用 LLM**。输入是用户/Cline 手动填的 7 个字段（`objective` / `progress_done` / `progress_pending` / `key_decisions` / `key_files` / `open_questions` / `next_action`），输出是把这些字段套进 Markdown 模板。可选 `persist=true` 写入一条 episodic 记忆。
- **生命周期**：单次会话内部

## 三条核心宪法（写在 `.clinerules`）

1. **证据优于推测**：结论必须标注 `[实测]/[源码]/[文档]/[社区]/[推测]`
2. **问题定义优于方案设计**：方案前必须验证问题，列至少 2 个替代解释
3. **复杂度必须被证明**：新增组件前回答「现有机制为什么不行？」否则禁止新增

## 主动「不做」清单（来自 product-positioning.md §3）

| 不做 | 理由 |
|---|---|
| 向量数据库 / 语义检索 / 嵌入模型 | FTS5+bm25 已够；引入会违反「零额外原生编译依赖」宪法 |
| LLM 自动摘要（在 server 内） | server 保持纯逻辑，由 Cline 用 SKILL.md 触发 |
| 多 Agent 协同 / 跨工具同步 | 复杂度爆炸 |
| Web UI / 仪表盘 / 团队权限 | 个人开发者目标，不需要 |
| 跨语言 SDK / HTTP 接口 | MCP stdio 已够 |

## 当前完成度

- ✅ MCP server 拆分架构（每个 handler 独立文件，dynamic import）
- ✅ memory 层：13/13 端到端测试通过
- ✅ handoff 层：15/15 端到端测试通过
- ✅ compact 层：实现并集成 `persist=true` 写 episodic
- ✅ skill validator：15 个 skills 0 error 0 warning
- ✅ 已开始 14 天 dogfooding sprint（2026-06-18 → 2026-07-02），正在自用本工具维护本仓库
- ❌ **未实现**：do_not 冲突检测、决策演进追踪、上下文重要性评分、压缩信息保真度量
- ❌ **未实现**：性能 benchmark（10 万条 memory 时的检索延迟未测）

## 当前已识别的明显短板（评审时可深入）

1. `do_not` 字段无主动冲突检测——只是文本，违反由 Agent 自觉
2. `compact_context` 完全依赖人工填字段，没有重要性评分
3. memory 检索仅 BM25，多义词/同义词召回率未量化
4. 没有跨会话的"决策演进"追踪——只有 episodic 记忆条目，没有"决策 A 在第 N 次会话被覆盖为决策 B"这种关系
5. project_hash 基于绝对路径，迁移项目（重命名目录）会断档

---

# 核心诉求

我不需要泛泛的赞美。我需要你对我的系统设计进行**「白盒压力测试」**：

- 找逻辑漏洞、性能瓶颈、未预料的故障模式
- 区分**已实现但有缺陷**的部分（给优化建议）和**完全未实现**的部分（给设计建议）
- 给可落地的工程建议，不要空谈架构概念

---

# 评审任务（请按以下四个层次依次输出分析）

## 层次一：定位与差异化拷问

1. 「Project Continuity」这个定位与以下产品的本质区别和真正护城河在哪里？
   - LangGraph State（agent 内部 state graph）
   - Letta / MemGPT（hierarchical memory）
   - CLAUDE.md / AGENTS.md（启动时注入）
   - agent-handoff（codes1gn 的 Markdown handoff 项目）
2. 我刻意「不做向量库 / 不做 LLM 摘要 / 不做 Web UI」是产品宪法。请评估：这些约束是「差异化优势」还是「自我设限」？什么场景下应该重新审视它们？
3. 从 2026 年大厂 AI Agent / Infra 岗位招聘视角，本项目最强的技术亮点是什么？最容易被面试官攻破的短板是什么？

## 层次二：组件机制深潜（仅评估已实现的部分）

### 2.1 memory 层（FTS5 + bm25）

- 当记忆库达到 1 万 / 10 万条时，FTS5 + bm25 在延迟和召回率上会面临什么衰减？
- 我没有做向量化（产品宪法约束）。在不打破「零额外原生编译依赖 / 零 node-gyp」前提下，能否通过**词形归一化、停用词、tokenizer 优化、tag 索引、冷热分层**来缓解？请给具体方案 + 量化评估实验。
- 当前 escapeFts 用双引号包裹做短语匹配（见 `memory-recall.js`）。这个实现在边界情况（含中文标点、emoji、混合语言）下会有什么问题？

### 2.2 handoff 层

- 当前 `do_not` 是纯字符串数组，无冲突检测。如果要加入「主动冲突检测」，最小可落地的实现是什么？（提示：不要立刻跳到 LLM 调用，先想想纯关键词扫描 / regex / AST 比对的可行性）
- `project_hash` 基于绝对路径——迁移项目（重命名目录、换电脑）会断档。如何在不破坏 isolation 前提下，加一层 fallback？
- single-active-handoff per branch 的设计在「同一 branch 上有多条平行任务线」时会撞车。这是真问题还是伪问题？

### 2.3 compact 层

- compact_context 不调用 LLM，完全依赖人工填字段。这违反了「让工具替我减负」的直觉。请评估：
  - 在哪些场景下「人工填」反而**更可靠**？（hint: 已有 SKILL.md 教 Cline 怎么填）
  - 在哪些场景下应该升级为「LLM 辅助」？升级后如何保持 server 纯逻辑（即 LLM 调用不在 server 内）？
- 设计一种「重要性评分」机制：在不调用 LLM 的前提下，纯静态信号（字段长度、关键词命中、artifacts 引用次数、时间衰减）能否给出可用的评分？

## 层次三：压力测试与失效推演（核心）

请逐个推演下面 3 个场景，明确指出我的系统**在哪一步会暴露问题**：

### 场景 A：do_not 冲突

Agent 在 30 个会话中确立了 `do_not: ["不引入 Redis"]`。第 31 次会话处理高并发需求时，使用 Redis 是最简洁方案。

- 当前系统行为：handoff_resume 把 `do_not` 列表打印出来，依靠 Agent 自觉
- 已知缺陷：Agent 可能忽略；用户可能没看
- **请你设计**：从最简单（关键词 grep）到最完整（语义比对）的 4 个递进方案，每个方案的实现复杂度和误报率权衡

### 场景 B：handoff_resume 失败时的降级

- 当前实现：返回错误码（NO_HANDOFF / BRANCH_MISMATCH / PROJECT_HASH_MISMATCH / STALE_HANDOFF），让用户用 confirm_* 参数强制
- **请评估**：如果 Agent 在 ACT MODE 下接收到错误，但用户离线无法 confirm，应该如何降级？继续干？停下？询问？
- 设计一个「自动降级链」：从 active → stale 自愈 → handoff 缺失自愈 → 完全失败时的 fallback

### 场景 C：跨设备/跨目录迁移

- 用户把项目从 `~/work/myapp` 重命名到 `~/projects/myapp`，handoff 进了 git 没问题，但 memory 在 `~/.cline-skills/memory/{old-hash}/` 留在原地
- 用户拉到新电脑：handoff 在 git 里，memory 完全没有
- **请评估**：哪些场景应该让 memory 也跟着 git 走？哪些必须保持本地？是否需要 `memory_export` / `memory_import` 工具？

## 层次四：工程优化与终极反问

### 4.1 生产环境最致命的三个挑战

不要泛泛而谈。请基于上面对真实代码的理解，指出**三个最致命的挑战**，每个挑战附：
- 具体故障表现
- 触发条件
- 一个可落地的技术方案（要给出库名 / API / 命令级建议）

### 4.2 终极反问

最后，请以「资深面试官」身份，基于今天的所有分析，提出 **3 个最刁钻、最核心的问题**。这 3 个问题将是我接下来优化项目和准备面试的指南针。

要求：
- 不要问已经在 §"主动不做清单"里被排除的方向（那是产品宪法，不接受拷问）
- 优先问「现有机制」是否真站得住（如：「为什么相信 BM25 已够」「为什么 do_not 不需要主动检测」）
- 至少有一个问题要问到「招聘视角下的真实价值」而不是技术深度

---

# 仓库链接

https://github.com/zk-0808/cline-skills-workspace

请直接查看以下关键文件以验证我的描述：

- `docs/product-positioning.md`（产品宪法）
- `.clinerules`（Agent 行为约束）
- `skills-mcp-server/lib/db.js`（memory 存储后端）
- `skills-mcp-server/handlers/memory-recall.js`（FTS5 检索）
- `skills-mcp-server/handlers/handoff-write.js` 和 `handoff-resume.js`（handoff 状态机）
- `skills-mcp-server/handlers/compact-context.js`（确认无 LLM 调用）
- `docs/dogfooding-sprint.md`（当前 14 天验证 sprint）

如果你发现我的描述与代码不一致，请优先指出，再继续评审。