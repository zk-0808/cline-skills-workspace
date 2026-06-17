---
name: search-orchestrator
version: 1.0.0
description: 搜索编排器 — 在任何网络搜索或多步骤调研前强制分解问题、列出假设、设计搜索路径并评估证据
category: workflow
preferred_mode: plan
tools: [use_mcp_tool, search_files]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: ["duckduckgo"]
platform: any
min_cline_version: "3.0.0"
---

# Search Orchestrator

## 前置条件

- 用户需要此 Skill 对应的工作场景
- Cline 已正常运行

## 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 参见 Skill 正文说明 | |

## 输出

- **正常输出**: 参见 Skill 正文说明
- **错误输出**: 参见 Skill 正文说明

## 使用示例

参见 [examples/](examples/) 目录下的具体示例。


## Overview

Most search failures are not caused by poor search tools — they're caused by searching before understanding what to search for. This skill forces the agent to plan before searching, evaluate after searching, and iterate when evidence is insufficient.

**Core principle:** Plan → Search → Evaluate → Decide. Never search blindly.

## When to Use

Use before ANY task that involves:
- Web search (DuckDuckGo, Brave, Tavily, Exa, etc.)
- Multi-step research or investigation
- Technology evaluation or tool comparison
- Market research or competitive analysis
- Troubleshooting with unknown root cause
- Fact-checking or claim verification

**Skip only when:** The task is a single, unambiguous fact lookup (e.g., "What is the current version of Python?").

## The Iron Law

```
NO SEARCH WITHOUT A PLAN.
NO CONCLUSION WITHOUT EVALUATION.
```

If you haven't written down your search plan, you haven't started researching.

## Phase 0: Complexity Gate (Is Full Research Justified?)

Before committing to the full Plan→Search→Evaluate→Synthesize pipeline, assess whether the question warrants it. Most questions don't need all four phases.

### Research Tiers

| Tier | Criteria | Process | Example |
|------|----------|---------|---------|
| **L0: Instant** | Single, unambiguous fact with a known authoritative source | Direct answer, no search needed | "What is Python 3.13's release date?" |
| **L1: Quick Lookup** | Simple fact that needs one search to confirm | One search → verify primary source → answer | "What's the current LTS version of Node.js?" |
| **L2: Standard Research** | Multi-faceted question needing 2-4 sub-questions | Plan → Search → Evaluate → Synthesize | "Should we migrate from Express to Fastify?" |
| **L3: Deep Research** | Complex, high-stakes decision with many unknowns | Full orchestration + multiple rounds + counter-evidence | "What backend language should our 50-person team adopt for the next 5 years?" |

### Tier Selection Rule

```
If answerable from a single authoritative source (docs, RFC, spec)
  → L0 or L1

Else if multi-faceted with trade-offs (tech choice, architecture, strategy)
  → L2

Else if high-stakes + long-term impact + multiple stakeholder concerns
  → L3
```

**Default to L2.** L3 is reserved for decisions that will be hard to reverse. Skipping the gate entirely for simple facts is the most common waste in research workflows.

---

## Phase 1: Plan (Before Any Search)

### 1.1 Clarify the Actual Question

Restate the user's question in your own words. Identify what makes it hard:
- Ambiguous terms? (define them)
- Broad scope? (narrow it)
- Implicit assumptions? (surface them)

### 1.2 Decompose Into Sub-Questions

Break the main question into 3-7 sub-questions. Each should be independently searchable.

```
Main: "Is Rust a good choice for our backend rewrite?"
  → Q1: What are Rust's performance characteristics vs our current stack?
  → Q2: What's the Rust backend ecosystem maturity (frameworks, ORMs, deployment)?
  → Q3: What's the Rust hiring market like in [region]?
  → Q4: What are known migration patterns from [current lang] to Rust?
  → Q5: What do teams report as the biggest pain points after adopting Rust?
```

### 1.3 List Hypotheses (What You Think You Know)

For each sub-question, state what you currently believe — as a falsifiable hypothesis. This prevents confirmation bias.

```
Q1 Hypothesis: Rust will be 2-5x faster than our Python backend [unverified]
Q2 Hypothesis: Rust web frameworks (Actix, Axum) are mature enough for production [unverified]
Q3 Hypothesis: Rust developers are scarce and expensive [unverified]
```

### 1.4 Design Search Paths

For each sub-question, design 2-4 specific search queries. Prioritize by expected information gain.

| Sub-Q | Search Query | Expected Gain | Priority |
|-------|-------------|--------------|----------|
| Q1 | "Rust vs Python backend performance benchmark 2025" | High (hard data) | 1 |
| Q1 | "Rust web service latency production" | Medium | 2 |

See [references/search-path-design.md](references/search-path-design.md) for query design patterns.

### 1.5 Counter-Evidence Search (Mandatory for L2+)

For each core hypothesis, design **at least one reverse search** aimed at disproving it. Confirmation bias is the single largest source of research error — the only defense is actively seeking disconfirming evidence.

```
Hypothesis: "Rust has better performance than Java"
  → Reverse query: "Rust slower than Java production benchmark"
  → Reverse query: "Rust performance regression real world"
  → Reverse query: "cases where Rust underperformed Java"

Hypothesis: "React is the best choice for our dashboard"
  → Reverse query: "why not React for dashboard"
  → Reverse query: "React alternative dashboard performance"
  → Reverse query: "teams that moved away from React and why"
```

**Rule:** If you cannot find evidence against a hypothesis, note that too — but don't treat absence of counter-evidence as proof. Mark it: `[未找到反证]` (no counter-evidence found).

### 1.6 Execute as Batch, Not Sequentially

Issue independent search queries in **parallel** (single message with multiple tool calls), not chained with `&&`. Independent queries don't need to wait for each other.

---

## Phase 2: Execute (Search)

Run the prioritized search queries. For each result:

1. **Fetch primary sources** — not just search snippets. A claim without a verified URL is unreliable.
2. **Cross-reference** — if two independent sources agree, confidence increases. If they conflict, flag the contradiction.
3. **Respect rate limits** — batch parallel queries within tool limits, don't spam.

---

## Phase 3: Evaluate (After Each Round)

### 3.1 Score Evidence Quality

For each sub-question, evaluate whether the evidence is sufficient:

| Status | Criteria |
|--------|----------|
| ✅ **Sufficient** | Multiple independent sources agree, primary data cited, no major contradictions |
| ⚠️ **Partial** | One source or conflicting sources, or only search snippets without primary verification |
| ❌ **Insufficient** | No relevant results, or all sources are low-quality (unverified blogs, outdated, clickbait) |

### 3.2 Identify Gaps

List what's still missing:
- Which sub-questions have insufficient evidence?
- What data was expected but not found?
- Are there conflicting claims that need resolution?

### 3.3 Source Weighting (Quality Over Quantity)

When evidence conflicts, resolve by source authority, not by counting voices. One authoritative source outweighs many low-quality sources.

| Source Tier | Weight | Examples | Trust Rule |
|-------------|--------|----------|------------|
| **T1: Authoritative** | 10× | Official docs, RFCs, language specs, published research papers, vendor security advisories | Trust over any number of T3/T4 sources |
| **T2: Semi-Authoritative** | 3× | Major project READMEs, well-maintained Wikipedia pages, respected technical books, government publications | Trust over T3/T4, but cross-check against T1 |
| **T3: Community** | 1× | Stack Overflow (accepted+high-vote), GitHub issues (maintainer-confirmed), respected tech blogs (e.g., rachelbythebay, danluu) | Useful but not authoritative |
| **T4: Low-Authority** | 0.1× | Personal blogs (unverified), Medium articles, forum posts, Reddit comments, AI-generated content | Use only as pointers to T1-T3 sources |

**Conflict Resolution Rule:**
```
If T1 source contradicts 20 T3/T4 sources:
  → Defer to T1, note the contradiction, cite the T1 source explicitly

If two T1 sources contradict:
  → Flag as [冲突], present both, do NOT reconcile artificially

If no T1/T2 source exists for a claim:
  → Downgrade confidence to Low, mark [社区] sources explicitly
```

### 3.4 Freshness Evaluation

Evidence decays. What was true in 2021 may be false in 2026. Score each source for freshness relative to its domain.

| Domain | Max Age for "Current" | Reasoning |
|--------|----------------------|-----------|
| AI/LLM tools, models, benchmarks | 6 months | Field moves weekly |
| Web frameworks, frontend libraries | 1 year | Major versions change APIs |
| Programming language features | 1 year | Compiler/stdlib evolve steadily |
| Database, infrastructure, OS | 2 years | Slower release cycles, stable core |
| Security vulnerabilities, CVEs | 3 months (patch) / 2 years (pattern) | Vulnerabilities age fast; patterns persist |
| Academic CS theory, algorithms | 5 years | Fundamentals don't change much |
| Hiring market, salary data | 1 year | Market conditions shift |

**Freshness Markers:**

| Marker | Meaning |
|--------|---------|
| No marker | Within recommended max age |
| `[时效: N年前]` | Older than recommended max age — may be outdated |
| `[时效: 无法确认]` | Source has no date — treat as potentially stale |

**Rule:** If a claim rests entirely on sources older than the domain's max age, mark conclusion confidence as Low and note: `[证据过时]`.

### 3.5 Decide: Continue or Conclude?

| Condition | Action |
|-----------|--------|
| All sub-questions ✅ Sufficient | Proceed to Phase 4 (Synthesize) |
| Some sub-questions ⚠️ Partial | Design Round 2 queries targeting gaps only |
| All sub-questions ❌ Insufficient | Broaden search scope, try alternative terms, search adjacent topics |

---

## Phase 4: Synthesize (Output)

### 4.1 Structure the Answer

```
## Conclusion
[Direct answer to the main question, 1-3 sentences]

## Evidence
### Sub-Q1: [Question]
- [Finding] [Source: URL, credibility]
- [Finding] [Source: URL, credibility]
**Confidence:** High / Medium / Low

### Sub-Q2: [Question]
...

## Contradictions & Uncertainty
- [Point A] conflicts with [Point B] — unresolved
- [Topic] has insufficient evidence — more research needed

## Sources by Credibility
| Source | Type | Credibility |
|--------|------|-------------|
| docs.python.org | Official docs | [文档] High |
| github.com/.../issue | Issue discussion | [社区] Medium |
| some-blog.com | Personal blog | [社区] Low |
```

### 4.2 Source Credibility Standards

Follow `.clinerules` 宪法一 evidence labeling:

| Label | Meaning | Example |
|-------|---------|---------|
| `[实测]` | You executed/tested it yourself | Running a command and seeing output |
| `[源码]` | Confirmed in source code | Reading GitHub repo code |
| `[文档]` | Official documentation or README | docs.python.org, man pages |
| `[社区]` | Forum/issue/blog experience | Stack Overflow, GitHub issues, blog posts |
| `[推测]` | Unverified inference | Must be marked "未验证" |

Credibility order: 实测 > 源码 > 文档 > 社区 > 推测

### 4.3 Mark Uncertainty Explicitly

Never present a guess as fact. Use explicit markers:
- `[未验证]` for unverified claims
- `[无法确认]` for questions you couldn't answer
- `[冲突]` for contradictory findings

---

## Round 2+: Iterative Deepening

If Round 1 evidence is insufficient, plan Round 2:

1. **Focus only on gaps** — don't re-search what's already sufficient
2. **Refine queries** — use more specific terms, different angles, alternative keywords
3. **Go deeper** — follow citations from Round 1 sources, search for authors/organizations referenced
4. **Broaden if stuck** — search adjacent topics, use "vs" comparisons, search in different communities

**Stop condition:** All sub-questions ✅ sufficient, OR 3 rounds completed with no meaningful new evidence, OR user interrupts.

---

## Anti-Patterns (Captured from Real Failures)

1. **Blind first search:** Searching the exact user question without decomposition or hypothesis. Result: shallow top-3 results with no depth.
2. **Single-source conclusion:** Finding one plausible article and stopping. Result: confirmation bias.
3. **No evidence labeling:** Stating conclusions without marking source type. Result: reader can't assess credibility.
4. **Sequential dependent searches:** Using `&&` chains for independent queries. Result: wasted time. Batch parallel queries instead.
5. **Searching before planning:** Diving into search without clarifying what "good enough" looks like. Result: infinite searching, no conclusion.

## References

| Topic | File |
|-------|------|
| Search query design patterns | [references/search-path-design.md](references/search-path-design.md) |