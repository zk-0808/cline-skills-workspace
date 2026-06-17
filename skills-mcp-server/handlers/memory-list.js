// ============================================================
// memory_list — 列出项目记忆 / 删除 / 钉选 / 统计
// ============================================================

import { getDb, validateKind } from "../lib/db.js";

export const toolDefinition = {
  name: "memory_list",
  description: "管理项目记忆：list 浏览 / stats 统计 / delete 删除 / pin 钉选 / unpin 取消钉选。无副作用操作可放心调用。",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list", "stats", "delete", "pin", "unpin"],
        description: "操作类型，默认 list"
      },
      id: {
        type: "number",
        description: "delete/pin/unpin 时必填，记忆 ID"
      },
      kind: {
        type: "string",
        enum: ["episodic", "semantic", "procedural"],
        description: "list 时可选过滤"
      },
      limit: {
        type: "number",
        description: "list 上限，默认 20",
        default: 20
      }
    }
  }
};

export function handler(args) {
  const { action = "list", id, kind, limit = 20 } = args || {};

  try {
    const { db, hash: projectHash } = getDb();

    if (action === "stats") {
      const total = db.prepare("SELECT COUNT(*) AS c FROM memories").get().c;
      const byKind = db.prepare("SELECT kind, COUNT(*) AS c FROM memories GROUP BY kind").all();
      const pinned = db.prepare("SELECT COUNT(*) AS c FROM memories WHERE pinned=1").get().c;
      const latest = db.prepare("SELECT MAX(created_at) AS t FROM memories").get().t;
      const latestStr = latest ? new Date(latest * 1000).toISOString().substring(0, 16).replace("T", " ") : "(无)";

      const kindLines = byKind.map(r => `  - ${r.kind}: ${r.c}`).join("\n") || "  (空)";
      return {
        content: [{
          type: "text",
          text: `## 📊 memory_list · stats\n\n- **project**: ${projectHash}\n- **total**: ${total}\n- **pinned**: ${pinned}\n- **latest**: ${latestStr}\n\n### 按 kind 分布\n${kindLines}`
        }]
      };
    }

    if (action === "delete") {
      if (!id) throw new Error("delete 需要 id 参数");
      const info = db.prepare("DELETE FROM memories WHERE id=?").run(id);
      return {
        content: [{
          type: "text",
          text: info.changes > 0
            ? `## 🗑️ 已删除记忆 #${id}（project=${projectHash}）`
            : `## ⚠️ 未找到记忆 #${id}`
        }]
      };
    }

    if (action === "pin" || action === "unpin") {
      if (!id) throw new Error(`${action} 需要 id 参数`);
      const val = action === "pin" ? 1 : 0;
      const info = db.prepare("UPDATE memories SET pinned=? WHERE id=?").run(val, id);
      return {
        content: [{
          type: "text",
          text: info.changes > 0
            ? `## 📌 记忆 #${id} 已${action === "pin" ? "钉选" : "取消钉选"}`
            : `## ⚠️ 未找到记忆 #${id}`
        }]
      };
    }

    // 默认 list
    if (kind) validateKind(kind);
    const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    let sql = `SELECT id, kind, content, tags, source, confidence, created_at, pinned FROM memories`;
    const params = [];
    if (kind) { sql += ` WHERE kind=?`; params.push(kind); }
    sql += ` ORDER BY pinned DESC, created_at DESC LIMIT ?`;
    params.push(lim);
    const rows = db.prepare(sql).all(...params);

    if (rows.length === 0) {
      return {
        content: [{
          type: "text",
          text: `## 📭 项目记忆库为空 (project=${projectHash})\n\n用 \`memory_commit\` 写入第一条记忆。`
        }]
      };
    }

    const lines = rows.map(r => {
      const ts = new Date(r.created_at * 1000).toISOString().substring(0, 16).replace("T", " ");
      const pin = r.pinned ? "📌" : "  ";
      const preview = r.content.length > 80 ? r.content.substring(0, 80) + "…" : r.content;
      return `${pin} #${String(r.id).padStart(3, " ")} · ${r.kind.padEnd(10)} · ${ts} · ${preview}`;
    });

    return {
      content: [{
        type: "text",
        text: `## 📜 memory_list · ${rows.length} 条 (project=${projectHash})\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n\n用 \`memory_recall\` 检索内容；\`memory_list action=delete id=N\` 删除。`
      }]
    };
  } catch (err) {
    return {
      content: [{
        type: "text",
        text: `## ❌ memory_list 失败\n\n${err.message}`
      }],
      isError: true
    };
  }
}