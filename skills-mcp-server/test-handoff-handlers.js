// ============================================================
// test-handoff-handlers.js — handoff_write / handoff_resume 端到端测试
// 直接调用 handler，不经过 MCP transport
// ============================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { handler as writeHandler } from "./handlers/handoff-write.js";
import { handler as resumeHandler } from "./handlers/handoff-resume.js";
import { getCurrentBranch } from "./lib/git.js";
import { slugify } from "./lib/handoff-fs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  return Promise.resolve(fn())
    .then(() => {
      pass++;
      console.log(`  ✅ ${name}`);
    })
    .catch((err) => {
      fail++;
      failures.push({ name, err });
      console.log(`  ❌ ${name}\n     ${err.message}`);
    });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function assertContains(text, needle, msg) {
  if (!text.includes(needle)) throw new Error(`${msg || "not contains"}: ${needle}`);
}

function getText(result) {
  return result.content[0].text;
}

function getJsonPayload(result) {
  const text = getText(result);
  const m = text.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("响应中未找到 JSON payload");
  return JSON.parse(m[1]);
}

// ============================================================
// 准备：清理测试痕迹
// ============================================================

const branch = getCurrentBranch(projectRoot);
if (!branch) {
  console.error("❌ 无法获取当前 branch，跳过测试");
  process.exit(1);
}
const slug = slugify(branch);
const handoffDir = path.join(projectRoot, ".cline", "handoffs");
const activeFile = path.join(handoffDir, `HANDOFF_${slug}_active.md`);
const archiveDir = path.join(handoffDir, "archive");

function cleanup() {
  if (fs.existsSync(activeFile)) fs.unlinkSync(activeFile);
  if (fs.existsSync(archiveDir)) {
    for (const f of fs.readdirSync(archiveDir)) {
      if (f.startsWith(`HANDOFF_${slug}_`)) {
        fs.unlinkSync(path.join(archiveDir, f));
      }
    }
  }
}

console.log(`\n🧪 端到端测试 (branch=${branch}, slug=${slug})`);
console.log(`   工作目录：${projectRoot}\n`);

cleanup();

// ============================================================
// 测试套件
// ============================================================

async function run() {
  // ============== handoff_write 首次创建 ==============
  console.log("\n📦 handoff_write");

  await test("首次创建 - 缺 goal 报错", async () => {
    const r = await writeHandler({});
    assert(r.isError, "应报错");
    assertContains(getText(r), "GOAL_REQUIRED_ON_FIRST_WRITE");
  });

  await test("首次创建 - 缺 next_action 报错", async () => {
    const r = await writeHandler({ goal: "test goal" });
    assert(r.isError, "应报错");
    assertContains(getText(r), "NEXT_ACTION_REQUIRED");
  });

  await test("首次创建 - happy path", async () => {
    const r = await writeHandler({
      goal: "Test handoff e2e",
      next_action: ["finish handler", "run integration test"],
      do_not: ["do not modify schema"],
      artifacts: ["skills-mcp-server/handlers/handoff-write.js"],
    });
    assert(!r.isError, `不应报错，实际: ${getText(r)}`);
    assert(fs.existsSync(activeFile), "active 文件应已创建");
    const text = getText(r);
    assertContains(text, "已创建");
    assertContains(text, branch);
  });

  await test("文件内容含必需 frontmatter 字段", async () => {
    const content = fs.readFileSync(activeFile, "utf8");
    assertContains(content, 'schema_version: "1.0"');
    assertContains(content, "status: active");
    assertContains(content, `branch: ${branch}`);
    assertContains(content, "goal: Test handoff e2e");
  });

  await test("文件内容含必需 body 章节", async () => {
    const content = fs.readFileSync(activeFile, "utf8");
    for (const sec of ["completed", "in_progress", "next_action", "do_not", "artifacts"]) {
      assertContains(content, `## ${sec}`);
    }
  });

  // ============== handoff_write 更新（合并）==============

  await test("更新 - 部分字段合并保留旧值", async () => {
    // 仅更新 completed，其他字段应保持原状
    const r = await writeHandler({
      completed: ["Completed step 1"],
    });
    assert(!r.isError, getText(r));
    const content = fs.readFileSync(activeFile, "utf8");
    assertContains(content, "Completed step 1");
    // 旧的 next_action 应保留
    assertContains(content, "finish handler");
    // 旧的 do_not 应保留
    assertContains(content, "do not modify schema");
    // goal 应保留
    assertContains(content, "goal: Test handoff e2e");
  });

  await test("更新 - 显式覆盖 next_action", async () => {
    const r = await writeHandler({
      next_action: ["new next action"],
    });
    assert(!r.isError, getText(r));
    const content = fs.readFileSync(activeFile, "utf8");
    assertContains(content, "new next action");
    assert(!content.includes("finish handler"), "旧的 finish handler 应被覆盖");
  });

  // ============== handoff_resume ==============
  console.log("\n📦 handoff_resume");

  await test("resume - happy path", async () => {
    const r = await resumeHandler({});
    assert(!r.isError, `不应报错: ${getText(r)}`);
    const text = getText(r);
    assertContains(text, "handoff 已恢复");
    assertContains(text, "Test handoff e2e");
    assertContains(text, "new next action");
  });

  await test("resume - 返回 JSON payload 结构正确", async () => {
    const r = await resumeHandler({});
    const payload = getJsonPayload(r);
    assert(payload.ok === true, `ok 应为 true，实际 ${payload.ok}`);
    assert(payload.branch === branch, `branch 应为 ${branch}`);
    assert(payload.goal === "Test handoff e2e", `goal 错误`);
    assert(Array.isArray(payload.next_action), "next_action 应为数组");
    assert(payload.next_action.includes("new next action"), "next_action 内容错");
    assert(Array.isArray(payload.do_not), "do_not 应为数组");
    assert(typeof payload.completed_count === "number", "completed_count 应为数字");
    assert(payload.stale_days !== undefined, "应含 stale_days 字段");
  });

  await test("resume - branch 不匹配应失败", async () => {
    const r = await resumeHandler({ branch: "nonexistent-branch-xyz" });
    assert(r.isError, "应报错");
    assertContains(getText(r), "NO_HANDOFF");
  });

  // ============== handoff_write status=blocked ==============

  await test("status=blocked 缺 blocked_by 报错", async () => {
    const r = await writeHandler({ status: "blocked" });
    assert(r.isError, "应报错");
    assertContains(getText(r), "BLOCKED_REQUIRES_REASON");
  });

  await test("status=blocked + blocked_by 成功", async () => {
    const r = await writeHandler({
      status: "blocked",
      blocked_by: ["waiting on upstream fix"],
    });
    assert(!r.isError, getText(r));
    const content = fs.readFileSync(activeFile, "utf8");
    assertContains(content, "status: blocked");
    assertContains(content, "## blocked_by");
    assertContains(content, "waiting on upstream fix");
  });

  // 改回 active 准备 done 测试
  await test("blocked → active 恢复", async () => {
    const r = await writeHandler({ status: "active" });
    assert(!r.isError, getText(r));
  });

  // ============== handoff_write status=done 归档 ==============

  await test("status=done 触发归档", async () => {
    assert(fs.existsSync(activeFile), "前置：active 文件存在");
    const r = await writeHandler({ status: "done" });
    assert(!r.isError, getText(r));
    assert(!fs.existsSync(activeFile), "active 文件应被移走");
    assertContains(getText(r), "已更新并归档");
    // 检查 archive 目录有新文件
    const archived = fs.readdirSync(archiveDir).filter((f) => f.startsWith(`HANDOFF_${slug}_`));
    assert(archived.length >= 1, "archive 目录应有归档文件");
  });

  await test("归档后 resume 报 NO_HANDOFF", async () => {
    const r = await resumeHandler({});
    assert(r.isError, "应报错");
    assertContains(getText(r), "NO_HANDOFF");
  });

  // ============== Bug 边界：done → 再次 write 不传 goal（语义边界）==============
  // 见 docs/logs/2026-06-18-dogfooding-sprint-retrospective.md §1 Q2
  // 设计语义：done 是终态，归档后 active 槽空 → 下次 write 在语义上是「新建」
  // 但用户体验上易误以为「同会话内仍能延续」→ 错误信息必须含足够诊断
  console.log("\n📦 done 后再次 write 的诊断信息");

  await test("done 后 write 不传 goal：仍报 GOAL_REQUIRED（预期行为）", async () => {
    cleanup();
    // 1. 首次创建
    let r = await writeHandler({
      goal: "终态边界测试",
      next_action: ["x"],
    });
    assert(!r.isError, getText(r));
    // 2. 归档
    r = await writeHandler({ status: "done" });
    assert(!r.isError, getText(r));
    assert(!fs.existsSync(activeFile), "归档后 active 应不存在");
    // 3. 再 write 不传 goal
    r = await writeHandler({ completed: ["延续？"] });
    assert(r.isError, "应报错（语义上视为新建）");
    assertContains(getText(r), "GOAL_REQUIRED_ON_FIRST_WRITE");
  });

  await test("诊断信息：含 active 期望路径", async () => {
    cleanup();
    const r = await writeHandler({ completed: ["x"] });
    assert(r.isError, "应报错");
    const text = getText(r);
    assertContains(text, "GOAL_REQUIRED_ON_FIRST_WRITE");
    // 期望诊断含期望路径
    assertContains(text, ".cline/handoffs/HANDOFF_");
  });

  await test("诊断信息：active 不存在 + archive 也无候选 → 标记新建", async () => {
    cleanup();
    // 确保 archive 下没有同 slug 文件
    if (fs.existsSync(archiveDir)) {
      for (const f of fs.readdirSync(archiveDir)) {
        if (f.startsWith(`HANDOFF_${slug}_`)) {
          fs.unlinkSync(path.join(archiveDir, f));
        }
      }
    }
    const r = await writeHandler({ completed: ["x"] });
    assert(r.isError, "应报错");
    const text = getText(r);
    // 必须明示这是「新建」语义，并且诊断告知 active/archive 都没找到
    assertContains(text, "新");  // "新建" 或 "新 handoff"
  });

  await test("诊断信息：归档后再 write → 提示存在归档候选", async () => {
    cleanup();
    // 1. 写一个 + 归档
    let r = await writeHandler({ goal: "存档测试", next_action: ["y"] });
    assert(!r.isError, getText(r));
    r = await writeHandler({ status: "done" });
    assert(!r.isError, getText(r));
    // 2. 不传 goal 再 write
    r = await writeHandler({ completed: ["延续？"] });
    assert(r.isError, "应报错");
    const text = getText(r);
    // 必须告知用户「最近归档了 1 个同 slug 的 handoff」+ 提示是否要新建
    assertContains(text, "归档");
  });

  // ============== 清理 ==============
  cleanup();
}

run().then(() => {
  console.log(`\n════════════════════════════════════════`);
  console.log(`总计：${pass + fail} 个用例`);
  console.log(`✅ 通过: ${pass}`);
  console.log(`❌ 失败: ${fail}`);
  if (fail > 0) {
    console.log(`\n失败详情：`);
    for (const f of failures) console.log(`  - ${f.name}: ${f.err.message}`);
    process.exit(1);
  }
  console.log(`\n🎉 所有用例通过！`);
  process.exit(0);
});