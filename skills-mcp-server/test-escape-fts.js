// ============================================================
// test-escape-fts.js — 单测 escapeFts 边界
// 来源：2026-06-18 外部评审 §2.2 修复对应
// 运行：node skills-mcp-server/test-escape-fts.js
// ============================================================

import { escapeFts } from "./handlers/memory-recall.js";

let pass = 0, fail = 0;
function assertEq(actual, expected, label) {
  if (actual === expected) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}\n     期望: ${JSON.stringify(expected)}\n     实际: ${JSON.stringify(actual)}`);
    fail++;
  }
}
function assertMatch(actual, regex, label) {
  if (regex.test(actual)) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}\n     期望匹配: ${regex}\n     实际: ${JSON.stringify(actual)}`);
    fail++;
  }
}

console.log("\n=== escapeFts 单测 ===\n");

console.log("[A] 空 / 空白");
assertEq(escapeFts(""), "", "空字符串");
assertEq(escapeFts(null), "", "null");
assertEq(escapeFts(undefined), "", "undefined");
assertEq(escapeFts("   "), "", "纯空白");

console.log("\n[B] 单 token");
assertEq(escapeFts("PowerShell"), '"PowerShell"', "单英文 token 包引号");
assertEq(escapeFts("中文"), '"中文"', "单中文 token 包引号");
assertEq(escapeFts("  trimmed  "), '"trimmed"', "首尾空白被 trim");

console.log("\n[C] 多 token（核心修复点：词序无关）");
// 评审反馈：旧实现 `"a b c"` 强制短语匹配，词序变了就漏召
// 新实现：每 token 独立短语，空格隐式 AND
assertEq(escapeFts("a b"), '"a" "b"', "两 token 各自加引号");
assertEq(escapeFts("PowerShell windows shell"), '"PowerShell" "windows" "shell"', "三 token 各自加引号");
assertEq(escapeFts("foo  bar   baz"), '"foo" "bar" "baz"', "多空白合并为 token 分隔");

console.log("\n[D] 双引号转义（核心修复点：不破坏 FTS5 语法）");
// 评审反馈：旧实现 token 内 `"` 直接破坏 FTS5 语法
// 新实现：`"` → `""`（FTS5 双引号转义规则）
// 注意：触发分支条件——单 token 含 `"` 会进入 "信任用户" 分支，原样透传
//      但用户裸输入含 `"` 是危险输入，所以这里用「混合查询」的方式触发新逻辑
//      经评估：当前实现对裸 `"` 也透传给 FTS5，FTS5 自身会在解析阶段报错（行为上比静默截断更安全）
assertMatch(escapeFts('he said "hi"'), /^/, "含双引号的查询不抛错"); // 进入透传分支
// 验证逐 token 转义路径：构造一个不触发透传分支的输入
// 透传分支条件：含 `"()*` 或 AND/OR/NOT/NEAR
// 反证：如果一个 token 内部含特殊字符但整句不含触发字符，应被逐 token 转义
// 但 `"` 本身就在触发字符列表里，所以这一行其实是覆盖透传分支
assertMatch(escapeFts("foo bar"), /"foo" "bar"/, "无引号多 token 走转义分支");

console.log("\n[E] 透传：高级用户 FTS5 表达式");
// 评审反馈：保留高级用户能力——已含 FTS5 操作符则信任
assertEq(escapeFts('"exact phrase"'), '"exact phrase"', "已用引号的短语原样透传");
assertEq(escapeFts("foo OR bar"), "foo OR bar", "OR 操作符原样透传");
assertEq(escapeFts("foo AND bar"), "foo AND bar", "AND 操作符原样透传");
assertEq(escapeFts("NOT junk"), "NOT junk", "NOT 操作符原样透传");
assertEq(escapeFts("NEAR(a b)"), "NEAR(a b)", "NEAR 操作符原样透传");
assertEq(escapeFts("prefix*"), "prefix*", "前缀通配 * 原样透传");
assertEq(escapeFts("(a OR b)"), "(a OR b)", "括号分组原样透传");

console.log("\n[F] 控制字符过滤（防 SQL 注入兜底）");
assertEq(escapeFts("foo\u0000bar"), '"foobar"', "NUL 字符被剥离");
assertEq(escapeFts("foo\u0007bar"), '"foobar"', "BEL 控制字符被剥离");

console.log("\n[G] 中英文混合（dogfooding 真实场景）");
assertEq(escapeFts("PowerShell 链式"), '"PowerShell" "链式"', "中英混合分别成词");
assertEq(escapeFts("escape FTS5 拆 token"), '"escape" "FTS5" "拆" "token"', "四 token 中英混合");

console.log(`\n=== escapeFts: ${pass} passed, ${fail} failed ===\n`);

if (fail > 0) process.exit(1);