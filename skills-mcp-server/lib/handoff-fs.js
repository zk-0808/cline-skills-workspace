// ============================================================
// lib/handoff-fs.js — Handoff 文件系统层
// 职责：路径解析、命名规则、原子写入、目录管理
// 严格遵循 docs/handoff-schema.md §1
// ============================================================

import fs from "fs";
import path from "path";
import os from "os";
import { customAlphabet } from "nanoid/non-secure";
import { getProjectHash } from "./db.js";
import { getProjectRoot } from "./git.js";

// ============================================================
// 常量
// ============================================================

const HANDOFF_DIR_NAME = ".cline";
const HANDOFFS_SUBDIR = "handoffs";
const ARCHIVE_SUBDIR = "archive";
const LOCAL_ROOT = path.join(os.homedir(), ".cline-skills", "handoffs");

const ARCHIVE_ID = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

// ============================================================
// Slug 化（schema §1.3）
// ============================================================

/**
 * 将 git branch 名转为文件名安全的 slug。
 * 规则：替换 / _ 为 -，全小写，仅保留 ASCII 字母数字和 -。
 *
 * @param {string} branch
 * @returns {string}
 *
 * 示例：
 *   "feature/auth-refactor" → "feature-auth-refactor"
 *   "feature/AUTH_v2"       → "feature-auth-v2"
 *   "main"                  → "main"
 */
export function slugify(branch) {
  if (!branch || typeof branch !== "string") {
    throw new Error("slugify: branch 必须是非空字符串");
  }
  return branch
    .toLowerCase()
    .replace(/[\/_]/g, "-")            // / 和 _ 转 -
    .replace(/[^a-z0-9-]+/g, "-")      // 其他非法字符也转 -
    .replace(/-+/g, "-")               // 合并连续 -
    .replace(/^-|-$/g, "");            // 去首尾 -
}

// ============================================================
// 目录解析
// ============================================================

/**
 * 获取 handoff 根目录。
 *
 * @param {object} [opts]
 * @param {boolean} [opts.local=false] - 是否使用本地（用户目录）模式
 * @param {string} [opts.cwd] - 项目工作目录
 * @returns {{ dir: string, isLocal: boolean, projectRoot: string, projectHash: string }}
 */
export function getHandoffDir(opts = {}) {
  const { local = false, cwd } = opts;
  const projectRoot = getProjectRoot(cwd);
  const projectHash = getProjectHash(projectRoot);

  const dir = local
    ? path.join(LOCAL_ROOT, projectHash)
    : path.join(projectRoot, HANDOFF_DIR_NAME, HANDOFFS_SUBDIR);

  return { dir, isLocal: local, projectRoot, projectHash };
}

/**
 * 获取 archive 子目录。
 */
export function getArchiveDir(opts = {}) {
  const { dir } = getHandoffDir(opts);
  return path.join(dir, ARCHIVE_SUBDIR);
}

/**
 * 获取指定 branch 的 active handoff 文件完整路径。
 *
 * @param {string} branch
 * @param {object} [opts]
 * @returns {string}
 */
export function getActivePath(branch, opts = {}) {
  const slug = slugify(branch);
  const { dir } = getHandoffDir(opts);
  return path.join(dir, `HANDOFF_${slug}_active.md`);
}

/**
 * 生成归档文件路径。
 * 格式：HANDOFF_<slug>_<YYYY-MM-DD>_<nanoid6>.md
 *
 * @param {string} branch
 * @param {object} [opts]
 * @param {Date} [opts.date]
 * @returns {string}
 */
export function getArchivePath(branch, opts = {}) {
  const slug = slugify(branch);
  const date = opts.date || new Date();
  const dateStr = formatDate(date);
  const archiveDir = getArchiveDir(opts);
  return path.join(archiveDir, `HANDOFF_${slug}_${dateStr}_${ARCHIVE_ID()}.md`);
}

/**
 * 列出所有 active handoff 文件路径（不含 archive）。
 *
 * @param {object} [opts]
 * @returns {string[]}
 */
export function listActiveFiles(opts = {}) {
  const { dir } = getHandoffDir(opts);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /^HANDOFF_.+_active\.md$/.test(d.name))
    .map((d) => path.join(dir, d.name));
}

/**
 * 列出归档文件（按修改时间倒序）。
 *
 * @param {object} [opts]
 * @param {number} [opts.limit] - 最多返回多少条，默认全部
 * @returns {string[]}
 */
export function listArchiveFiles(opts = {}) {
  const archiveDir = getArchiveDir(opts);
  if (!fs.existsSync(archiveDir)) return [];

  const files = fs
    .readdirSync(archiveDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /^HANDOFF_.+\.md$/.test(d.name))
    .map((d) => {
      const fullPath = path.join(archiveDir, d.name);
      return {
        path: fullPath,
        mtime: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .map((x) => x.path);

  return opts.limit ? files.slice(0, opts.limit) : files;
}

// ============================================================
// 文件 I/O
// ============================================================

/**
 * 确保目录存在（递归创建）。
 */
export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * 原子写入：先写 .tmp，再 rename。
 * 跨平台一致；中途崩溃不会留下半截文件。
 *
 * @param {string} filePath
 * @param {string} content
 */
export function atomicWriteFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content, { encoding: "utf8" });
  // Windows 上 rename 已存在文件可能失败，先删除目标
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  fs.renameSync(tmp, filePath);
}

/**
 * 读取文件（UTF-8）。文件不存在返回 null。
 */
export function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * 移动文件（用于 active → archive）。
 * 跨设备时回退到 copy + unlink。
 */
export function moveFile(src, dst) {
  ensureDir(path.dirname(dst));
  try {
    fs.renameSync(src, dst);
  } catch (err) {
    if (err.code === "EXDEV") {
      // 跨设备
      fs.copyFileSync(src, dst);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 格式化日期为 YYYY-MM-DD（本地时区）。
 */
export function formatDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ============================================================
// 导出常量（供测试 / handler 使用）
// ============================================================

export {
  HANDOFF_DIR_NAME,
  HANDOFFS_SUBDIR,
  ARCHIVE_SUBDIR,
  LOCAL_ROOT,
};