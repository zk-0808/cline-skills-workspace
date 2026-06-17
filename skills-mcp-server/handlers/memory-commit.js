// ============================================================
// memory_commit — 持久化一条跨会话记忆
// ============================================================

import { getDb, validateKind } from "../lib/db.js";

export const toolDefinition = {
  name: "memory_commit",
  description: "持久化一条跨会话记忆到当前项目的本地 SQLite 库。用于沉淀：用户偏好、项目架构假设、失败教训、关键决策。下次新对话可用 memory_recall 检索。",
  inputSchema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: ["episodic", "semantic", "procedural"],
        description: "记忆类型：episodic=具体事件（带时间戳）；semantic=项目/技术事实；procedural=用户偏好/工作流"
      },
      content: {
        type: "string",
        description: "记忆正文，建议一两句话讲清「是什么 + 为什么/什么场景下成立」"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "标签数组，用于分类检索（如 ['windows','powershell']）"
      },
      source: {
        type: "string",
        description: "来源标记，如 'user'、'agent'、'file:LEARNINGS.md'"
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "可信度 0-1，默认 0.8。用户明确说的为 1.0，Agent 推断的为 0.6"
      }
    },
    required: ["kind", "content"]
  }
};

export function handler(args) {
  const { kind, content, tags = [], source = "agent", confidence = 0.8 } = args;

  try {
    validateKind(kind);
    if (!content || content.trim().length < 5) {
      throw new Error("content 太短（< 5 字符），拒绝写入");
    }

    const { db, hash: projectHash } = getDb();
    const tagsStr = Array.isArray(tags) ? tags.join(",") : String(tags || "");
    const createdAt = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO memories (kind, content, tags, source, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(kind, content.trim(), tagsStr, source, confidence, createdAt);

    return {
      content: [{
        type: "text",
        text: `## ✅ 记忆已持久化\n\n- **ID**: ${info.lastInsertRowid}\n- **kind**: ${kind}\n- **project**: ${projectHash}\n- **confidence**: ${confidence}\n- **tags**: ${tagsStr || "(无)"}\n- **source**: ${source}\n\n下次新对话调用 \`memory_recall\` 即可检索本条记忆。\n\n### 写入内容预览\n\n> ${content.substring(0, 200)}${content.length > 200 ? "..." : ""}`
      }]
    };
  } catch (err) {
    return {
      content: [{
        type: "text",
        text: `## ❌ memory_commit 失败\n\n${err.message}`
      }],
      isError: true
    };
  }
}