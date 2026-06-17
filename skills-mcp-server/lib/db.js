// ============================================================
// lib/db.js — Memory 存储后端
// SQLite + FTS5，按项目隔离 (~/.cline-skills/memory/{project-hash}/memory.db)
// ============================================================

import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.join(os.homedir(), ".cline-skills", "memory");
const VALID_KINDS = ["episodic", "semantic", "procedural"];

// 进程级连接缓存：同一项目复用同一个 Database 实例
const dbCache = new Map();

/**
 * 计算项目哈希。优先使用环境变量 CLINE_PROJECT_ROOT，否则用 process.cwd()。
 * 返回 sha256 截 12 字符。
 */
export function getProjectHash(projectRoot) {
  const root = projectRoot || process.env.CLINE_PROJECT_ROOT || process.cwd();
  const normalized = path.resolve(root).toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 12);
}

/**
 * 确保项目目录存在并返回 db 文件路径
 */
function getDbPath(projectHash) {
  const dir = path.join(ROOT, projectHash);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "memory.db");
}

/**
 * 初始化 schema (idempotent)
 */
function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('episodic','semantic','procedural')),
      content TEXT NOT NULL,
      tags TEXT DEFAULT '',
      source TEXT DEFAULT '',
      confidence REAL DEFAULT 0.8,
      created_at INTEGER NOT NULL,
      pinned INTEGER DEFAULT 0
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content, tags,
      content='memories', content_rowid='id',
      tokenize='unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content, tags)
      VALUES('delete', old.id, old.content, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content, tags)
      VALUES('delete', old.id, old.content, old.tags);
      INSERT INTO memories_fts(rowid, content, tags)
      VALUES (new.id, new.content, new.tags);
    END;

    CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
    CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
  `);
}

/**
 * 获取（或创建）当前项目的 Database 连接
 */
export function getDb(projectRoot) {
  const hash = getProjectHash(projectRoot);
  if (dbCache.has(hash)) return { db: dbCache.get(hash), hash };

  const dbPath = getDbPath(hash);
  const db = new DatabaseSync(dbPath);
  // node:sqlite 没有 pragma() 简便方法，用 exec
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  initSchema(db);
  dbCache.set(hash, db);
  return { db, hash };
}

/**
 * 校验 kind 是否合法
 */
export function validateKind(kind) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`非法 kind="${kind}"，合法值: ${VALID_KINDS.join(", ")}`);
  }
}

/**
 * 关闭所有缓存的连接（测试用）
 */
export function closeAll() {
  for (const db of dbCache.values()) {
    try { db.close(); } catch (e) { /* ignore */ }
  }
  dbCache.clear();
}

export { ROOT, VALID_KINDS };