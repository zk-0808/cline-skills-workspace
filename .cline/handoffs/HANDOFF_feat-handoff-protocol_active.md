---
schema_version: "1.0"
status: active
branch: feat/handoff-protocol
goal: feat/handoff-protocol 收尾 → P0-A memory_export/import 设计文档 → PR 合并
created_at: 2026-06-19T13:04:12+08:00
updated_at: 2026-06-19T23:27:50+08:00
project_hash: 6ba9751232ab
---

## completed
- B benchmark-plan.md 设计完成
- D dogfooding-sprint-retrospective.md 完成（Sprint Day 2）
- P0 handoff_write GOAL_REQUIRED bug 调查 + 修复（语义边界，非状态机 bug；注入诊断信息）
- test-handoff-handlers.js 新增 4 个用例（含 done 后再次 write 的边界）
- docs/handoff-schema.md §3.4 新增「终态语义」章节
- 全部测试 141/141 通过
- validate-skills.js 0 ERROR
- .clinerules 规范 1 新增「交互态等同于阻塞」+ 新增规范 10「命令非交互化检查」
- LEARNINGS.md 沉淀「PowerShell 7 切换折返」「pager 卡死」「handoff 测试污染破案」「会话时间戳追溯评估」四条复盘
- tools/analyze-recent-tasks.mjs + tools/inspect-task-window.mjs 入仓（session-archaeology 工具）
- 22:50 active handoff 神秘消失事件破案：真凶是 test-handoff-handlers.js 用 path.resolve(__dirname,'..') 当 projectRoot，直接污染真实 .cline/handoffs/，归档用例移走 active 文件后未恢复
- 5 个 commit 全部推送 origin/feat/handoff-protocol（HEAD = eb8aaa6）

## in_progress

## next_action
- P0-A：单独会话写 docs/memory-export-import-design.md（导出格式 / project_id 选择 / 迁移策略 / 兼容策略，仅设计不实现）— 不要塞进收尾会话
- P0-A 完成后用 finishing-a-development-branch 流程合并 PR 到 main
- [未来 feat/test-isolation 分支]：让 handoff_write/handoff_resume handler 接受可选 cwd 参数，把 test-handoff-handlers.js 切到 os.tmpdir() — 修测试污染真实工作树的根因
- [未来 skills/session-archaeology]：把 tools/analyze-recent-tasks.mjs + tools/inspect-task-window.mjs 升级为正式 Skill
- P1 待评估（独立任务）：调研 Cline 原生 /compact 实现，决定是否做窗口内续命 — 见 memory ID=31

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
- skills-mcp-server/handlers/handoff-write.js
- skills-mcp-server/handlers/handoff-resume.js
- skills-mcp-server/test-handoff-handlers.js
- docs/handoff-schema.md
- docs/dogfooding-sprint-retrospective.md
- docs/benchmark-plan.md
- .clinerules
- LEARNINGS.md
- tools/analyze-recent-tasks.mjs
- tools/inspect-task-window.mjs
