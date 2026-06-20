// ============================================================
// test-isolation.js — 回归测试：路径/哈希隔离验证
// 验证两个不同 projectRoot 派生出的 handoff 路径与 memory hash
// 互不交叉，防止未来重构路径解析逻辑时破坏隔离。
// ============================================================
// 跑法：node skills-mcp-server/test-isolation.js
// ============================================================

import path from "path";
import os from "os";
import crypto from "crypto";
import { getHandoffDir } from "./lib/handoff-fs.js";
import { getProjectHash, ROOT as MEMORY_ROOT } from "./lib/db.js";

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    fail++;
    failures.push({ name, err });
    console.log(`  ❌ ${name}\n     ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "断言失败");
}

// ============================================================
// 测试数据：两个不同的项目根路径
// ============================================================

const projectA = path.resolve("/tmp/project-alpha");
const projectB = path.resolve("/tmp/project-beta");

// ============================================================
// 1. Handoff 路径隔离
// ============================================================

test("handoff: 不同 projectRoot 的 handoff 目录不同", () => {
  const dirA = getHandoffDir({ cwd: projectA });
  const dirB = getHandoffDir({ cwd: projectB });

  assert(dirA.projectRoot === projectA, `A projectRoot expected ${projectA}, got ${dirA.projectRoot}`);
  assert(dirB.projectRoot === projectB, `B projectRoot expected ${projectB}, got ${dirB.projectRoot}`);
  assert(dirA.isLocal === false, "A 默认非 local");
  assert(dirB.isLocal === false, "B 默认非 local");
  assert(dirA.dir !== dirB.dir, `handoff 目录应不同: ${dirA.dir} vs ${dirB.dir}`);
  assert(!dirA.dir.startsWith(dirB.dir), "A 不应是 B 的前缀");
  assert(!dirB.dir.startsWith(dirA.dir), "B 不应是 A 的前缀");
  console.log(`     A handoff dir: ${dirA.dir}`);
  console.log(`     B handoff dir: ${dirB.dir}`);
});

test("handoff: projectHash 不同", () => {
  const { projectHash: hashA } = getHandoffDir({ cwd: projectA });
  const { projectHash: hashB } = getHandoffDir({ cwd: projectB });
  assert(hashA !== hashB, `hash 应不同: ${hashA} vs ${hashB}`);
  console.log(`     A hash: ${hashA}`);
  console.log(`     B hash: ${hashB}`);
});

test("handoff: 相同 projectRoot 的 hash 相同", () => {
  const { projectHash: hash1 } = getHandoffDir({ cwd: projectA });
  const { projectHash: hash2 } = getHandoffDir({ cwd: projectA });
  assert(hash1 === hash2, `相同 projectRoot 的 hash 应相同: ${hash1} vs ${hash2}`);
});

test("handoff: local 模式路径不同且包含 hash", () => {
  const dirA = getHandoffDir({ cwd: projectA, local: true });
  const dirB = getHandoffDir({ cwd: projectB, local: true });
  assert(dirA.isLocal === true, "A local=true");
  assert(dirB.isLocal === true, "B local=true");
  assert(dirA.dir !== dirB.dir, `local handoff 目录应不同: ${dirA.dir} vs ${dirB.dir}`);
  assert(dirA.dir.includes(dirA.projectHash), "A local 路径应包含其 hash");
  assert(dirB.dir.includes(dirB.projectHash), "B local 路径应包含其 hash");
  assert(dirA.dir.startsWith(path.join(os.homedir(), ".cline-skills", "handoffs")),
    "A local 路径应位于 ~/.cline-skills/handoffs/");
  console.log(`     A local dir: ${dirA.dir}`);
  console.log(`     B local dir: ${dirB.dir}`);
});

// ============================================================
// 2. Memory hash 隔离
// ============================================================

test("memory: 不同 projectRoot 的 hash 不同", () => {
  const hashA = getProjectHash(projectA);
  const hashB = getProjectHash(projectB);
  assert(hashA !== hashB, `memory hash 应不同: ${hashA} vs ${hashB}`);
  console.log(`     A memory hash: ${hashA}`);
  console.log(`     B memory hash: ${hashB}`);
});

test("memory: 相同 projectRoot 的 hash 相同", () => {
  const hash1 = getProjectHash(projectA);
  const hash2 = getProjectHash(projectA);
  assert(hash1 === hash2, `相同 projectRoot 的 memory hash 应相同: ${hash1} vs ${hash2}`);
});

test("memory: hash 长度为 12 字符 hex", () => {
  const hash = getProjectHash(projectA);
  assert(typeof hash === "string", "hash 应为字符串");
  assert(hash.length === 12, `hash 长度应为 12, 实际为 ${hash.length}`);
  assert(/^[0-9a-f]{12}$/.test(hash), `hash 应为 12 字符 hex: ${hash}`);
});

test("memory: DB 路径包含 hash", () => {
  const hashA = getProjectHash(projectA);
  const hashB = getProjectHash(projectB);
  const dbDirA = path.join(MEMORY_ROOT, hashA);
  const dbDirB = path.join(MEMORY_ROOT, hashB);
  assert(dbDirA !== dbDirB, `DB 路径应不同: ${dbDirA} vs ${dbDirB}`);
  assert(dbDirA.endsWith(hashA), `A DB 路径应以其 hash 结尾`);
  assert(dbDirB.endsWith(hashB), `B DB 路径应以其 hash 结尾`);
});

test("memory: hash 与 handoff hash 一致（共享同一 getProjectHash 实现）", () => {
  const memoryHashA = getProjectHash(projectA);
  const { projectHash: handoffHashA } = getHandoffDir({ cwd: projectA });
  assert(memoryHashA === handoffHashA,
    `memory hash 应与 handoff hash 一致: ${memoryHashA} vs ${handoffHashA}`);
});

// ============================================================
// 3. 空/undefined projectRoot 回退到环境变量/process.cwd
// ============================================================

test("fallback: 无 projectRoot 时不会崩溃", () => {
  const hash = getProjectHash();
  assert(typeof hash === "string" && hash.length === 12, "回退 hash 有效");
  const dir = getHandoffDir({});
  assert(typeof dir.projectHash === "string" && dir.projectHash.length === 12,
    "回退 handoff hash 有效");
  console.log(`     fallback memory hash: ${hash}`);
  console.log(`     fallback handoff hash: ${dir.projectHash}`);
});

// ============================================================
// 4. 大小写/归一化：路径大小写不影响 hash
// ============================================================

test("normalization: 路径大小写不影响 hash", () => {
  // 注意：Windows 上 path.resolve 会保留大小写，但 getProjectHash 调用了 toLowerCase()
  const mixed = projectA.replace("project-alpha", "Project-Alpha");
  // toLowerCase() 确保大小写不影响——但不同 OS 路径可能不同
  // 验证关键：getProjectHash 内调用了 path.resolve + toLowerCase
  const hashOriginal = getProjectHash(projectA);
  const hashMixed = getProjectHash(mixed);
  assert(hashOriginal === hashMixed,
    `大小写归一化后 hash 应相同: ${hashOriginal} vs ${hashMixed} (mixed=${mixed})`);
});

// ============================================================
// 报告
// ============================================================

console.log(`\n═══════════════════════════════════`);
console.log(`总计: ${pass + fail} 个测试`);
console.log(`通过: ${pass}, 失败: ${fail}`);
console.log(`═══════════════════════════════════`);

if (fail > 0) {
  console.log(`\n失败详情:`);
  for (const { name, err } of failures) {
    console.log(`  ❌ ${name}: ${err.message}`);
  }
  process.exit(1);
}