// ============================================================
// memory_recall — FTS5 检索跨会话记忆
// ============================================================

import { getDb, validateKind, VALID_KINDS } from "../lib/db.js";

export const toolDefinition = {
  name: "memory_recall",
  description: "在当前项目的本地记忆库中检索相关记忆（FTS5 全文 + tag 过滤）。新对话开始时建议无 query 调用，回顾近期 pinned/episodic 记忆。",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "FTS5 查询。支持空格 AND、OR、\"短语\"。留空则按 created_at 倒序返回最新记忆。"
      },
      kind: {
        type: "string",
        enum: ["episodic", "semantic", "procedural"],
        description: "可选，限定记忆类型"
      },
      tag: {
        type: "string",
        description: "可选，按单个 tag 精确过滤"
      },
      limit: {
        type: "number",
        description: "返回条数上限，默认 10，最大 50",
        default: 10
      }
    }
  }
};

function escapeFts(q) {
  // FTS5 不允许某些字符直接出现；裸用户输入用双引号包裹做短语匹配
  if (!q) return "";
  // 已含引号或操作符则原样使用，否则用引号包成短语
  if (/["()*]/.test(q) || /\b(AND|OR|NOT)\b/.test(q)) return q;
  return `"${q.replace(/"/g, '""')}"`;
}

export function handler(args) {
  const { query, kind, tag, limit = 10 } = args || {};
  const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

  try {
    if (kind) validateKind(kind);
    const { db, hash: projectHash } = getDb();

    let rows;
    const params = [];

    if (query && query.trim()) {
      let sql = `
        SELECT m.id, m.kind, m.content, m.tags, m.source, m.confidence, m.created_at, m.pinned,
               bm25(memories_fts) AS score
        FROM memories_fts
        JOIN memories m ON m.id = memories_fts.rowid
        WHERE memories_fts MATCH ?
      `;
      params.push(escapeFts(query.trim()));
      if (kind) { sql += ` AND m.kind = ?`; params.push(kind); }
      if (tag)  { sql += ` AND (',' || m.tags || ',') LIKE ?`; params.push(`%,${tag},%`); }
      sql += ` ORDER BY m.pinned DESC, score ASC LIMIT ?`;
      params.push(lim);
      rows = db.prepare(sql).all(...params);
    } else {
      let sql = `SELECT id, kind, content, tags, source, confidence, created_at, pinned FROM memories WHERE 1=1`;
      if (kind) { sql += ` AND kind = ?`; params.push(kind); }
      if (tag)  { sql += ` AND (',' || tags || ',') LIKE ?`; params.push(`%,${tag},%`); }
      sql += ` ORDER BY pinned DESC, created_at DESC LIMIT ?`;
      params.push(lim);
      rows = db.prepare(sql).all(...params);
    }

    if (rows.length === 0) {
      return {
        content: [{
          type: "text",
          text: `## 🔍 memory_recall: 无匹配\n\n- **project**: ${projectHash}\n- **query**: ${query || "(空)"} | kind=${kind || "*"} | tag=${tag || "*"}\n\n该项目的记忆库为空或无匹配条目。可用 \`memory_commit\` 写入第一条记忆。`
        }]
      };
    }

    const lines = rows.map(r => {
      const ts = new Date(r.created_at * 1000).toISOString().substring(0, 16).replace("T", " ");
      const pin = r.pinned ? "📌 " : "";
      const tags = r.tags ? ` [${r.tags}]` : "";
      return `### ${pin}#${r.id} · ${r.kind}${tags} · ${ts} · conf=${r.confidence}\n\n${r.content}\n`;
    });

    return {
      content: [{
        type: "text",
        text: `## 🧠 memory_recall · 命中 ${rows.length} 条 (project=${projectHash})\n\n${lines.join("\n---\n\n")}`
      }]
    };
  } catch (err) {
    return {
      content: [{
        type: "text",
        text: `## ❌ memory_recall 失败\n\n${err.message}\n\n合法 kind: ${VALID_KINDS.join(", ")}`
      }],
      isError: true
    };
  }
}