---
schema_version: "1.0"
status: active
branch: feat/handoff-protocol
goal: Sprint 后 P0 收尾：feat/handoff-protocol 分支闭环（GOAL_REQUIRED 诊断改进 + 命令非交互化规则）+
  待办 P0-A memory_export/import 设计文档
created_at: 2026-06-19T13:04:12+08:00
updated_at: 2026-06-19T22:58:12+08:00
project_hash: 6ba9751232ab
---

## completed
- Phase 2A 基础库 + 58/58 单元测试全绿
- Phase 2B handoff_write/resume handlers 完成
- 外部评审反馈落实（README/positioning/interview-answers）
- feat/handoff-protocol 分支已 push 到远程
- Shell 基建：PowerShell 7（pwsh 7.6.2）+ Shell Integration ✅ + RemoteSigned + Unblock-File
- lib/git.js + lib/db.js: normalizeRemoteUrl / getRemoteUrl / getProjectHashByGitUrl
- test-project-hash.js（23/23）+ install.mjs 一键安装脚本
- validate-skills.js: 0 errors / 4 warnings（一直保持）
- B benchmark-plan.md 设计完成（待实现）
- D dogfooding-sprint-retrospective.md（Sprint Day 2 复盘）
- P0 handoff_write GOAL_REQUIRED bug：注入诊断信息（期望路径 / archive 候选 / 新建语义 / 修复方法）
- test-handoff-handlers.js 新增 4 个用例（done 后再次 write 的边界）
- docs/handoff-schema.md §3.4「终态语义」章节
- 全部测试 141/141 通过（handoff-handlers 19 / lib 58 / memory 13 / escape-fts 23 / project-hash 28）
- .clinerules 规范 10「命令非交互化检查」+ 规范 1「交互态等同于阻塞」补丁
- LEARNINGS 追加：终端 pager 卡死 Q0-Q5 复盘
- [本会话] commit f3f362c: feat(handoff): improve GOAL_REQUIRED diagnostics + schema §3.4
- [本会话] commit 7bd70c6: chore(rules): add §10 non-interactive command guard + log lesson

## in_progress

## next_action
- 推送 origin/feat/handoff-protocol（待用户授权，规范 6 高风险）
- P0-A：单独会话写 docs/memory-export-import-design.md（导出格式 / project_id 选择 / 迁移策略 / 兼容策略，仅设计不实现）
- P0-A 完成后用 finishing-a-development-branch 流程合并 PR 到 main
- 工作树保留 tools/analyze-recent-tasks.mjs（用户决定不入此 PR，下次单独处理）
- [待查] 22:50 active handoff 文件神秘消失事件根因调查（archive 同步创建但为空；handler 代码逻辑不会触达 fs 操作；可能是 MCP server 进程缓存旧版 handler 或外部 hook）

## do_not
- 不要新增 P0 功能（Sprint 期间只做验证 + 修复，不扩展）
- 不要触碰主动『不做清单』方向（向量库 / Web UI / LLM in server）
- 不要继续说『零 native 依赖』，必须改为『零额外原生编译依赖』
- 不要直接合并到 main（必须通过 PR 评审）
- 不要再往 .clinerules 规范 7 加 PowerShell/cmd 绕过指令——PS 7 主路径已根治
- 不要切换默认 Shell 为 cmd.exe（缺 Shell Integration，命令输出会丢失）
- 不要替换 getProjectHash 为 getProjectHashByGitUrl（会让现有 26+ 条 memory 和 active handoff 看似消失，需先实现 memory_export/import 迁移）
- 不要把 install.mjs 改回 .js（根 package.json 是 commonjs，必须保持 .mjs 扩展名）
- 不要给 GOAL_REQUIRED 拆多个错误码（GPT 评审：单错误码 + diagnostics 已足够，避免调用方维护负担）
- 不要让 handoff_write 自动从 archive 继承旧 goal（违反 T-05 用户文件神圣 + 混淆延续/新建语义）
- 不要在链式命令中裸用 git log/diff/show（会进 pager 卡死 Cline，规范 10）—— 必须 git --no-pager <cmd>
- 不要把 P0-A export/import 设计文档塞进收尾会话——本会话无相关上下文积累，应单独发起聚焦会话

## artifacts
- skills-mcp-server/handlers/handoff-write.js
- skills-mcp-server/handlers/handoff-resume.js
- skills-mcp-server/lib/handoff-schema.js
- skills-mcp-server/lib/handoff-fs.js
- skills-mcp-server/lib/git.js
- skills-mcp-server/lib/db.js
- skills-mcp-server/test-handoff-handlers.js
- skills-mcp-server/test-project-hash.js
- docs/handoff-schema.md
- docs/dogfooding-sprint-retrospective.md
- docs/benchmark-plan.md
- .clinerules
- LEARNINGS.md
- tools/analyze-recent-tasks.mjs
- install.mjs
- README.md
