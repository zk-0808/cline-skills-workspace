# Benchmark Plan · 回答「BM25 什么时候不够」

> **状态**：📐 设计（2026-06-19 写）；尚未跑数据，先建立衡量标尺
> **上层锚点**：[external-review-2026-06-18.md §1.1 / §5 Q1](./external-review-2026-06-18.md)、[product-positioning.md §3 不做向量库的判定](./product-positioning.md)
> **目的**：把「BM25 已够用」从推测变成可证伪的证据，符合宪法一

---

## 1. 为什么必须有 benchmark

`docs/product-positioning.md §3` 明确不做向量库 / 语义检索。这个决定的全部正当性建立在一个假设上：

> **"FTS5 + bm25 + unicode61 在项目级私有 memory 上，召回率衰减点比向量库的引入成本来得晚。"**

外部评审 §1.1 和 §5 Q1 直接指出：**这个论断目前没有数据支撑**——10 万条延迟未测、中文召回率未量化、escapeFts 边界未拷打。

> **「你在宪法里写'证据优于推测'，但你对'BM25 已够'这个最核心的架构假设，目前是 0 实测数据支撑」**

**没有 benchmark = 违反宪法一。** 这是最早期就该补的洞。

---

## 2. Benchmark 要回答的 3 个问题

### Q1（核心）：在多大规模 / 什么 query 下，FTS5 + bm25 开始扛不住？

不是 "BM25 好不好"，而是 **「失效阈值」**。

**度量目标**：找到 `(corpus 大小, query 类型) → recall@10 / latency p99` 的二维曲线，并标注 **「触发重新评估」的判定线**。

### Q2：中文召回率（unicode61 不分词）相对英文有多大衰减？

`docs/external-review-2026-06-18.md §2.1` 提示 **unicode61 默认不分中文词**——这可能是最先暴露的瓶颈。需要量化：

| 测试 | 期望 |
|---|---|
| 英文 query → 英文 doc | recall@10 ≥ 90% [推测，未验证] |
| 中文 query（多 token）→ 中文 doc | recall@10 ≥ ?? |
| 中英混合 query | recall@10 ≥ ?? |

### Q3：escapeFts 在真实 query 下还有什么没被单测覆盖的边界？

23 单测已覆盖核心。但 dogfooding 真实 query 会暴露：

- emoji（用户经常在 episodic 用）
- 长 URL（项目地址 / Issue 链接）
- 代码片段（含 `()`、`{}`、`[]`、`""`）
- 多语言混合长句

---

## 3. 失效阈值（Failure Criteria）

**这是 benchmark 设计的核心。** 没有阈值，跑出来的数字只是数字。

### 3.1 触发"重新评估"的硬阈值

任一条满足 → 自动触发评估是否引入 **更复杂方案**（中文分词 / tag 索引 / 时间衰减 / 最后才考虑向量库）：

| 指标 | 阈值 | 说明 |
|---|---|---|
| **recall@10**（英文 query） | < **90%** | 英文应该最稳；低于 90% 说明 BM25 实现有 bug |
| **recall@10**（中文 query） | < **70%** | 默认 unicode61 不分词，70% 是可接受下限 [假设，待真实数据校准] |
| **recall@10**（中英混合 query） | < **60%** | 已知最弱场景；低于 60% 触发 Intl.Segmenter 引入评估 |
| **p99 latency**（10 万条） | > **200ms** | 超过 200ms 在 MCP 调用链中影响交互体感 |
| **p50 latency**（10 万条） | > **50ms** | 中位数过高说明索引选择性差（高频词主导） |

### 3.2 触发"放弃 BM25 / 引入向量库"的极限阈值

任一条满足 → 重新审视 product-positioning §3 的不做列表：

| 指标 | 阈值 |
|---|---|
| **recall@10**（中文）经过中文分词 + 停用词优化后仍 < **60%** |
| **同义词召回率** < **30%**（Iranti / Memorix 此项天然胜出） |
| **跨语言查询命中** < **20%**（"OAuth 实现" 应能命中"鉴权 token 验证"） |

⚠️ **关键**：达到极限阈值不等于 "立刻引入向量库"——还要算复杂度成本（node-gyp / embedding API 费 / 模型版本一致性）。详见 `docs/interview-answers.md`。

---

## 4. 数据集（Corpus）设计

### 4.1 真实 + 合成的混合策略

| 数据来源 | 数量 | 用途 |
|---|---|---|
| **本仓 dogfooding 真实 memory**（项目 hash `6ba9751232ab`）| ~30 条 | 真实分布的"种子" |
| **合成扩展**（用 LLM 生成同类语料）| 1k / 10k / 100k 三档 | 跑规模曲线 |
| **公开数据集**（如 LCQMC 中文短文本对） | 抽样 1k | 跨平台基线对比 |

### 4.2 合成原则

- **保留真实分布特征**：kind 比例（episodic > semantic > procedural）、tag 频率、长度分布
- **不引入未来才会出现的场景**：例如不要假设用户记 100 条 RFC 全文（不符合真实使用）
- **可重复**：用固定 seed，commit 到 `bench/corpus-seed.jsonl`

---

## 5. 标注样本（Query → 期望命中）

### 5.1 标注方式

每条样本结构：

```json
{
  "query": "PowerShell 切换",
  "expected_doc_ids": [27, 28],
  "kind": "procedural",
  "language": "zh",
  "difficulty": "easy"
}
```

### 5.2 标注规模

| 阶段 | 数量 | 时机 |
|---|---|---|
| **smoke** | 10 条手写 | benchmark 框架联通验证 |
| **alpha** | 50 条 | Sprint 后 1 周内 |
| **production** | 100-200 条 | README 数据表前 |

### 5.3 难度分级（避免单一指标）

| 难度 | 例子 | 期望表现 |
|---|---|---|
| easy | 单 token 精确匹配 | recall@10 = 100% |
| medium | 词序变化 / 同义词 | recall@10 ≥ 80% |
| hard | 跨语言 / 概念召回 | recall@10 ≥ 50%（这才是真正的鉴别项） |

---

## 6. 度量指标完整清单

### 6.1 召回率类

- **recall@k**（k=1, 5, 10）—— 标准召回
- **MRR**（Mean Reciprocal Rank）—— 命中位置质量
- **NDCG@10** —— 是否按相关性排序（bm25 应该天然好）

### 6.2 延迟类

- **p50 / p95 / p99 latency** —— 三分位
- **冷启动 vs 热缓存** —— 第一次 query vs 第 N 次相同 query
- **写入 vs 读取并发** —— PRAGMA busy_timeout 是否生效

### 6.3 资源类

- **memory.db 文件大小**（不同 corpus 规模下）
- **内存峰值**（process.memoryUsage 在 query 时）

### 6.4 鲁棒性

- **escapeFts 真实 query 测试** —— 用真实 dogfooding query 跑过一遍
- **崩溃恢复**（kill 进程 → 重启 → 数据完整）

---

## 7. Benchmark 框架设计（不实现，只设计）

### 7.1 文件结构

```
skills-mcp-server/
└── bench/
    ├── README.md            # 本计划的简版执行手册
    ├── corpus-seed.jsonl    # 真实种子（手 commit）
    ├── corpus-gen.mjs       # 合成扩展脚本
    ├── queries.jsonl        # 标注样本（手维护）
    ├── run.mjs              # 主入口：跑全部指标
    └── results/
        ├── 2026-06-XX-1k.json   # 每次结果按日期 + 规模存
        └── README-table.md      # 自动生成的 README 表格片段
```

### 7.2 主入口签名

```js
// run.mjs
import { runBench } from "./run.mjs";

await runBench({
  corpusSize: 10_000,         // 1k / 10k / 100k
  warmup: 3,                  // 热启动跑几次再计时
  iterations: 100,            // 每条 query 跑几次取分位
  output: "./results/...",
});
```

### 7.3 输出格式

```json
{
  "date": "2026-06-XX",
  "corpus": { "size": 10000, "lang_dist": { "zh": 0.6, "en": 0.4 } },
  "node_version": "v24.15.0",
  "platform": "win32",
  "results": {
    "recall@10": { "easy": 0.98, "medium": 0.83, "hard": 0.51 },
    "latency_ms": { "p50": 12, "p95": 38, "p99": 67 },
    "db_size_mb": 4.2
  },
  "verdict": "PASS"  // 或 "REVIEW_NEEDED" / "FAIL"
}
```

`verdict` 由阈值表（§3）自动判定，不主观。

---

## 8. 与 product-positioning 的对齐

| 决策 | benchmark 如何支撑 |
|---|---|
| §3 不做向量库 | benchmark 持续输出 "PASS" → 论据成立；某天 "REVIEW_NEEDED" → 触发讨论 |
| §3 不做 LLM in server | benchmark 不依赖 LLM，纯统计指标 |
| §1 一句话定位 | benchmark 数据进 README → 把 "Project Continuity" 从口号变成可证 |

---

## 9. 与外部评审 §6「Sprint 后任务」的关系

external-review §6 列了 8 项 Sprint 后必做。benchmark 是其中之一。本文是它的 **设计前置**。

```
[设计阶段] ← 本文
   ↓
[实现阶段] bench/run.mjs + corpus-gen.mjs（Sprint 后 P1）
   ↓
[标注阶段] queries.jsonl 50-100 条
   ↓
[出数据阶段] results/2026-XX.json
   ↓
[沉淀阶段] README 数据表 + interview-answers Q1 答案
```

---

## 10. 何时不该做 benchmark（避免过度工程）

| 情况 | 决策 |
|---|---|
| memory 库 < 100 条 | 不必跑——用户体感先观察 1-2 周 |
| 用户从未抱怨过查不到 | benchmark 只为面试 / 防漂移，不是为修 bug |
| 没有竞品对比目标 | benchmark 数据缺乏外部锚点，价值打折 |

**当前情况**：本仓 26 条 memory，dogfooding 中。**先建框架不跑数据**最合理：

- ✅ 框架就位 → 任何时候有 100 条都能跑
- ✅ 阈值定义就位 → "BM25 够不够" 有了客观标准
- ❌ 现在跑 26 条数据 → 数据量太小，结论站不住

---

## 11. Open Questions（需进一步定）

1. **合成数据的 LLM 是否会偏向某类查询？**——可能虚高 recall。建议混入公开数据集（LCQMC / CMRC）做交叉验证
2. **escape "热缓存" 是否合理？**—— MCP server 单进程，连接复用；但跨进程冷启动也很常见。需测两种
3. **跨平台差异**—— Windows / macOS / Linux 对 node:sqlite WAL 表现是否一致？至少在 CI 跑两个平台

---

## 12. 当前不做的（YAGNI）

| 想做但暂不做 | 理由 |
|---|---|
| 自动 CI 集成 benchmark | 还没有真实用户 → 不需要回归保护 |
| 实时监控 dashboard | 违反 §3 不做 Web UI |
| benchmark 失败自动 PR | 过度工程，先手动看结果 |

---

## 附录 A：执行时机

- **2026-06-19（本文）**：设计完成
- **Sprint 后第 1 周**：实现框架（run.mjs / corpus-gen.mjs / 10 条 smoke queries）
- **Sprint 后第 2 周**：补到 50 标注样本，跑一次 1k / 10k 数据
- **memory 库到 100 条时**：跑首个 production 报告
- **README 数据表**：第一次 production 报告后

## 附录 B：相关文档

- [external-review-2026-06-18.md](./external-review-2026-06-18.md) §1.1 / §2.1 / §5 Q1
- [interview-answers.md](./interview-answers.md) BM25 选择的论证链
- [product-positioning.md](./product-positioning.md) §3 不做向量库的边界
- [skills-mcp-server/handlers/memory-recall.js](../skills-mcp-server/handlers/memory-recall.js) escapeFts 实现