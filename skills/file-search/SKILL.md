---
name: file-search
version: 1.0.0
description: 文件搜索 — 搜索代码库中的文本模式、AST 结构、按文件名查找、PDF 解析，为任务构建上下文信息
category: domain
preferred_mode: any
tools: [search_files, read_file, list_files]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---

# File Search Skill

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


Efficient CLI search tools for AI agents.

## Tool Selection Guide

| Task | Use | Instead of |
|------|-----|------------|
| Search text in code files | `rg` (ripgrep) | `grep`, `grep -r` |
| Find files by name/path | `fd` | `find`, `ls -R` |
| Structural/syntax-aware code search | `sg` (ast-grep) | regex hacks |
| Apply rule packs (security/lint, taint) | `semgrep` | regex CI checks |
| Search PDFs, Office docs, archives | `rga` (ripgrep-all) | manual extraction |
| Count lines of code by language | `tokei` | `cloc`, `wc -l` |
| Code stats with complexity metrics | `scc` | `cloc`, `tokei` |

**Decision flow:** text → `rg` | structural → `sg` | rule packs →
`semgrep` | filenames → `fd` | PDFs/archives → `rga` | LOC →
`tokei`/`scc`

## Quick Examples

```bash
rg 'def \w+\(' -t py src/          # rg: text search in Python files
rg -c 'TODO' -t js | wc -l         # rg: count first, then drill down
sg --pattern 'console.log($$$)' --rewrite 'logger.info($$$)' --lang js  # sg: structural replace
fd -g '*.test.ts' --changed-within 1d  # fd: -g for compound suffixes (NOT -e)
fd -g '*_test.go' -X rg 'func Test'   # fd+rg: find files, verify contents
rga 'quarterly revenue' docs/       # rga: search inside PDFs/archives
tokei --sort code                   # tokei: language stats
scc --wide                          # scc: complexity + COCOMO
```

## Best Practices

1. **Start narrow.** Specify types (`-t`, `--lang`, `-e`), scope dirs, count first (`rg -c`).
2. **Exclude noise** (`-g '!vendor/'`, `fd -E node_modules`).
3. **Batch independent queries.** Union patterns with `rg -e P1 -e P2 -e P3` (one walk, one process), or issue distinct queries as parallel tool calls in a single message — never sequential `&&` chains for independent searches.
4. **`--json`** for programmatic processing.
5. **rg ≠ fd types.** `rg -t ts` includes `.tsx`; `fd -e ts` does NOT. No `-t tsx` in rg.

See [references/search-strategies.md](references/search-strategies.md).

## Beyond Local Files

If local search finds nothing and context lives in issues/PRs/external
docs — hand off (`gh`, Jira, WebFetch). Issue keys in comments signal this.

See [references/remote-handoff.md](references/remote-handoff.md).

## References

| Topic | File |
|-------|------|
| rg flags, patterns, recipes | [references/ripgrep-patterns.md](references/ripgrep-patterns.md) |
| ast-grep patterns by language | [references/ast-grep-patterns.md](references/ast-grep-patterns.md) |
| semgrep rules and taint mode | [references/semgrep-patterns.md](references/semgrep-patterns.md) |
| fd flags, usage, fd+rg combos | [references/fd-guide.md](references/fd-guide.md) |
| rga formats, usage, caching | [references/rga-guide.md](references/rga-guide.md) |
| tokei and scc usage | [references/code-metrics.md](references/code-metrics.md) |
| Search targeting strategies | [references/search-strategies.md](references/search-strategies.md) |
| Tool comparison and decision guide | [references/tool-comparison.md](references/tool-comparison.md) |
| Remote context handoff guide | [references/remote-handoff.md](references/remote-handoff.md) |
