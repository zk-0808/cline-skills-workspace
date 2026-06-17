// ============================================================
// test-memory.js — 端到端测试 4 个新 handler
// 使用临时项目根，避免污染真实记忆库
// ============================================================

import fs from "fs";
import os from "os";
import path from "path";

// 设置临时项目根，让 db.js 把数据放到隔离目录
const TMP_PROJECT = path.join(os.tmpdir(), "cline-memory-test-" + Date.now());
fs.mkdirSync(TMP_PROJECT, { recursive: true });
process.env.CLINE_PROJECT_ROOT = TMP_PROJECT;

// 动态导入，确保环境变量先生效
const { handler: commit } = await import("./handlers/memory-commit.js");
const { handler: recall } = await import("./handlers/memory-recall.js");
const { handler: list }   = await import("./handlers/memory-list.js");
const { handler: compact } = await import("./handlers/compact-context.js");
const { closeAll } = await import("./lib/db.js");

let pass = 0, fail = 0;
function assert(cond, label) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else      { console.log(`  ❌ ${label}`); fail++; }
}
function getText(r) {
  return r?.content?.[0]?.text || "";
}

console.log(`\n=== Memory Test (project: ${TMP_PROJECT}) ===\n`);

// ---------- T1: commit 三种 kind ----------
console.log("[T1] memory_commit 三种 kind");
const r1 = commit({ kind: "semantic", content: "本项目用 ESM，不要写 require()", tags: ["js","esm"], source: "user", confidence: 1.0 });
assert(!r1.isError && /已持久化/.test(getText(r1)), "semantic 写入成功");

const r2 = commit({ kind: "procedural", content: "PowerShell 不支持 && 链式命令，需用 ;", tags: ["powershell","windows"], source: "[实测]" });
assert(!r2.isError, "procedural 写入成功");

const r3 = commit({ kind: "episodic", content: "2026-06-17 修复了 SKILL.md CRLF 校验问题", tags: ["bugfix","validator"] });
assert(!r3.isError, "episodic 写入成功");

// ---------- T2: 非法 kind 必须拒绝 ----------
console.log("\n[T2] 非法 kind 拒绝");
const r4 = commit({ kind: "garbage", content: "should fail" });
assert(r4.isError && /非法 kind/.test(getText(r4)), "非法 kind 报错");

// ---------- T3: 过短 content 拒绝 ----------
const r5 = commit({ kind: "semantic", content: "ok" });
assert(r5.isError && /太短/.test(getText(r5)), "过短 content 报错");

// ---------- T4: recall 全文检索 ----------
console.log("\n[T3] memory_recall");
const r6 = recall({ query: "PowerShell" });
const t6 = getText(r6);
assert(!r6.isError && /链式/.test(t6), "FTS5 检索到 PowerShell 记忆");

const r7 = recall({});
assert(!r7.isError && /semantic|procedural|episodic/.test(getText(r7)), "无 query 返回最新列表");

const r8 = recall({ kind: "episodic" });
const t8 = getText(r8);
assert(!r8.isError && /CRLF/.test(t8) && !/ESM/.test(t8), "kind 过滤生效（只返回 episodic）");

// ---------- T5: list / stats ----------
console.log("\n[T4] memory_list");
const r9 = list({ action: "stats" });
const t9 = getText(r9);
assert(!r9.isError && /3/.test(t9), "stats 显示总数 3");

// ---------- T6: compact_context ----------
console.log("\n[T5] compact_context");
const r10 = compact({
  objective: "为 skills-mcp-server 增加跨会话记忆",
  progress_done: ["实现 4 个 handler"],
  progress_pending: ["更新 README"],
  next_action: "读取 README.md 添加 Memory 章节",
  persist: false,
});
const t10 = getText(r10);
assert(!r10.isError && /任务目标/.test(t10) && /新会话第一步/.test(t10) && /读取 README/.test(t10), "compact 生成交接包");

const r11 = compact({ objective: "x" });  // 缺 next_action
assert(r11.isError, "compact 缺 next_action 必填字段时报错");

// ---------- T7: persist=true 应写入一条 episodic ----------
const r12 = compact({
  objective: "test persist",
  next_action: "test",
  persist: true,
});
assert(!r12.isError, "compact persist=true 成功");

const r13 = recall({ query: "test persist" });
assert(!r13.isError && /test persist/.test(getText(r13)), "persist 后能 recall 到");

// ---------- 收尾 ----------
closeAll();

console.log(`\n=== 结果: ${pass} passed, ${fail} failed ===\n`);

// 清理临时目录（保留 ~/.cline-skills/memory/{hash}/，因为路径是基于 project hash）
// 不清理也无所谓，反正每次测试新 timestamp

if (fail > 0) process.exit(1);