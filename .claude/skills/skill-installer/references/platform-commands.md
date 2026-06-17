# Platform-Specific Command Equivalents

This reference maps common skill installation operations across Windows (cmd/PowerShell), Linux, and macOS.

## Core Principles

1. **Prefer PowerShell on Windows** — it handles paths with spaces correctly, unlike `cmd` built-ins.
2. **On Linux/macOS, use `cp -r`** — simpler and faster than invoking platform-agnostic alternatives.
3. **Test before using** — any command involving paths with spaces must be verified on the target platform.

## File Copy (Recursive)

| Platform | Command |
|----------|---------|
| Linux / macOS | `cp -r <src>/ <dst>/` |
| Windows (cmd, no spaces) | `xcopy /E /I /Y <src>\ <dst>\` |
| Windows (PowerShell, always safe) | `powershell -ExecutionPolicy Bypass -Command "Copy-Item -Path '<src>/*' -Destination '<dst>/' -Recurse -Force"` |

**Anti-patterns to avoid:**
- `robocopy` on paths with spaces — argument parsing is unreliable in `cmd`
- `xcopy` with double-quoted paths containing spaces inside `cmd /c` — the quotes nest incorrectly
- PowerShell `ForEach-Object { $_.FullName }` — must use `$_` not `.` (PowerShell 5.1 syntax)

## Directory Creation

| Platform | Command |
|----------|---------|
| Linux / macOS | `mkdir -p <path>` |
| Windows (cmd) | `mkdir <path>` (auto-creates parents) |
| Windows (PowerShell) | `New-Item -Path '<path>' -ItemType Directory -Force` |

## Directory Existence Check

| Platform | Command |
|----------|---------|
| Linux / macOS | `test -d <path> && echo "is dir"` |
| Windows (cmd) | `if exist <path>\ (echo is dir) else (echo not dir)` |
| Windows (PowerShell) | `Test-Path -Path '<path>' -PathType Container` |

## Path Type Check (File vs Directory)

The `.agents` ENOTDIR bug: `.agents` exists as a *file* when it should be a *directory*.

| Platform | Check if directory | Check if file |
|----------|-------------------|---------------|
| Linux / macOS | `test -d ~/.agents` | `test -f ~/.agents` |
| Windows (PowerShell) | `Test-Path "$env:USERPROFILE\.agents" -PathType Container` | `Test-Path "$env:USERPROFILE\.agents" -PathType Leaf` |

**Fix when `.agents` is a file instead of a directory:**
```powershell
# Windows
powershell -ExecutionPolicy Bypass -Command "Remove-Item '$env:USERPROFILE\.agents' -Force; New-Item -Path '$env:USERPROFILE\.agents' -ItemType Directory -Force"
```

## Archive Extraction

| Platform | Command |
|----------|---------|
| Linux / macOS | `unzip <file>.zip -d <dest>/` |
| Windows (PowerShell) | `Expand-Archive -Path '<file>.zip' -DestinationPath '<dest>/' -Force` |

## Git Clone

| Platform | Command (same on all) |
|----------|----------------------|
| All | `git clone <url> <dest-dir>` |

**Note:** Git works identically across platforms. The only concern is that Windows `cmd` may have issues with very long paths (>260 chars). Use PowerShell if needed.

## npx Execution

| Platform | Command |
|----------|---------|
| Linux / macOS | `npx --yes <package> <args>` |
| Windows (cmd) | `cmd /c "npx --yes <package> <args>"` (if PowerShell blocked) |
| Windows (PowerShell, allowed) | `npx --yes <package> <args>` |
| Windows (PowerShell, blocked) | `powershell -ExecutionPolicy Bypass -Command "npx --yes <package> <args>"` fails — use `cmd /c` instead |

**PowerShell Execution Policy Workaround:**
- `npx.ps1` may be blocked with `PSSecurityException`
- Solution: route through `cmd /c` which invokes `npx.cmd` directly
- Do NOT try `Set-ExecutionPolicy` — it requires admin and is overkill

## Shell Command Chaining

| Platform | Separator |
|----------|-----------|
| Linux / macOS (bash) | `&&` (sequential, stop on fail) |
| Windows (cmd) | `&&` (sequential, stop on fail) |
| Windows (PowerShell 5.1) | `;` (sequential, always continues) |

**Important:** PowerShell 5.1 does NOT support `&&`. Use `;` for sequential execution. Check exit codes manually with `$LASTEXITCODE` if needed.

## File Listing (Verify Installation)

| Platform | Command |
|----------|---------|
| Linux / macOS | `ls -la .claude/skills/<name>/` |
| Windows (cmd) | `dir .claude\skills\<name>\` |
| Windows (PowerShell) | `Get-ChildItem '.claude/skills/<name>/' -Recurse -Name` |