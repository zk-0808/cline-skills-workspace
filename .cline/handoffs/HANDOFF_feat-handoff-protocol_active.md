---
schema_version: "1.0"
status: active
branch: feat/handoff-protocol
goal: 通过 dogfooding sprint 验证体系价值并落实外部评审反馈；本会话完成 Shell 基建 + project-hash 跨设备
  fallback + 一键安装脚本
created_at: 2026-06-19T13:04:12+08:00
updated_at: 2026-06-19T13:04:12+08:00
project_hash: 6ba9751232ab
---

## completed
- Phase 2A 基础库 + 58/58 单元测试全绿
- Phase 2B handoff_write/resume handlers 完成
- 外部评审反馈落实（README/positioning/interview-answers）
- feat/handoff-protocol 分支已 push 到远程
- [2026-06-19 早] cmd.exe 切换 → 实测发现 Shell Integration 缺失
- [2026-06-19 中] winget install Microsoft.PowerShell（pwsh 7.6.2 → C:/Program Files/PowerShell/7/）
- [2026-06-19 中] settings.json profile → PowerShell 7（显式路径）
- [2026-06-19 中] .clinerules 规范 7 二次重写：PS 7 主路径，cmd/PS5.1 兜底
- [2026-06-19 中] LEARNINGS.md 追加 Q0-Q5 折返复盘（Shell Integration 维度被遗漏）
- [2026-06-19 中] Unblock-File 解决 RemoteSigned 仍拦截 npm.ps1（NTFS Zone.Identifier 标记）
- [2026-06-19 中] memory 同步：#27 PS7 偏好 + #28 unblock 教训（删 #26 cmd 偏好）
- [2026-06-19 下] external-review §6「Sprint 期内必做」6 项全部核对 ✅
- [2026-06-19 下] D2: lib/git.js 加 normalizeRemoteUrl + getRemoteUrl
- [2026-06-19 下] D2: lib/db.js 加 getProjectHashByGitUrl（不替代旧 hash，保持兼容）
- [2026-06-19 下] D2: 写 test-project-hash.js（23/23），全测 132/132 通过
- [2026-06-19 下] D1: install.mjs 一键安装脚本（跨平台 + 自动检测 Cline settings + 彩色输出）
- [2026-06-19 下] install.mjs --dry-run 实测通过
- [2026-06-19 下] README 改 1 行命令安装，5 步手动流程折叠为 details
- [2026-06-19 下] validate-skills.js: 0 errors / 4 warnings

## in_progress

## next_action
- git status 检查未提交改动 → git add . → git commit -m 'feat: PS7 + project-hash git URL fallback + install.mjs'
- git push origin feat/handoff-protocol → 在 GitHub 开 PR
- Sprint 06-21 结束日 → 写 dogfooding-sprint-retrospective.md（基于这 3 天观察）
- Sprint 后可选 P1：memory_export/import（用 getProjectHashByGitUrl 作为绑定键）/ benchmark 标注样本

## do_not
- 不要新增 P0 功能（Sprint 期间只做验证 + 修复，不扩展）
- 不要触碰主动『不做清单』方向（向量库 / Web UI / LLM in server）
- 不要继续说『零 native 依赖』，必须改为『零额外原生编译依赖』
- 不要直接合并到 main（必须通过 PR 评审）
- 不要再往 .clinerules 规范 7 加 PowerShell/cmd 绕过指令——PS 7 主路径已根治
- 不要切换默认 Shell 为 cmd.exe（缺 Shell Integration，命令输出会丢失）
- 不要替换 getProjectHash 为 getProjectHashByGitUrl（会让现有 26+ 条 memory 和 active handoff 看似消失，需先实现 memory_export/import 迁移）
- 不要把 install.mjs 改回 .js（根 package.json 是 commonjs，必须保持 .mjs 扩展名）

## artifacts
- skills-mcp-server/handlers/handoff-resume.js
- skills-mcp-server/handlers/handoff-write.js
- skills-mcp-server/lib/handoff-schema.js
- skills-mcp-server/lib/handoff-fs.js
- skills-mcp-server/lib/git.js
- skills-mcp-server/lib/db.js
- skills-mcp-server/index.js
- skills-mcp-server/test-project-hash.js
- skills/handoff-protocol/SKILL.md
- docs/handoff-schema.md
- docs/dogfooding-sprint.md
- docs/dogfooding-log.md
- docs/external-review-2026-06-18.md
- .clinerules
- LEARNINGS.md
- install.mjs
- README.md
