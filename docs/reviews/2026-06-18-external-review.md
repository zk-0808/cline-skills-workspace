# 外部评审报告 · 2026-06-18

> **评审者**：Opus 级别 LLM（基于 `docs/reviews/2026-06-18-review-prompt-for-opus.md` 提交）
> **基础**：评审者未直接读源码（仓库未公开索引），基于「严格基于代码现状」的描述评审，所有具体实现推断标注 `[推测]`
> **价值定位**：本次评审是 14 天 Dogfooding Sprint 的关键外部诊断，对照执行清单见末尾

---

## 1. 关键诊断结论（按重要性）

### 1.1 头号短板：「BM25 已够」是推测，不是证据

> "你在宪法里写'证据优于推测'，但你对'BM25 已够'这个最核心的架构假设，目前是 0 实测数据支撑——你自己承认 10 万条延迟、多义词召回率都未量化。"

**这违反第一条宪法。** 必须给出可证伪的判定标准（如 recall@10 < X% 或 p99 > Y ms 就触发重新评估）。

### 1.2 哲学不自洽：handoff 进 git 但 memory 全部本地

> "你已经判定'项目状态该和代码同生命周期、可 review、可恢复'。但你把所有 memory（包括 semantic/procedural 这类项目级事实）全留在本地，且 project_hash 绑死绝对路径。"

**矛盾点**：会话状态进 git，项目事实却不进。换机器后 `git clone` 拉到 handoff 但没有 memory，「状态恢复」叙事断裂。

### 1.3 措辞风险：「零 native 依赖」严格说不成立

`node:sqlite` 本身就是 native（SQLite 是 C 库，FTS5 是 C 扩展）。准确表述应是 **「零额外原生编译依赖 / 零 node-gyp」**。

面试官一句「sqlite 不是 native 吗」就破防。

### 1.4 真正的差异化叙事

> "你的真正差异化不是任何单一技术，而是'三层职责模型 + 进 git 的 handoff + 零 native 依赖'这个组合的工程克制。单点都能被复制，组合 + 克制是你的叙事资产。"
>
> "对一个应届生而言，这恰恰是面试中最值钱的东西——它证明你会做'减法'。"

**最关键的差异点**：handoff 进 git。这是和 Letta/MemGPT/LangGraph 的根本分野。

---

## 2. 已实现部分的优化建议

### 2.1 memory 层（FTS5 + BM25）

**延迟分析**（✅ 实测前可参考）：
- 1 万→10 万条对**选择性高的查询**（罕见词）几乎无变化
- **真正的衰减**来自高频词查询 + bm25 候选集排序，p99 可能到几十~上百 ms
- **召回率是真问题**：FTS5 默认 `unicode61` tokenizer **不分中文词**，中文召回率可能显著偏低

**不打破宪法的优化方案**：

| 方案 | 实现要点 | 收益 |
|---|---|---|
| **中文分词** | 用 Node 内置 `Intl.Segmenter('zh', {granularity:'word'})` 预分词后入 FTS5 | 中文召回大幅提升，**零依赖** |
| **停用词** | 写入/查询前 JS 表过滤 | 减少长 posting list |
| **英文词形归一化** | lowercase + 简单 Porter stemmer | 英文召回提升 |
| **tag 索引** | tags 列普通 B-tree 索引 + FTS 联合 | 高精度场景 |
| **冷热分层** | `score = bm25 * decay(age)` 时间衰减 | 时效性 |

**量化实验框架（必做）**：
1. 用自己 dogfooding 产生的真实 memory 当 corpus（合成扩到 10 万）
2. 标注 50~100 个 (query, 期望命中 doc_id) 对
3. 跑 `recall@5/@10` + `latency p50/p99`
4. 对照组：纯 BM25 vs +停用词 vs +Segmenter 分词
5. **把表放进 README**——面试时直接甩数据

### 2.2 escapeFts 实现风险（需核对源码）

`[推测]` 当前实现是「整句双引号包成短语」：
- **双引号未转义** —— query 含 `"` 会破坏 FTS5 语法（最可能的真 bug）
- **整句强短语匹配** —— 词序稍变就漏召
- **建议**：按 token 拆开，每个 token 各自加引号再 OR/AND，且 `token.replace(/"/g, '""')` 逐 token 转义

### 2.3 handoff 层：do_not 主动检测的 4 级递进

| 级别 | 方案 | 误报 | 漏报 | 建议 |
|---|---|---|---|---|
| L1 | 关键词 grep | 高 | 中 | 立刻做 baseline |
| L2 | regex + 否定语境过滤（排除"不/避免"前缀窗口） | 中 | 中 | 性价比最高 |
| **L3** | **依赖文件扫描**（do_not 项映射到 detector：扫 package.json、import 语句） | **低** | **低** | **最优雅、最合宪法** |
| L4 | 语义比对（embedding/LLM in server） | 低 | 低 | **不做（违宪）** |

**L3 设计**（甜点方案）：把 do_not 升级为带 detector 的结构化项：

```yaml
do_not:
  - text: "不引入 Redis"
    detector: { type: dependency, match: "redis" }
```

server 用 detector 做确定性检测，无 detector 退回 L1 grep。**符合宪法，可讲故事**。

### 2.4 project_hash 修正方案（强推）

**核心矛盾**：hash 既要稳定（迁移不断档）又要隔离。

按优先级 fallback：
1. **首选 git remote URL** —— 换目录、换机器都稳定
2. 无 remote → **`.cline/project_id` 进 git 的 UUID** —— 和 handoff 哲学完美一致
3. 都没有 → 退回绝对路径 hash（当前行为）

**这是把短板变成杀手锏的机会。**

### 2.5 single-active-handoff per branch：基本是伪问题

- 并行任务**就该**用不同 branch
- 真边角：长期 trunk-based 单 main 开发
- **建议**：列入「已知约束」，等 dogfooding 真撞上再说（符合宪法三）

### 2.6 compact 层「人工填」的真相

> "你不是'没用 LLM'，是'把 LLM 调用挪出了 server 边界'。这是干净的架构决策，不是缺陷。"

**叙事修正**：要讲清楚 LLM 调用在 **Cline 侧而非 server 侧**，是有意的边界设计。

**重要性评分（不调 LLM）**：

```
score = w1 * field_completeness    // 字段非空比例
      + w2 * keyword_hits           // 命中 do_not/决策关键词
      + w3 * artifact_ref_count     // 引用文件数
      + w4 * recency_decay          // exp(-age/τ)
      + w5 * cross_ref              // 后续 handoff 的引用
```

确定性、可单测、零依赖。**caveat**：抓不到「短但关键」的洞察，所以**只能做排序辅助，不能做删除决策**。

---

## 3. 失效推演

### 3.1 handoff_resume 失败的自动降级链

| 错误 | 风险 | 降级策略 |
|---|---|---|
| **NO_HANDOFF** | 无 | 自愈：生成空模板，等同全新开始 |
| **STALE_HANDOFF** | 低 | 软降级：返回内容 + [STALE] 标记 + 警告，无需 confirm |
| **BRANCH_MISMATCH** | 中 | 自愈尝试：git merge-base 判断是否切自 mismatch branch；离线 → 起新的 |
| **PROJECT_HASH_MISMATCH** | **高** | 硬降级：绝不自动继续，返回 BLOCKED + 诊断（hash 期望 vs 实际） |

**离线总策略**：可逆/低风险 → 自愈；不可逆/高风险 → 停下产出 BLOCKED handoff。**永远不要静默吞错继续干**（SRE 红线）。

**建议加 `degraded_mode: "strict" | "auto-heal"` 参数**，默认 strict，CI 场景显式开 auto-heal。

### 3.2 跨设备/跨目录迁移

| memory 类型 | 跟 git 走？ | 理由 |
|---|---|---|
| `semantic`（项目事实） | **应该** | 项目共享知识，跨人都有效 |
| `procedural`（流程/规范） | **应该** | 团队/未来的自己都需要 |
| `episodic`（具体事件） | **本地** | 噪音大、量大、个人化 |

**memory_export / memory_import 强烈建议**：
- 输出 JSONL 进 git，纯文本可 diff 可 review
- `--include-episodic` 默认关，逃生口
- 用 `project_id` 做绑定键

---

## 4. 生产环境三大致命挑战

### 4.1 FTS5 写入与查询的并发锁竞争

- **触发**：MCP 多调用并发同一 `memory.db`
- **方案**：建库时 `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;`
- **现状核查**：`db.js` 已设 `journal_mode=WAL` 和 `synchronous=NORMAL`，**未设 `busy_timeout`** ← Sprint 第二周可能踩

### 4.2 handoff 文件并发写 / git 合并冲突

- **触发**：两个 Cline 窗口；多设备
- **方案**：
  - 写入用**原子写**：临时文件 + `fs.rename`（同文件系统 rename 是原子）
  - frontmatter `updated_at` 乐观锁检查
  - YAML 解析 try/catch，损坏返回 `CORRUPTED_HANDOFF` 错误码

### 4.3 dynamic import 失败不可观测

- **触发**：handler 文件改名/语法错；Node 版本差异（`node:sqlite` 较新）
- **方案**：
  - 启动时 eager import 所有 handler，错误前移
  - 锁定 Node 版本：`package.json` 的 `engines` ≥22.5 + 启动检查 `process.version`

---

## 5. 终极反问（面试指南针）

### Q1：BM25 够用的判定标准是什么？

> 给出一个让"BM25 不够用"成立的、可被 dogfooding 数据证伪的判定标准（recall@10 < X% 或 p99 > Y ms 就触发重评估），并说明用什么 corpus、多少标注样本去测。**答不出这个判定标准 = "BM25 已够"是推测而非证据 = 违反第一条宪法。**

### Q2：会话状态进 git，项目事实却不进，怎么自圆其说？

> 这两个决策的哲学是矛盾的。如果承认 semantic/procedural 也该可迁移，那 project_hash 绑绝对路径就是会让"状态恢复"在换机器场景失效的根缺陷——先修哪个？为什么？

### Q3：当面试官说「这就是几个 Markdown 模板加 SQLite 包装」？

> 用哪一个具体的设计决策（不是功能列表）证明 infra 工程师素质？真正答案不在"做了什么"，而在"克制着没做什么、能否把每个'不做'都用一句话讲出可证伪的理由"。

---

## 6. 行动清单（按 Sprint 阶段）

### Sprint 期内（2026-06-18 ~ 07-02）必做

- [ ] **改口径**：所有文档「零 native 依赖」→「零额外原生编译依赖 / 零 node-gyp」
- [ ] **核对 escapeFts 实现**：是否真整句包引号？双引号是否转义？拆 token + 转义最小修复
- [ ] **加 PRAGMA busy_timeout=5000**：建库时
- [ ] **handoff 原子写**：临时文件 + fs.rename
- [ ] **handler 启动自检**：eager import 替代 lazy
- [ ] **package.json engines 字段**：声明 Node ≥22.5

### Sprint 后（2026-07-02 retro 时评估）

- [ ] **benchmark 脚本** + 50-100 标注样本 → README 数据表（Q1 答案）
- [ ] **project_id 进 git 设计与实现**（Q2 答案）
- [ ] **memory_export / memory_import**（闭环跨设备恢复）
- [ ] **semantic/procedural 进 git 选项**
- [ ] **do_not L1 grep + L3 detector schema 设计**
- [ ] **compact 重要性评分静态打分函数**
- [ ] **handoff_resume degraded_mode 参数**
- [ ] **YAML 解析 CORRUPTED_HANDOFF 错误码**

### 不做（产品宪法保护）

- ❌ 向量库 / embedding / LLM in server
- ❌ Web UI / 仪表盘 / 团队权限
- ❌ 多 Agent 协同 / 跨工具同步

---

## 7. 评审者明确表达的 caveat

- 评审者未直接读源码（GitHub repo 未在公开检索中返回）
- `[推测]` 标注的实现细节（escapeFts、tokenizer 配置、PRAGMA）需拿源码核对
- **下一轮**：贴关键文件代码片段，可获得"精确到行"的二轮 review

---

## 8. 与项目宪法的对齐验证

| 宪法 | 评审是否冲突 | 备注 |
|---|---|---|
| 证据优于推测 | ✅ 完全对齐 | 评审者也批评了"BM25 够用"的无证据论断 |
| 问题优于方案 | ✅ 完全对齐 | 评审先列竞品对比再下结论 |
| 复杂度必须被证明 | ✅ 完全对齐 | "single-active-handoff 撞车 → 等真撞上再说" |

评审者尊重了「主动不做清单」，未在向量库/Web UI 等方向做拷问。