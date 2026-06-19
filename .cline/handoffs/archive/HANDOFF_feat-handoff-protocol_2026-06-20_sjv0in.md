---
schema_version: "1.0"
status: done
branch: feat/handoff-protocol
goal: feat/handoff-protocol 收尾 → P0-A memory_export/import 设计文档 → PR 合并
created_at: 2026-06-19T13:04:12+08:00
updated_at: 2026-06-20T00:40:05+08:00
project_hash: 6ba9751232ab
---

## completed
- feat/handoff-protocol 主功能实现（handoff_write / handoff_resume / handoff-fs / handoff-schema）
- Memory 系统基础 CRUD（memory_commit / memory_recall / memory_list）
- compact_context 工具
- getProjectHashByGitUrl 跨设备 hash 实现（不替代现有 hash）
- 测试套件（test-handoff-handlers / test-handoff-lib / test-memory / test-project-hash / test-escape-fts）
- 外部评审反馈修复（2026-06-18）
- 工具校验脚本 tools/validate-skills.js
- 7 个 SKILL.md 完整化（2026-06-18 sprint）
- P0-A：docs/memory-export-import-design.md 设计文档完成

## in_progress

## next_action
- 用 finishing-a-development-branch 流程创建 PR 合并到 main
- [未来 feat/test-isolation 分支]：让 handoff handler 接受可选 cwd 参数
- [未来 产品方向决策]：tools/*.mjs 分发策略
- [未来 skills/session-archaeology]：工具升级为正式 Skill
- P1 待评估：调研 Cline 原生 /compact 实现

## do_not
- 不要把 install.mjs 改回 .js（用户文件 = 神圣，T-05）
- 不要替换 getProjectHash 为 getProjectHashByGitUrl（26+ memory 会看似消失，D-06）
- 不要把默认 Shell 切回 cmd.exe（无 Shell Integration，规范 1）
- 不要在 P0-C README Before/After 之前先实现 benchmark 框架（避免「先宣传后补证据」）
- 不要给 GOAL_REQUIRED 拆多个错误码（GPT 评审：单错误码 + diagnostics 已足够）
- 不要让 handoff_write 自动从 archive 继承旧 goal（违反 T-05 + 混淆延续/新建语义）
- 不要在链式命令中裸用 git log/diff/show（规范 10：必须 git --no-pager <cmd>）
- 不要把 P0-A export/import 设计文档塞进收尾会话（应单独发起聚焦会话）
- 不要直接合并到 main（必须通过 PR 评审）
- 在跑 skills-mcp-server/test-handoff-handlers.js 之前要意识到它会污染真实 .cline/handoffs/active 文件 — 跑前先 git stash 或备份 active；根本修复待 feat/test-isolation 分支
- 不要新增 P0 功能（Sprint 期间只做验证 + 修复，不扩展）

## artifacts
- .clinerules
- DEV_NOTES.md
- LEARNINGS.md
- tools/validate-skills.js
- docs/memory-export-import-design.md（待新建，P0-A）
- skills-mcp-server/handlers/handoff-write.js
- skills-mcp-server/handlers/handoff-resume.js
- skills-mcp-server/test-handoff-handlers.js
