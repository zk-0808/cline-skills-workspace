---
name: skill-installer
description: "Use when discovering, evaluating, installing, or managing Agent Skills. Covers skill discovery, pre-install assessment, multi-strategy installation with automatic fallback, platform-specific commands, and post-install verification."
---

# Skill Installer

## Overview

This skill teaches the agent how to correctly install and manage Agent Skills. It prevents the common failure pattern of blindly retrying a single installation tool without verifying compatibility first.

**Core principle:** Verify before executing. Fall back, don't retry.

## When to Use

Use when:
- User asks to install, add, or set up a skill
- User wants to search for or discover skills
- An existing skill installation has failed and needs recovery
- User asks about skill management (list, update, remove)

## Installation Decision Flow

```
DISCOVER Skill
  → EVALUATE: Read README / SKILL.md for compatibility & dependencies
  → VERIFY ENVIRONMENT: Check required CLI tools exist
  → INSTALL (try in order, stop on first success):
      1. npx skills add <repo> --skill <name> --yes --global
         ── BUT FIRST: run `npx skills --version` to verify tool works
      2. git clone + manual copy to agent skills directory
      3. Download release archive + extract
  → VERIFY: SKILL.md exists, YAML frontmatter is valid
  → On failure: consult error dictionary, auto-switch to next strategy
```

## Iron Rules

1. **Never retry the same failing command more than once.** One retry with adjusted flags is acceptable. After that, switch to the next strategy.
2. **Always test CLI tools before using them.** Run `--version` or `--help` first. If the tool doesn't run, skip it entirely.
3. **Windows paths with spaces require PowerShell, not cmd.** Always use `powershell -ExecutionPolicy Bypass -Command "Copy-Item ..."` for copy operations involving paths with spaces.
4. **Check `.agents` is a directory, not a file.** Many install failures trace to `ENOTDIR` errors. Verify with `Test-Path -PathType Container`.
5. **Do not assume `npx skills` works.** This tool may fail due to PowerShell execution policy, TUI blocking, or path conflicts. Always have fallback strategy 2 ready.

## Strategy 1: npx skills CLI (preferred, verify first)

```bash
# Step 1: Verify the tool works
npx skills --version

# Step 2: If OK, install
npx --yes skills add <repo-url> --skill <skill-name> --yes --global

# Step 3: If blocked by PowerShell execution policy (Windows)
cmd /c "npx --yes skills add <repo-url> --skill <skill-name> --yes --global"
```

**Common failure mode:** The `skills` CLI launches an interactive TUI to select agents. Use `--yes --global` to skip. If still blocked, abandon this strategy immediately.

**When to skip Strategy 1 entirely:**
- `npx skills --version` fails or hangs
- PowerShell execution policy cannot be bypassed
- `ENOTDIR` error on `.agents` path
- Interactive TUI appears despite `--yes` flag

## Strategy 2: Git Clone + Manual Copy (most reliable)

This strategy always works when git is available.

```bash
# Step 1: Clone to a temp directory
git clone <repo-url> <temp-dir>

# Step 2: Identify the skill subdirectory
# Most repos have structure: <repo>/skills/<skill-name>/
# Some have SKILL.md at repo root

# Step 3: Copy to agent skills directory
# For Cline / Claude Code (project-local):
#   .claude/skills/<skill-name>/

# Linux/macOS:
cp -r <temp-dir>/skills/<skill-name>/ .claude/skills/<skill-name>/

# Windows (cmd, paths without spaces):
xcopy /E /I /Y <temp-dir>\skills\<skill-name>\ .claude\skills\<skill-name>\

# Windows (PowerShell, paths with OR without spaces — ALWAYS use this):
powershell -ExecutionPolicy Bypass -Command "Copy-Item -Path '<temp-dir>/skills/<skill-name>/*' -Destination '.claude/skills/<skill-name>/' -Recurse -Force"
```

**Platform-specific notes:** See [references/platform-commands.md](references/platform-commands.md) for full command equivalents across Windows/Linux/macOS.

## Strategy 3: Direct Download + Extract (no git fallback)

Use when git is unavailable.

```bash
# Download release archive
curl -L <release-zip-url> -o /tmp/skill.zip
# or
wget <release-zip-url> -O /tmp/skill.zip

# Extract
unzip /tmp/skill.zip -d /tmp/skill-extracted

# Find SKILL.md and copy to agent skills directory
```

## Post-Install Verification

After installation, verify:

1. **File exists:** `.claude/skills/<skill-name>/SKILL.md` is present
2. **YAML frontmatter valid:** Contains `name:` and `description:` fields within `---` delimiters
3. **References intact:** If the skill has a `references/` directory, all linked files exist
4. **No broken symlinks:** On Linux/macOS, verify symlinks resolve

```bash
# Quick verification (any platform)
head -5 .claude/skills/<skill-name>/SKILL.md
ls .claude/skills/<skill-name>/references/ 2>/dev/null || echo "No references dir"
```

## Skill Discovery

When the user asks to find skills but doesn't provide a specific repo:

1. **Search DuckDuckGo / web:** `"<topic> skill claude code" site:github.com`
2. **Check known marketplaces:**
   - https://github.com/anthropics/skills (official)
   - https://github.com/alirezarezvani/claude-skills (community collection)
   - https://skills.sh/ (registry)
   - https://mcpmarket.com/tools/skills (marketplace)
3. **Evaluate results by:** stars, recency of commits, license, Security Risk Assessment if available
4. **Present top 2-3 options** with trade-offs, recommend the best

## Pre-Install Assessment Checklist

Before installing any skill, check:

- [ ] **Source:** Is this a trusted repository? Check stars, contributors, license
- [ ] **Compatibility:** Does SKILL.md list required tools? Are they available?
- [ ] **Dependencies:** Run `rg --version`, `fd --version`, `sg --version` if skill requires them
- [ ] **Scope:** Does the skill use `allowed-tools` to restrict what it can invoke?
- [ ] **Conflicts:** Does a skill with the same name already exist?

## Error Dictionary

| Error | Likely Cause | Action |
|-------|-------------|--------|
| `ENOTDIR: not a directory, mkdir '.agents'` | `.agents` is a file, not a directory | Delete file, create directory, retry; or skip to Strategy 2 |
| `PSSecurityException` / `UnauthorizedAccess` | PowerShell execution policy | Use `powershell -ExecutionPolicy Bypass` or switch to `cmd /c` |
| `npm ERR! code E404` | npx package not found | Check package name spelling; skip to Strategy 2 |
| Interactive TUI appears | `--yes` flag not passed or ignored | Send Enter key programmatically; if fails, skip to Strategy 2 |
| `Copy-Item : Cannot copy container to existing leaf item` | Destination is a file, not directory | Delete destination file first, then retry |
| `failed to install ... → Claude Code` | Agent-specific path conflict | Install only to project-local `.claude/skills/` instead of global |

## References

| Topic | File |
|-------|------|
| Platform-specific command equivalents | [references/platform-commands.md](references/platform-commands.md) |

## Anti-Patterns Captured from Real Failures

1. **Blind retry loop:** Running `npx skills add` 3+ times with minor flag variations instead of checking if the tool itself works.
2. **Wrong copy tool for the platform:** Using `xcopy` or `robocopy` on Windows paths with spaces, instead of PowerShell `Copy-Item`.
3. **Ignoring the first error:** Seeing `ENOTDIR` and retrying the same command instead of investigating the `.agents` path.
4. **Assuming tool availability:** Running `npx skills add` without first verifying `npx skills --version` works.