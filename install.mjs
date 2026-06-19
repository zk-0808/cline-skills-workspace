#!/usr/bin/env node
// ============================================================
// install.js — cline-skills-workspace 一键安装脚本
//
// 一行命令完成：
//   1. skills-mcp-server 依赖安装（npm install）
//   2. 在 Cline MCP settings 注册 skills-mcp-server
//   3. 复制 skills/* 到 ~/.claude/skills/（Cline 全局 skills 目录）
//   4. 跑 validate-skills + 全部测试做 sanity check
//
// 用法：
//   node install.js                    一键全装（已存在则跳过）
//   node install.js --force            强制覆盖已有配置
//   node install.js --dry-run          预览将做什么，不实际写入
//   node install.js --server-only      只装 server，不复制 skills
//   node install.js --skills-only      只复制 skills，不装 server
//   node install.js --no-test          跳过最后的测试运行
//   node install.js --help             显示帮助
//
// 跨平台：Windows / macOS / Linux 全部支持，零外部依赖
// ============================================================

import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CLI 参数解析
// ============================================================
const args = new Set(process.argv.slice(2));
const HELP = args.has("--help") || args.has("-h");
const FORCE = args.has("--force");
const DRY_RUN = args.has("--dry-run");
const SERVER_ONLY = args.has("--server-only");
const SKILLS_ONLY = args.has("--skills-only");
const NO_TEST = args.has("--no-test");

if (HELP) {
  console.log(`
🧠 cline-skills-workspace 一键安装

用法:
  node install.js                    一键全装
  node install.js --force            覆盖已有配置
  node install.js --dry-run          预览不写入
  node install.js --server-only      只装 MCP server
  node install.js --skills-only      只复制 skills
  node install.js --no-test          跳过测试
  node install.js --help             显示此帮助

详情见 README.md。
`);
  process.exit(0);
}

// ============================================================
// 输出辅助（不依赖 chalk）
// ============================================================
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function header(s) {
  console.log(`\n${c.bold}${c.cyan}${s}${c.reset}`);
}
function ok(s) {
  console.log(`  ${c.green}✓${c.reset} ${s}`);
}
function info(s) {
  console.log(`  ${c.blue}·${c.reset} ${s}`);
}
function warn(s) {
  console.log(`  ${c.yellow}⚠${c.reset} ${s}`);
}
function err(s) {
  console.log(`  ${c.red}✗${c.reset} ${s}`);
}
function dim(s) {
  console.log(`  ${c.dim}${s}${c.reset}`);
}

// ============================================================
// 路径常量
// ============================================================
const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, "skills-mcp-server");
const SKILLS_DIR = path.join(ROOT, "skills");
const HOME = os.homedir();

// Cline 全局 skills 安装目标（与 README.md 现有指引一致）
const SKILLS_TARGET = path.join(HOME, ".claude", "skills");

// Cline MCP settings 候选位置（按平台）
function getClineSettingsPaths() {
  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      path.join(process.env.APPDATA || "", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
      path.join(process.env.APPDATA || "", "Cursor", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      path.join(HOME, "Library", "Application Support", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
      path.join(HOME, "Library", "Application Support", "Cursor", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
    );
  } else {
    candidates.push(
      path.join(HOME, ".config", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
      path.join(HOME, ".config", "Cursor", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
    );
  }
  return candidates;
}

// ============================================================
// 工具：跨平台目录复制
// ============================================================
function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonPretty(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

// ============================================================
// Step 1: npm install in skills-mcp-server
// ============================================================
function stepInstallServer() {
  header("[1/4] 安装 skills-mcp-server 依赖");
  if (SKILLS_ONLY) {
    info("已跳过（--skills-only）");
    return true;
  }
  if (DRY_RUN) {
    info(`[dry-run] 将在 ${SERVER_DIR} 跑 npm install`);
    return true;
  }
  info(`目录: ${SERVER_DIR}`);
  // 用 spawnSync 而非 execSync，便于实时输出
  // npm.cmd 在 Windows 上是稳妥写法（即使 PS 7 + RemoteSigned 也兼容）
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npmCmd, ["install"], {
    cwd: SERVER_DIR,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) {
    err(`npm install 失败 (exit ${r.status})`);
    return false;
  }
  ok("依赖安装完成");
  return true;
}

// ============================================================
// Step 2: 注册 MCP server
// ============================================================
function stepRegisterMcp() {
  header("[2/4] 注册 MCP server 到 Cline settings");
  if (SKILLS_ONLY) {
    info("已跳过（--skills-only）");
    return true;
  }

  const candidates = getClineSettingsPaths().filter((p) => p && fs.existsSync(p));
  if (candidates.length === 0) {
    warn("未发现 Cline 的 cline_mcp_settings.json");
    info("可能原因：");
    dim("  - Cline 扩展未安装");
    dim("  - 你使用的是其他 IDE（自行参考 README §快速开始 §1 注册）");
    info("将在以下路径之一创建（Windows/macOS/Linux 已尝试常见位置）：");
    for (const p of getClineSettingsPaths()) dim(`  - ${p}`);
    // 不创建 — 用户应自己装好 Cline 后重跑
    return true; // 不视为致命错误
  }

  const serverEntry = {
    command: "node",
    args: [path.resolve(SERVER_DIR, "index.js").replace(/\\/g, "/")],
  };

  let touched = 0;
  for (const settingsPath of candidates) {
    info(`目标: ${settingsPath}`);
    const cfg = readJsonSafe(settingsPath) || {};
    cfg.mcpServers = cfg.mcpServers || {};

    const existing = cfg.mcpServers["skills-mcp-server"];
    if (existing && !FORCE) {
      const existingArg = (existing.args || [])[0] || "";
      if (existingArg === serverEntry.args[0]) {
        ok("已注册且路径一致，无需变更");
      } else {
        warn(`已注册但路径不同：${existingArg}`);
        info("使用 --force 覆盖，或手动编辑");
      }
      continue;
    }

    if (DRY_RUN) {
      info(`[dry-run] 将写入 mcpServers["skills-mcp-server"] = ${JSON.stringify(serverEntry)}`);
      continue;
    }

    cfg.mcpServers["skills-mcp-server"] = serverEntry;
    writeJsonPretty(settingsPath, cfg);
    ok(FORCE ? "已强制覆盖" : "已注册");
    touched++;
  }

  if (touched > 0 || DRY_RUN) {
    info("注册后需要 Cline 重新加载（重开 VS Code/Cursor 即可）");
  }
  return true;
}

// ============================================================
// Step 3: 复制 skills 到 ~/.claude/skills/
// ============================================================
function stepCopySkills() {
  header("[3/4] 复制 skills 到 Cline 全局目录");
  if (SERVER_ONLY) {
    info("已跳过（--server-only）");
    return true;
  }

  if (!fs.existsSync(SKILLS_DIR)) {
    err(`skills/ 目录不存在: ${SKILLS_DIR}`);
    return false;
  }

  info(`源:   ${SKILLS_DIR}`);
  info(`目标: ${SKILLS_TARGET}`);

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  if (entries.length === 0) {
    warn("skills/ 为空，无 skill 可复制");
    return true;
  }

  if (DRY_RUN) {
    for (const e of entries) info(`[dry-run] 复制 ${e.name}`);
    return true;
  }

  fs.mkdirSync(SKILLS_TARGET, { recursive: true });

  let copied = 0;
  let skipped = 0;
  for (const entry of entries) {
    const src = path.join(SKILLS_DIR, entry.name);
    const dst = path.join(SKILLS_TARGET, entry.name);

    if (fs.existsSync(dst) && !FORCE) {
      skipped++;
      dim(`  skip ${entry.name}（已存在，使用 --force 覆盖）`);
      continue;
    }

    if (FORCE && fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
    copyDirRecursive(src, dst);
    copied++;
    ok(`copy ${entry.name}`);
  }

  info(`总计：复制 ${copied} 个，跳过 ${skipped} 个`);
  return true;
}

// ============================================================
// Step 4: Sanity check（validate + tests）
// ============================================================
function stepSanityCheck() {
  header("[4/4] Sanity check");
  if (NO_TEST || DRY_RUN) {
    info(NO_TEST ? "已跳过（--no-test）" : "[dry-run] 将跑 validate + 测试");
    return true;
  }

  // validate-skills
  const validatePath = path.join(ROOT, "tools", "validate-skills.js");
  if (fs.existsSync(validatePath)) {
    info("跑 validate-skills.js");
    const r = spawnSync("node", [validatePath], { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) {
      err("validate-skills 失败");
      return false;
    }
    ok("Skills 校验通过");
  }

  // server tests（如果存在）
  if (!SKILLS_ONLY) {
    const tests = [
      "test-memory.js",
      "test-escape-fts.js",
      "test-handoff-lib.js",
      "test-handoff-handlers.js",
      "test-project-hash.js",
    ];
    for (const t of tests) {
      const tp = path.join(SERVER_DIR, t);
      if (!fs.existsSync(tp)) continue;
      info(`跑 ${t}`);
      const r = spawnSync("node", [t], { cwd: SERVER_DIR, stdio: "inherit" });
      if (r.status !== 0) {
        err(`${t} 失败`);
        return false;
      }
    }
    ok("所有测试通过");
  }
  return true;
}

// ============================================================
// 主流程
// ============================================================
function main() {
  console.log(`${c.bold}🧠 cline-skills-workspace · install${c.reset}`);
  console.log(`  Node: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Repo: ${ROOT}`);
  if (DRY_RUN) console.log(`  ${c.yellow}[DRY-RUN 模式：仅预览，不写入]${c.reset}`);
  if (FORCE) console.log(`  ${c.yellow}[FORCE 模式：覆盖已有配置]${c.reset}`);

  // Node 版本预检
  const m = /^v(\d+)\.(\d+)/.exec(process.version);
  const major = m ? parseInt(m[1], 10) : 0;
  const minor = m ? parseInt(m[2], 10) : 0;
  if (major < 22 || (major === 22 && minor < 5)) {
    console.log(`\n${c.red}✗ Node ≥ 22.5 required（node:sqlite stable）${c.reset}`);
    console.log(`  当前: ${process.version}`);
    console.log(`  建议: nvm install 22.5  /  从 https://nodejs.org 升级`);
    process.exit(1);
  }

  const steps = [
    ["server install", stepInstallServer],
    ["mcp register", stepRegisterMcp],
    ["skills copy", stepCopySkills],
    ["sanity check", stepSanityCheck],
  ];

  let failed = false;
  for (const [name, fn] of steps) {
    try {
      const r = fn();
      if (!r) {
        failed = true;
        break;
      }
    } catch (e) {
      console.log(`\n${c.red}✗ Step "${name}" threw:${c.reset} ${e.message}`);
      failed = true;
      break;
    }
  }

  console.log("");
  if (failed) {
    console.log(`${c.bold}${c.red}❌ 安装未完成${c.reset}`);
    console.log("修复后重跑 `node install.js`，或加 --dry-run 看预期");
    process.exit(1);
  }

  console.log(`${c.bold}${c.green}🎉 安装完成${c.reset}`);
  console.log("\n下一步：");
  if (!SKILLS_ONLY) {
    console.log(`  1. 重开 VS Code / Cursor → MCP server 自动加载`);
    console.log(`  2. 验证：在 Cline 里随便问一句，看 ${c.cyan}skills-mcp-server${c.reset} 是否出现在工具列表`);
  }
  if (!SERVER_ONLY) {
    console.log(`  3. Skills 已复制到 ${c.cyan}${SKILLS_TARGET}${c.reset}，Cline 启动时自动发现`);
  }
  console.log(`\n  文档：${c.dim}README.md / docs/product-positioning.md${c.reset}`);
}

main();