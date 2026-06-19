// ============================================================
// test-project-hash.js — 验证 git remote URL 归一化 + getProjectHashByGitUrl
// 来源：2026-06-18 外部评审 §2.4 / 2026-06-19 D2 实施
// ============================================================

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { normalizeRemoteUrl, getRemoteUrl } from "./lib/git.js";
import { getProjectHashByGitUrl, getProjectHash } from "./lib/db.js";

// ------------------------------------------------------------
// 测试报告器
// ------------------------------------------------------------
let passed = 0;
let failed = 0;

function ok(name, cond, detail = "") {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? "  → " + detail : ""}`);
    failed++;
  }
}

function eq(name, actual, expected) {
  ok(name, actual === expected, `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

// ------------------------------------------------------------
// 工具：用 execSync 创建临时 git repo
// ------------------------------------------------------------
function mkTempGitRepo(remoteUrl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "test-project-hash-"));
  execSync("git init -q", { cwd: dir });
  if (remoteUrl) {
    execSync(`git remote add origin "${remoteUrl}"`, { cwd: dir });
  }
  return dir;
}

function rmRf(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// ------------------------------------------------------------
// A. normalizeRemoteUrl
// ------------------------------------------------------------
console.log("\n📦 normalizeRemoteUrl");

eq("https + .git 后缀去除",
  normalizeRemoteUrl("https://github.com/foo/bar.git"),
  "https://github.com/foo/bar"
);

eq("https + 尾部 / 去除",
  normalizeRemoteUrl("https://github.com/foo/bar/"),
  "https://github.com/foo/bar"
);

eq("https + .git/ 同时去除",
  normalizeRemoteUrl("https://github.com/foo/bar.git/"),
  "https://github.com/foo/bar"
);

eq("大小写归一",
  normalizeRemoteUrl("https://GitHub.com/Foo/Bar.git"),
  "https://github.com/foo/bar"
);

eq("SSH 转 HTTPS",
  normalizeRemoteUrl("git@github.com:zk-0808/cline-skills-workspace.git"),
  "https://github.com/zk-0808/cline-skills-workspace"
);

eq("SSH 自定义端口（实际 git ssh 不带端口语法，但兼容）",
  normalizeRemoteUrl("git@gitlab.com:group/repo"),
  "https://gitlab.com/group/repo"
);

eq("SSH ↔ HTTPS 等价：相同输出",
  normalizeRemoteUrl("git@github.com:foo/bar.git"),
  normalizeRemoteUrl("https://github.com/foo/bar")
);

eq("null 透传", normalizeRemoteUrl(null), null);
eq("undefined 返 null", normalizeRemoteUrl(undefined), null);
eq("空字符串返 null", normalizeRemoteUrl(""), null);
eq("纯空白返 null", normalizeRemoteUrl("   "), null);
eq("非字符串返 null", normalizeRemoteUrl(123), null);

// ------------------------------------------------------------
// B. getRemoteUrl 实测临时 repo
// ------------------------------------------------------------
console.log("\n📦 getRemoteUrl (临时 git repo)");

{
  // B1: 有 origin
  const url = "https://github.com/test/proj.git";
  const dir = mkTempGitRepo(url);
  try {
    eq("origin 存在 → 返回归一化 URL",
      getRemoteUrl(dir),
      "https://github.com/test/proj"
    );
  } finally {
    rmRf(dir);
  }
}

{
  // B2: 没有 remote
  const dir = mkTempGitRepo(null);
  try {
    eq("无 remote → null", getRemoteUrl(dir), null);
  } finally {
    rmRf(dir);
  }
}

{
  // B3: 非 git 目录
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "non-git-"));
  try {
    eq("非 git 目录 → null", getRemoteUrl(dir), null);
  } finally {
    rmRf(dir);
  }
}

{
  // B4: SSH form 自动归一化
  const dir = mkTempGitRepo("git@github.com:owner/repo.git");
  try {
    eq("SSH origin → 归一为 https",
      getRemoteUrl(dir),
      "https://github.com/owner/repo"
    );
  } finally {
    rmRf(dir);
  }
}

{
  // B5: 非 origin remote（取第一个）
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alt-remote-"));
  execSync("git init -q", { cwd: dir });
  execSync("git remote add upstream https://github.com/up/stream.git", { cwd: dir });
  try {
    eq("无 origin 但有 upstream → 取第一个 remote",
      getRemoteUrl(dir),
      "https://github.com/up/stream"
    );
  } finally {
    rmRf(dir);
  }
}

// ------------------------------------------------------------
// C. getProjectHashByGitUrl
// ------------------------------------------------------------
console.log("\n📦 getProjectHashByGitUrl");

{
  // C1: 有 git remote → 基于 URL 计算
  const dir1 = mkTempGitRepo("https://github.com/test/proj.git");
  const dir2 = mkTempGitRepo("https://github.com/test/proj.git");
  try {
    const h1 = getProjectHashByGitUrl(dir1);
    const h2 = getProjectHashByGitUrl(dir2);
    eq("相同 remote URL 在不同目录 → 相同 hash（跨设备稳定）", h1, h2);
    ok("hash 长度 12", h1.length === 12);
    ok("hash 全 hex", /^[0-9a-f]{12}$/.test(h1));
  } finally {
    rmRf(dir1);
    rmRf(dir2);
  }
}

{
  // C2: SSH vs HTTPS → 相同 hash
  const dir1 = mkTempGitRepo("git@github.com:foo/bar.git");
  const dir2 = mkTempGitRepo("https://github.com/foo/bar");
  try {
    eq("SSH 与 HTTPS remote → 相同 hash",
      getProjectHashByGitUrl(dir1),
      getProjectHashByGitUrl(dir2)
    );
  } finally {
    rmRf(dir1);
    rmRf(dir2);
  }
}

{
  // C3: 无 remote → fallback 到绝对路径 hash
  const dir = mkTempGitRepo(null);
  try {
    const hashByGit = getProjectHashByGitUrl(dir);
    const hashByPath = getProjectHash(dir);
    eq("无 remote → fallback 到 getProjectHash", hashByGit, hashByPath);
  } finally {
    rmRf(dir);
  }
}

{
  // C4: 当前项目（本仓）— 实测对比
  const cwd = process.cwd();
  const hashByPath = getProjectHash(cwd);
  const hashByGit = getProjectHashByGitUrl(cwd);
  // 当前仓有 origin → 两个 hash 应该 NOT equal
  ok("本仓: getProjectHash != getProjectHashByGitUrl（确认走了 git URL 路径）",
    hashByPath !== hashByGit,
    `path=${hashByPath} git=${hashByGit}`
  );
}

// ------------------------------------------------------------
// 收尾
// ------------------------------------------------------------
console.log("\n════════════════════════════════════════");
console.log(`总计：${passed + failed} 个用例`);
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);

if (failed > 0) {
  console.log("\n💥 有失败用例");
  process.exit(1);
} else {
  console.log("\n🎉 所有用例通过！");
}