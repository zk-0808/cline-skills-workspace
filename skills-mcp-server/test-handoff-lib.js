// ============================================================
// test-handoff-lib.js — Phase 2A 基础库单元测试
// 覆盖 lib/handoff-fs.js 的 slugify、handoff-schema.js 全部导出
// 不依赖具体 git 状态（避开 lib/git.js 的副作用部分）
// 跑法：node skills-mcp-server/test-handoff-lib.js
// ============================================================

import fs from "fs";
import os from "os";
import path from "path";
import { slugify, atomicWriteFile, formatDate } from "./lib/handoff-fs.js";
import {
  SCHEMA_VERSION,
  STATUSES,
  STALE_DAYS_DEFAULT,
  REQUIRED_FRONTMATTER,
  SECTION_ORDER,
  formatLocalTimezoneISO,
  isStale,
  daysSinceUpdate,
  parseHandoff,
  serializeHandoff,
  validate,
  buildFrontmatter,
  mergeFrontmatter,
} from "./lib/handoff-schema.js";

// ============================================================
// 简易测试运行器
// ============================================================

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

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function assertEq(a, b, msg) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) {
    throw new Error(`${msg || "not equal"}\n     expected: ${sb}\n     actual:   ${sa}`);
  }
}

function assertContains(arr, needle, msg) {
  if (!arr.some((x) => String(x).includes(needle))) {
    throw new Error(`${msg || "not contains"}\n     needle: ${needle}\n     arr: ${JSON.stringify(arr)}`);
  }
}

function group(name, body) {
  console.log(`\n  📦 ${name}`);
  body();
}

// ============================================================
// 1. slugify
// ============================================================

group("slugify (handoff-fs)", () => {
  test("普通 branch 名", () => {
    assertEq(slugify("main"), "main");
  });
  test("含 / 转 -", () => {
    assertEq(slugify("feature/auth-refactor"), "feature-auth-refactor");
  });
  test("含 _ 转 -", () => {
    assertEq(slugify("AUTH_v2"), "auth-v2");
  });
  test("大写转小写", () => {
    assertEq(slugify("Feature/AUTH_V2"), "feature-auth-v2");
  });
  test("仅数字", () => {
    assertEq(slugify("123"), "123");
  });
  test("含特殊字符（中文 / 空格）", () => {
    assertEq(slugify("hotfix/中文 修复"), "hotfix");  // 中文/空格全转 - 后压缩去首尾
  });
  test("连续 - 合并", () => {
    assertEq(slugify("feat//test__name"), "feat-test-name");
  });
  test("空字符串报错", () => {
    let thrown = false;
    try { slugify(""); } catch { thrown = true; }
    assert(thrown, "空字符串应报错");
  });
});

// ============================================================
// 2. formatLocalTimezoneISO
// ============================================================

group("formatLocalTimezoneISO", () => {
  test("输出含时区偏移而非 Z", () => {
    const s = formatLocalTimezoneISO(new Date("2026-06-18T07:30:00Z"));
    // 在任何非 UTC 时区都应有 + 或 -；只验证格式
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(s), `格式错误: ${s}`);
  });
  test("可解析回 Date", () => {
    const s = formatLocalTimezoneISO();
    const t = Date.parse(s);
    assert(!Number.isNaN(t), `无法解析: ${s}`);
  });
  test("固定时间往返一致（同一时区）", () => {
    const d = new Date(2026, 5, 18, 15, 30, 0); // 本地时区
    const s = formatLocalTimezoneISO(d);
    const back = new Date(Date.parse(s));
    assertEq(back.getTime(), d.getTime(), "往返时间戳应一致");
  });
});

// ============================================================
// 3. isStale / daysSinceUpdate
// ============================================================

group("isStale & daysSinceUpdate", () => {
  test("0 天 → 非 stale", () => {
    assertEq(isStale(new Date().toISOString()), false);
  });
  test("13 天 → 非 stale（默认阈值 14）", () => {
    const d = new Date(Date.now() - 13 * 86400000).toISOString();
    assertEq(isStale(d), false);
  });
  test("14 天 → stale", () => {
    const d = new Date(Date.now() - 14.5 * 86400000).toISOString();
    assertEq(isStale(d), true);
  });
  test("15 天 → stale", () => {
    const d = new Date(Date.now() - 15 * 86400000).toISOString();
    assertEq(isStale(d), true);
  });
  test("自定义阈值 7 天", () => {
    const d = new Date(Date.now() - 8 * 86400000).toISOString();
    assertEq(isStale(d, 7), true);
  });
  test("daysSinceUpdate 准确", () => {
    const d = new Date(Date.now() - 5.5 * 86400000).toISOString();
    assertEq(daysSinceUpdate(d), 5);
  });
  test("非法时间返回 null/false", () => {
    assertEq(isStale("not-a-date"), false);
    assertEq(daysSinceUpdate("garbage"), null);
  });
});

// ============================================================
// 4. parseHandoff
// ============================================================

const HAPPY_HANDOFF = `---
schema_version: "1.0"
status: active
branch: feature/x
goal: do something
created_at: "2026-06-18T10:00:00+08:00"
updated_at: "2026-06-18T15:30:00+08:00"
project_hash: abc123def456
---

## completed
- did A
- did B

## in_progress
- doing C

## next_action
- finish C
- run tests

## do_not
- don't touch X

## artifacts
- src/foo.ts

## blocked_by
`;

group("parseHandoff", () => {
  test("happy path", () => {
    const r = parseHandoff(HAPPY_HANDOFF);
    assertEq(r.frontmatterError, null);
    assertEq(r.frontmatter.status, "active");
    assertEq(r.frontmatter.branch, "feature/x");
    assertEq(r.sections.completed, ["did A", "did B"]);
    assertEq(r.sections.next_action, ["finish C", "run tests"]);
    assertEq(r.sections.do_not, ["don't touch X"]);
    assertEq(r.sectionOrder, ["completed", "in_progress", "next_action", "do_not", "artifacts", "blocked_by"]);
  });

  test("缺 frontmatter → frontmatterError", () => {
    const r = parseHandoff("## completed\n- a\n");
    assert(r.frontmatterError, "应有 frontmatterError");
    assertEq(r.frontmatter, null);
  });

  test("frontmatter YAML 错误", () => {
    const r = parseHandoff(`---\nstatus: active\nbranch:\n  bad: [unclosed\n---\n## completed\n`);
    assert(r.frontmatterError, "应捕获 YAML 错误");
  });

  test("章节乱序保留实际顺序", () => {
    const content = `---
schema_version: "1.0"
status: active
branch: x
goal: g
created_at: "2026-06-18T10:00:00+08:00"
updated_at: "2026-06-18T10:00:00+08:00"
project_hash: abc
---

## next_action
- a

## completed
- b
`;
    const r = parseHandoff(content);
    assertEq(r.sectionOrder, ["next_action", "completed"]);
  });

  test("空章节解析为空数组", () => {
    const r = parseHandoff(HAPPY_HANDOFF);
    assertEq(r.sections.blocked_by, []);
  });

  test("Date 字段还原为 ISO 字符串", () => {
    // 不带引号的 ISO，yaml 默认解析为 Date
    const content = `---
schema_version: "1.0"
status: active
branch: x
goal: g
created_at: 2026-06-18T10:00:00+08:00
updated_at: 2026-06-18T10:00:00+08:00
project_hash: abc
---

## completed
- a

## in_progress

## next_action
- b

## do_not
- c

## artifacts
`;
    const r = parseHandoff(content);
    assert(typeof r.frontmatter.created_at === "string", `created_at 应为字符串，实际 ${typeof r.frontmatter.created_at}`);
  });
});

// ============================================================
// 5. serializeHandoff (往返一致性)
// ============================================================

group("serializeHandoff", () => {
  test("往返一致：parse → serialize → parse 相同", () => {
    const r1 = parseHandoff(HAPPY_HANDOFF);
    const out = serializeHandoff({ frontmatter: r1.frontmatter, sections: r1.sections });
    const r2 = parseHandoff(out);
    assertEq(r2.frontmatter.status, r1.frontmatter.status);
    assertEq(r2.frontmatter.branch, r1.frontmatter.branch);
    assertEq(r2.sections.completed, r1.sections.completed);
    assertEq(r2.sections.next_action, r1.sections.next_action);
  });

  test("章节按 SECTION_ORDER 输出", () => {
    const out = serializeHandoff({
      frontmatter: {
        schema_version: "1.0",
        status: "active",
        branch: "x",
        goal: "g",
        created_at: "2026-06-18T10:00:00+08:00",
        updated_at: "2026-06-18T10:00:00+08:00",
        project_hash: "abc",
      },
      sections: {
        // 故意乱序传入
        do_not: ["x"],
        completed: ["a"],
        next_action: ["b"],
      },
    });
    // body 中 completed 应在 do_not 之前
    const idxC = out.indexOf("## completed");
    const idxD = out.indexOf("## do_not");
    assert(idxC < idxD, "completed 应在 do_not 前");
  });

  test("blocked_by 仅在 blocked 或非空时输出", () => {
    const base = {
      frontmatter: {
        schema_version: "1.0",
        status: "active",
        branch: "x",
        goal: "g",
        created_at: "2026-06-18T10:00:00+08:00",
        updated_at: "2026-06-18T10:00:00+08:00",
        project_hash: "abc",
      },
      sections: { next_action: ["a"] },
    };
    const out1 = serializeHandoff(base);
    assert(!out1.includes("## blocked_by"), "active 且空时不应含 blocked_by");

    base.frontmatter.status = "blocked";
    base.sections.blocked_by = ["waiting on Y"];
    const out2 = serializeHandoff(base);
    assert(out2.includes("## blocked_by"), "blocked 时应含 blocked_by");
  });
});

// ============================================================
// 6. validate — 12 个 E0xx
// ============================================================

function makeFm(overrides = {}) {
  return {
    schema_version: "1.0",
    status: "active",
    branch: "feature/x",
    goal: "test goal",
    created_at: "2026-06-18T10:00:00+08:00",
    updated_at: "2026-06-18T10:00:00+08:00",
    project_hash: "abc123def456",
    ...overrides,
  };
}

function makeSections(overrides = {}) {
  return {
    completed: ["a"],
    in_progress: [],
    next_action: ["do something"],
    do_not: ["never"],
    artifacts: [],
    blocked_by: [],
    ...overrides,
  };
}

function makeParsed(fm, sections, sectionOrder) {
  return {
    frontmatter: fm,
    sections,
    sectionOrder: sectionOrder || Object.keys(sections),
    raw: "",
    frontmatterError: null,
  };
}

group("validate — 致命错误 E0xx", () => {
  test("E001 frontmatter 解析失败", () => {
    const r = validate({
      frontmatter: null,
      sections: {},
      sectionOrder: [],
      raw: "",
      frontmatterError: "bad yaml",
    });
    assertContains(r.errors, "E001");
  });

  test("E002 缺必填字段", () => {
    const fm = makeFm();
    delete fm.goal;
    const r = validate(makeParsed(fm, makeSections()));
    assertContains(r.errors, "E002");
  });

  test("E003 status 非法", () => {
    const r = validate(makeParsed(makeFm({ status: "weird" }), makeSections()));
    assertContains(r.errors, "E003");
  });

  test("E004 schema_version 不匹配", () => {
    const r = validate(makeParsed(makeFm({ schema_version: "0.9" }), makeSections()));
    assertContains(r.errors, "E004");
  });

  test("E005 时间格式错误", () => {
    const r = validate(makeParsed(makeFm({ updated_at: "2026-06-18 10:00" }), makeSections()));
    assertContains(r.errors, "E005");
  });

  test("E005 缺时区也报错", () => {
    const r = validate(makeParsed(makeFm({ updated_at: "2026-06-18T10:00:00" }), makeSections()));
    assertContains(r.errors, "E005");
  });

  test("E006 created > updated", () => {
    const r = validate(makeParsed(
      makeFm({ created_at: "2026-06-19T10:00:00+08:00", updated_at: "2026-06-18T10:00:00+08:00" }),
      makeSections()
    ));
    assertContains(r.errors, "E006");
  });

  test("E007 blocked 但 blocked_by 为空", () => {
    const r = validate(makeParsed(
      makeFm({ status: "blocked" }),
      makeSections({ blocked_by: [] })
    ));
    assertContains(r.errors, "E007");
  });

  test("E008 缺必填 body 章节", () => {
    const sections = makeSections();
    delete sections.completed;
    const r = validate(makeParsed(makeFm(), sections, ["in_progress", "next_action", "do_not", "artifacts", "blocked_by"]));
    assertContains(r.errors, "E008");
  });

  test("E009 next_action 为空", () => {
    const r = validate(makeParsed(makeFm(), makeSections({ next_action: [] })));
    assertContains(r.errors, "E009");
  });

  test("E011 文件名 slug 与 branch 字段不一致", () => {
    const r = validate(
      makeParsed(makeFm({ branch: "feature/x" }), makeSections()),
      { expectedBranch: "main" }
    );
    assertContains(r.errors, "E011");
  });

  test("E012 project_hash 不匹配", () => {
    const r = validate(
      makeParsed(makeFm(), makeSections()),
      { expectedProjectHash: "different" }
    );
    assertContains(r.errors, "E012");
  });

  test("happy path 无致命错误", () => {
    const r = validate(makeParsed(makeFm(), makeSections()));
    assertEq(r.errors, []);
  });
});

// ============================================================
// 7. validate — 8 个 W0xx
// ============================================================

group("validate — 警告 W0xx", () => {
  test("W001 active 但 stale", () => {
    const old = formatLocalTimezoneISO(new Date(Date.now() - 20 * 86400000));
    const r = validate(makeParsed(makeFm({ updated_at: old }), makeSections()));
    assertContains(r.warnings, "W001");
  });

  test("W002 stale 但仍占 active 槽位", () => {
    const r = validate(
      makeParsed(makeFm({ status: "stale" }), makeSections()),
      { expectedBranch: "feature-x" }
    );
    assertContains(r.warnings, "W002");
  });

  test("W003 章节顺序错误", () => {
    const fm = makeFm();
    const sections = makeSections();
    const r = validate(makeParsed(fm, sections, ["next_action", "completed", "in_progress", "do_not", "artifacts", "blocked_by"]));
    assertContains(r.warnings, "W003");
  });

  test("W004 goal 超长", () => {
    const longGoal = "x".repeat(150);
    const r = validate(makeParsed(makeFm({ goal: longGoal }), makeSections()));
    assertContains(r.warnings, "W004");
  });

  test("W005 artifacts 含绝对路径", () => {
    const r = validate(makeParsed(makeFm(), makeSections({
      artifacts: ["/etc/passwd"],
    })));
    assertContains(r.warnings, "W005");
  });

  test("W005 Windows 绝对路径", () => {
    const r = validate(makeParsed(makeFm(), makeSections({
      artifacts: ["C:\\Users\\foo.txt"],
    })));
    assertContains(r.warnings, "W005");
  });

  test("W006 body 含 HTML", () => {
    const r = validate(makeParsed(makeFm(), makeSections({
      next_action: ["check <script>alert(1)</script>"],
    })));
    assertContains(r.warnings, "W006");
  });

  test("W007 do_not 为空", () => {
    const r = validate(makeParsed(makeFm(), makeSections({ do_not: [] })));
    assertContains(r.warnings, "W007");
  });

  test("happy path 无 W001（updated 在 today）", () => {
    const r = validate(makeParsed(makeFm({ updated_at: formatLocalTimezoneISO() }), makeSections()));
    assert(!r.warnings.some((w) => w.startsWith("W001")), "今天更新不应报 W001");
  });
});

// ============================================================
// 8. buildFrontmatter / mergeFrontmatter
// ============================================================

group("buildFrontmatter / mergeFrontmatter", () => {
  test("buildFrontmatter 包含全部必填字段", () => {
    const fm = buildFrontmatter({ branch: "main", goal: "test" });
    for (const k of REQUIRED_FRONTMATTER) {
      assert(fm[k] !== undefined, `缺字段 ${k}`);
    }
    assertEq(fm.schema_version, "1.0");
    assertEq(fm.status, "active");
    assertEq(fm.branch, "main");
    assertEq(fm.goal, "test");
    assertEq(fm.created_at, fm.updated_at, "首创时 created_at == updated_at");
  });

  test("mergeFrontmatter 保留 created_at", () => {
    const old = makeFm({ created_at: "2026-01-01T00:00:00+08:00", updated_at: "2026-01-01T00:00:00+08:00" });
    const merged = mergeFrontmatter(old, { goal: "new goal" });
    assertEq(merged.created_at, "2026-01-01T00:00:00+08:00");
    assertEq(merged.goal, "new goal");
    assert(merged.updated_at !== old.updated_at, "updated_at 应更新");
    assertEq(merged.schema_version, "1.0");
  });

  test("mergeFrontmatter undefined 字段保留旧值", () => {
    const old = makeFm({ goal: "old goal" });
    const merged = mergeFrontmatter(old, { goal: undefined });
    assertEq(merged.goal, "old goal");
  });
});

// ============================================================
// 9. atomicWriteFile
// ============================================================

group("atomicWriteFile", () => {
  test("写入并读取一致", () => {
    const tmp = path.join(os.tmpdir(), `handoff-test-${Date.now()}.md`);
    atomicWriteFile(tmp, "hello\nworld\n");
    const content = fs.readFileSync(tmp, "utf8");
    assertEq(content, "hello\nworld\n");
    fs.unlinkSync(tmp);
  });

  test("覆盖已有文件", () => {
    const tmp = path.join(os.tmpdir(), `handoff-test-${Date.now()}-overwrite.md`);
    atomicWriteFile(tmp, "v1");
    atomicWriteFile(tmp, "v2");
    assertEq(fs.readFileSync(tmp, "utf8"), "v2");
    fs.unlinkSync(tmp);
  });

  test("自动创建嵌套目录", () => {
    const dir = path.join(os.tmpdir(), `handoff-test-${Date.now()}-dir`, "nested");
    const file = path.join(dir, "a.md");
    atomicWriteFile(file, "hi");
    assert(fs.existsSync(file), "嵌套文件应存在");
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  });

  test("无 .tmp 残留", () => {
    const tmp = path.join(os.tmpdir(), `handoff-test-${Date.now()}-clean.md`);
    atomicWriteFile(tmp, "x");
    assert(!fs.existsSync(`${tmp}.tmp`), ".tmp 文件应被 rename 掉");
    fs.unlinkSync(tmp);
  });
});

// ============================================================
// 10. formatDate
// ============================================================

group("formatDate", () => {
  test("YYYY-MM-DD 格式", () => {
    const s = formatDate(new Date(2026, 5, 18));
    assertEq(s, "2026-06-18");
  });
  test("月份补零", () => {
    const s = formatDate(new Date(2026, 0, 1));
    assertEq(s, "2026-01-01");
  });
});

// ============================================================
// 总结
// ============================================================

console.log(`\n════════════════════════════════════════`);
console.log(`总计：${pass + fail} 个用例`);
console.log(`✅ 通过: ${pass}`);
console.log(`❌ 失败: ${fail}`);

if (fail > 0) {
  console.log(`\n失败详情：`);
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.err.message}`);
  }
  process.exit(1);
}

console.log(`\n🎉 所有用例通过！`);
process.exit(0);
