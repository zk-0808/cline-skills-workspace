// ============================================================
// compact_context — 生成"会话压缩交接包"
// 输入：当前任务目标 + 关键决策 + 未完事项 + 重要文件
// 输出：结构化交接 Markdown，并可选自动 memory_commit 一条 episodic 记忆
// ============================================================

import { getDb } from "../lib/db.js";

export const toolDefinition = {
  name: "compact_context",
  description: "在上下文窗口接近上限时，把当前会话压缩为结构化交接包（Markdown），便于喂给新会话恢复状态。可选 persist=true 自动写入一条 episodic 记忆。",
  inputSchema: {
    type: "object",
    properties: {
      objective: {
        type: "string",
        description: "当前任务的最终目标（一句话）"
      },
      progress_done: {
        type: "array",
        items: { type: "string" },
        description: "已完成的关键里程碑（按时序）"
      },
      progress_pending: {
        type: "array",
        items: { type: "string" },
        description: "未完成的待办（按优先级）"
      },
      key_decisions: {
        type: "array",
        items: { type: "string" },
        description: "关键决策与依据，每条建议附 [实测]/[源码]/[文档]/[推测] 标注"
      },
      key_files: {
        type: "array",
        items: { type: "string" },
        description: "本任务涉及的关键文件路径（让新会话能直接 read_file）"
      },
      open_questions: {
        type: "array",
        items: { type: "string" },
        description: "尚未解决的疑问 / 需用户确认的事项"
      },
      next_action: {
        type: "string",
        description: "新会话应执行的第一个动作（精确到工具调用层面）"
      },
      persist: {
        type: "boolean",
        description: "是否同时写入一条 episodic 记忆，默认 false",
        default: false
      }
    },
    required: ["objective", "next_action"]
  }
};

function bullets(arr, fallback = "_(无)_") {
  if (!arr || arr.length === 0) return fallback;
  return arr.map(x => `- ${x}`).join("\n");
}

export function handler(args) {
  const {
    objective,
    progress_done = [],
    progress_pending = [],
    key_decisions = [],
    key_files = [],
    open_questions = [],
    next_action,
    persist = false
  } = args || {};

  if (!objective || !next_action) {
    return {
      content: [{ type: "text", text: "## ❌ compact_context 失败\n\n必填: objective, next_action" }],
      isError: true
    };
  }

  const ts = new Date().toISOString().substring(0, 16).replace("T", " ");
  const md = `# 🗜️ 会话交接包 · ${ts}

> **使用说明**：把整段 Markdown 粘贴到新会话首条消息（或用 \`new_task\` 的 context 参数），新 Agent 可立即接续工作。

## 🎯 任务目标

${objective}

## ✅ 已完成 (${progress_done.length})

${bullets(progress_done)}

## ⏳ 待完成 (${progress_pending.length})

${bullets(progress_pending)}

## 🧭 关键决策

${bullets(key_decisions)}

## 📁 关键文件

${bullets(key_files.map(f => `\`${f}\``))}

## ❓ 未解决疑问

${bullets(open_questions)}

## ▶️ 新会话第一步

${next_action}

---

_由 \`compact_context\` 生成。建议新会话开局调用 \`memory_recall\` 复盘项目背景。_
`;

  let memoryNote = "";
  if (persist) {
    try {
      const { db, hash } = getDb();
      const summary = `[交接] 目标: ${objective.substring(0, 80)} | 下一步: ${next_action.substring(0, 80)}`;
      const stmt = db.prepare(`
        INSERT INTO memories (kind, content, tags, source, confidence, created_at)
        VALUES ('episodic', ?, 'handoff,compact', 'compact_context', 0.9, ?)
      `);
      const info = stmt.run(summary, Math.floor(Date.now() / 1000));
      memoryNote = `\n\n> 📝 已自动写入 episodic 记忆 #${info.lastInsertRowid} (project=${hash})`;
    } catch (err) {
      memoryNote = `\n\n> ⚠️ 记忆持久化失败: ${err.message}`;
    }
  }

  return {
    content: [{ type: "text", text: md + memoryNote }]
  };
}