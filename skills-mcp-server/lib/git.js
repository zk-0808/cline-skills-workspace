// ============================================================
// lib/git.js — Git 仓库探测工具
// 用于 handoff 协议获取当前 branch / 项目根 / 检测仓库状态
// ============================================================

import { execSync } from "child_process";
import path from "path";
import fs from "fs";

/**
 * 在指定目录跑 git 命令，捕获输出。
 * 失败时返回 null（不抛异常，让调用方决定如何处理）。
 *
 * @param {string} cmd - git 子命令（不含 'git' 前缀）
 * @param {string} cwd - 工作目录
 * @returns {string|null} - 输出（trimmed），失败返回 null
 */
function runGit(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"], // 抑制 stderr
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * 检测当前目录是否在 git 仓库内。
 * 基于 `git rev-parse --is-inside-work-tree`。
 *
 * @param {string} [cwd] - 工作目录，默认 process.cwd()
 * @returns {boolean}
 */
export function isInGitRepo(cwd = process.cwd()) {
  return runGit("rev-parse --is-inside-work-tree", cwd) === "true";
}

/**
 * 获取当前 branch 名。
 * 处理三种情况：
 * - 普通 branch：返回 branch 名（如 "main", "feature/x"）
 * - detached HEAD：返回短 commit hash（如 "a1b2c3d"），便于 slug 化
 * - 不在 git 仓库 / 无 commit：返回 null
 *
 * @param {string} [cwd]
 * @returns {string|null}
 */
export function getCurrentBranch(cwd = process.cwd()) {
  if (!isInGitRepo(cwd)) return null;

  const branch = runGit("rev-parse --abbrev-ref HEAD", cwd);

  // detached HEAD 时返回 'HEAD'，回退到 short commit
  if (branch === "HEAD" || branch === null) {
    const shortHash = runGit("rev-parse --short HEAD", cwd);
    return shortHash; // 可能仍为 null（仓库刚 init 无 commit）
  }

  return branch;
}

/**
 * 获取项目根目录。
 * 优先级：
 *   1. 环境变量 CLINE_PROJECT_ROOT
 *   2. git rev-parse --show-toplevel
 *   3. process.cwd()
 *
 * 与 lib/db.js 的 getProjectHash() 保持一致：使用绝对路径 + 小写归一。
 *
 * @param {string} [cwd]
 * @returns {string} - 绝对路径
 */
export function getProjectRoot(cwd = process.cwd()) {
  if (process.env.CLINE_PROJECT_ROOT) {
    return path.resolve(process.env.CLINE_PROJECT_ROOT);
  }

  const gitRoot = runGit("rev-parse --show-toplevel", cwd);
  if (gitRoot) {
    // git 在 windows 上返回 forward slash，统一交给 path.resolve
    return path.resolve(gitRoot);
  }

  return path.resolve(cwd);
}

/**
 * 是否为 detached HEAD 状态。
 * 用于 handoff_write 在 detached 时给出告警。
 *
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function isDetachedHead(cwd = process.cwd()) {
  if (!isInGitRepo(cwd)) return false;
  return runGit("rev-parse --abbrev-ref HEAD", cwd) === "HEAD";
}

/**
 * 检测是否存在 .git 目录（不依赖 git 命令）。
 * 用于早期 fallback：当 git 命令不可用但目录存在时仍能识别。
 *
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function hasGitDir(cwd = process.cwd()) {
  let dir = path.resolve(cwd);
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, ".git"))) return true;
    dir = path.dirname(dir);
  }
  return false;
}

/**
 * 归一化 git remote URL，让等价仓库映射到同一字符串。
 *
 * 规则（保守，只改语义无关的差异）：
 *   - 转小写
 *   - 去 `.git` 后缀
 *   - 把 `git@host:owner/repo` 转成 `https://host/owner/repo`（SSH ↔ HTTPS 等价）
 *   - 去尾部 `/`
 *
 * @param {string|null} url
 * @returns {string|null}
 *
 * 示例：
 *   "git@github.com:zk-0808/cline-skills-workspace.git"
 *     → "https://github.com/zk-0808/cline-skills-workspace"
 *   "https://github.com/zk-0808/cline-skills-workspace.git/"
 *     → "https://github.com/zk-0808/cline-skills-workspace"
 *   null → null
 */
export function normalizeRemoteUrl(url) {
  if (!url || typeof url !== "string") return null;
  let u = url.trim().toLowerCase();

  // SSH form: git@host:owner/repo(.git) → https://host/owner/repo
  const sshMatch = /^git@([^:]+):(.+)$/.exec(u);
  if (sshMatch) {
    u = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  // 先去尾部 /（包括 .git/ 这种后接斜杠的情况）
  u = u.replace(/\/+$/, "");
  // 再去 .git 后缀
  u = u.replace(/\.git$/, "");

  return u || null;
}

/**
 * 获取仓库的远端 URL，作为跨设备稳定的项目身份。
 *
 * 查找优先级：
 *   1. git config remote.origin.url
 *   2. git remote get-url <第一个 remote>（origin 不存在时）
 *   3. 都没有 → null
 *
 * 返回值已经过 `normalizeRemoteUrl` 归一化。
 *
 * @param {string} [cwd]
 * @returns {string|null}
 *
 * 设计目的（来源：2026-06-18 外部评审 §2.4）：
 *   memory / handoff 跨设备恢复时，使用绝对路径 hash 会因不同机器路径不同
 *   而断档。git remote URL 跨机器稳定，是更合理的项目身份键。
 */
export function getRemoteUrl(cwd = process.cwd()) {
  if (!isInGitRepo(cwd)) return null;

  // 优先 origin
  let url = runGit("config --get remote.origin.url", cwd);

  // 没有 origin → 取第一个 remote
  if (!url) {
    const remotes = runGit("remote", cwd);
    if (remotes) {
      const first = remotes.split(/\r?\n/)[0]?.trim();
      if (first) {
        url = runGit(`remote get-url ${first}`, cwd);
      }
    }
  }

  return normalizeRemoteUrl(url);
}
