# Search Path Design Patterns

Practical patterns for constructing search queries that maximize information gain per search.

## Core Principles

1. **Prefer specific over general.** "Python async io multiplexing selectors epoll" beats "Python async".
2. **Use domain vocabulary.** Search in the language of practitioners, not lay explanations.
3. **Include constraints.** Add version, year, platform, or context to filter stale results.
4. **Cross-verify with alternative phrasings.** The same fact stated differently on independent pages raises confidence.

## Query Templates by Research Goal

### Fact Verification

```
"<claim>" site:<authoritative-domain>
"<claim>" -site:pinterest.com -site:quora.com
```

**Example:**
```
"Rust compiler uses LLVM for code generation" site:rust-lang.org
```

### Performance / Benchmark Data

```
"<tool-a> vs <tool-b> benchmark <year>" filetype:pdf OR site:github.com
"<metric> <tool> production" -"sponsored" -"ad"
```

**Example:**
```
"actix-web vs axum benchmark 2025"
"rust web server p99 latency production"
```

### Technology Maturity Assessment

```
"<tool> production <company>" OR "we migrated to <tool>"
"<tool> pain points" OR "<tool> not ready for production"
"<tool> roadmap <year>"
```

**Example:**
```
"actix-web production Discord" OR "we migrated to actix-web"
"rust backend adoption 2025 survey"
```

### Hiring / Ecosystem

```
"<role> salary <region> <year>" site:levels.fyi OR site:glassdoor.com
"<language> job market <year>"
"<tool> ecosystem <year>" OR "<tool> crate" site:crates.io
```

### Competitive / Alternative Analysis

```
"<tool-a> alternative" OR "why not <tool-a>"
"<tool-a> vs <tool-b> vs <tool-c>"
"migrating from <tool-a> to <tool-b>"
```

**Example:**
```
"why not tokio" OR "tokio alternative"
"tokio vs async-std vs smol 2025"
"migrating from tokio to glommio"
```

### Unknown Root Cause / Troubleshooting

```
"<error-message>" (exact phrase, in quotes)
"<symptom> <version> <OS>" (with context constraints)
site:github.com/<repo>/issues "<symptom>"
```

**Example:**
```
"ENOTDIR: not a directory, mkdir" ".agents" claude code
site:github.com/netresearch/file-search-skill/issues "ENOTDIR"
```

## Search Engine Syntax Reference

### DuckDuckGo (preferred for privacy, used via MCP)

| Syntax | Effect |
|--------|--------|
| `"exact phrase"` | Only results containing this exact phrase |
| `site:github.com` | Restrict to domain |
| `-word` | Exclude results with this word |
| `filetype:pdf` | Only PDF files |
| `intitle:keyword` | Keyword must be in page title |
| `OR` / `AND` | Combine terms (AND is implicit) |

### Combined Examples

```
"claude code" skills "search optimization" site:github.com
"agent skills" filetype:md -tutorial -beginner site:github.com/anthropics
intitle:"benchmark" "rust" "python" site:reddit.com/r/rust OR site:reddit.com/r/programming
```

## When to Expand vs Narrow

| Situation | Action |
|-----------|--------|
| Too few results (< 3) | Remove domain filter, drop quotes, use synonyms |
| Too many results (> 50) | Add `site:`, add quotes, add `intitle:`, add year |
| All results from one source | Remove that domain with `-site:`, search for alternative voices |
| Results too old | Add `2025` or `2026` as a keyword, use `site:...` for changelogs |
| Results too promotional | Add `-sponsored -ad -"affiliate link"`, prefer `site:github.com` or `site:stackoverflow.com` |

## Anti-Patterns

1. **Copy-pasting the user's question as a query.** "What should I use for my backend?" → useless. "Rust vs Go backend web framework production comparison 2025" → useful.
2. **Only searching once with one query.** Different sources rank for different phrasings. Cross-verify.
3. **Quoting fragments from memory without verifying.** If you "remember" a fact, search it to confirm before citing.
4. **Avoiding "negative" searches.** Searching "why X is great" plus "why X failed" gives a balanced view.