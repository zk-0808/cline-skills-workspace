// ============================================================
// handoff_write — 写入/更新当前 branch 的 active handoff
// 严格遵循 docs/handoff-schema.md §6
// ============================================================

import path from "path";
import fs from "fs";
import {
  getActivePath,
  getArchivePath,
  getArchiveDir,
  readFileSafe,
  atomicWriteFile,
  moveFile,
  ensureDir,
  slugify,
} from "../lib/handoff-fs.js";
import {
  parseHandoff,
  serializeHandoff,
  validate,
  buildFrontmatter,
  mergeFrontmatter,
  SCHEMA_VERSION,
  REQUIRED_SECTIONS,
} from "../lib/handoff-schema.js";
import {
  getCurrentBranch,
  isInGitRepo,
  getProjectRoot,
  isDetachedHead,
} from "../lib/git.js";
import { getProjectHash } from "../lib/db.js";

export const toolDefinition = {
  name: "handoff_write",
  description:
    "写入/更新当前 git branch 的 active handoff 文件（.cline/handoffs/HANDOFF_<slug>_active.md）。" +
    "用于会话结束时记录工作交接：goal / completed / in_progress / next_action / do_not / artifacts。" +
    "首次调用必须传 goal；之后字段合并（未传字段保留旧值）。" +
    "status=done 会立即归档；status=blocked 必须传 blocked_by。",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["active", "blocked", "done"],
        description: "默认 active。done 会立即归档到 archive/。blocked 时 blocked_by 必填。",
      },
      goal: {
        type: "string",
        description: "一句话项目目标（首次创建必填，建议 ≤120 字符）",
      },
      completed: {
        type: "array",
        items: { type: "string" },
        description: "已完成的里程碑（bullet 列表）",
      },
      in_progress: {
        type: "array",
        items: { type: "string" },
        description: "正在进行但未完成的事项",
      },
      next_action: {
        type: "array",
        items: { type: "string" },
        description: "下一步可执行动作（首次创建至少 1 项）",
      },
      do_not: {
        type: "array",
        items: { type: "string" },
        description: "已确认无效的尝试 / 锁定的不变量（差异化价值最高）",
      },
      artifacts: {
        type: "array",
        items: { type: "string" },
        description: "本任务涉及的关键文件路径（让下个会话直接 read_file）",
      },
      blocked_by: {
        type: "array",
        items: { type: "string" },
        description: "status=blocked 时必填：被什么阻塞",
      },
      local: {
        type: "boolean",
        description: "默认 false。true 时落地到 ~/.cline-skills/handoffs/<project-hash>/",
      },
    },
  },
};

export async function handler(args = {}) {
  const {
    status = "active",
    goal,
    completed,
    in_progress,
    next_action,
    do_not,
    artifacts,
    blocked_by,
    local = false,
  } = args;

  try {
    // 1. 环境前置检查
    const projectRoot = getProjectRoot();
    const inGit = isInGitRepo(projectRoot);
    if (!inGit && !local) {
      return errorResult(
        "NOT_IN_GIT",
        "当前目录不在 git 仓库内。请先 `git init`，或显式 `local: true` 落到用户目录。"
      );
    }

    // 2. 获取 branch（不在 git 时 local 模式用占位）
    let branch = inGit ? getCurrentBranch(projectRoot) : null;
    if (!branch) {
      if (local) branch = "local-default";
      else
        return errorResult(
          "NO_BRANCH",
          "无法确定当前 branch（可能仓库无 commit 或 detached）。请先创建 commit 或切到具体 branch。"
        );
    }

    // 3. 计算 active 路径，读旧文件（若存在）
    const activePath = getActivePath(branch, { local });
    const oldContent = readFileSafe(activePath);
    const isUpdate = oldContent !== null;

    // 4. status=blocked 必填 blocked_by
    if (status === "blocked") {
      const bb = blocked_by || [];
      if (bb.length === 0) {
        return errorResult(
          "BLOCKED_REQUIRES_REASON",
          "status=blocked 必须提供非空 blocked_by 数组。"
        );
      }
    }

    // 5. 构造 frontmatter
    let newFm;
    let oldSections = {};
    if (isUpdate) {
      const parsedOld = parseHandoff(oldContent);
      if (parsedOld.frontmatterError) {
        return errorResult(
          "INVALID_EXISTING",
          `旧 handoff 文件无法解析：${parsedOld.frontmatterError}。请手动修复后重写。`
        );
      }
      oldSections = parsedOld.sections || {};
      newFm = mergeFrontmatter(parsedOld.frontmatter, {
        status,
        goal,
        // branch 不允许通过参数覆盖；以 git 实际为准
        branch,
        project_hash: getProjectHash(projectRoot),
      });
    } else {
      // 首创：goal 必填
      if (!goal || !String(goal).trim()) {
        return errorResult(
          "GOAL_REQUIRED_ON_FIRST_WRITE",
          buildGoalRequiredDiagnostics({
            branch,
            activePath,
            projectRoot,
            local,
          })
        );
      }
      newFm = buildFrontmatter({ branch, goal, status, cwd: projectRoot });
    }

    // 6. 合并 sections（未传字段保留旧值；首创时缺省为 []）
    const sections = mergeSections(oldSections, {
      completed,
      in_progress,
      next_action,
      do_not,
      artifacts,
      blocked_by,
    });

    // 7. 首次写入要求 next_action 至少 1 项；更新时若用户清空允许（但 validate 会报 E009）
    if (!isUpdate && (sections.next_action || []).length === 0) {
      return errorResult(
        "NEXT_ACTION_REQUIRED",
        "首次创建 handoff 必须至少 1 项 next_action。"
      );
    }

    // 8. 写入前校验
    const parsed = {
      frontmatter: newFm,
      sections,
      sectionOrder: REQUIRED_SECTIONS.concat(["blocked_by"]),
      raw: "",
      frontmatterError: null,
    };
    const { errors } = validate(parsed, {
      expectedBranch: undefined, // 文件名 slug 由我们生成，无需 E011
      expectedProjectHash: getProjectHash(projectRoot),
      checkStale: false, // 写入时不检查 stale
    });
    if (errors.length) {
      return errorResult(
        "VALIDATION_FAILED",
        `校验未通过：\n${errors.map((e) => `  - ${e}`).join("\n")}`
      );
    }

    // 9. 序列化并原子写入
    const out = serializeHandoff({ frontmatter: newFm, sections });
    atomicWriteFile(activePath, out);

    // 10. status=done 立即归档
    let finalPath = activePath;
    let archived = false;
    if (status === "done") {
      const archivePath = getArchivePath(branch, { local });
      ensureDir(path.dirname(archivePath));
      moveFile(activePath, archivePath);
      finalPath = archivePath;
      archived = true;
    }

    // 11. 返回结果
    const relPath = path.relative(projectRoot, finalPath) || finalPath;
    const lines = [
      `## ✅ handoff ${isUpdate ? "已更新" : "已创建"}${archived ? "并归档" : ""}`,
      ``,
      `- **branch**: \`${branch}\``,
      `- **status**: \`${status}\``,
      `- **path**: \`${relPath.replace(/\\/g, "/")}\``,
      `- **mode**: ${local ? "local（用户目录）" : "git-tracked"}`,
      `- **goal**: ${newFm.goal}`,
      `- **next_action**: ${(sections.next_action || []).length} 项`,
      `- **do_not**: ${(sections.do_not || []).length} 项`,
    ];
    if (archived) {
      lines.push(``, `> 文件已移动到 archive/，active 槽位已释放。`);
    } else {
      lines.push(
        ``,
        `> 下次会话调用 \`handoff_resume\` 即可恢复上下文。`
      );
    }
    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  } catch (err) {
    return errorResult("UNCAUGHT", err.stack || err.message);
  }
}

// ============================================================
// 辅助：合并 sections
// ============================================================

function mergeSections(oldSecs, input) {
  const fields = [
    "completed",
    "in_progress",
    "next_action",
    "do_not",
    "artifacts",
    "blocked_by",
  ];
  const out = {};
  for (const k of fields) {
    if (input[k] !== undefined) {
      // 用户传入（包括传 [] 表示清空）
      out[k] = Array.isArray(input[k]) ? input[k] : [];
    } else if (oldSecs[k] !== undefined) {
      out[k] = oldSecs[k];
    } else {
      out[k] = [];
    }
  }
  return out;
}

function errorResult(code, details) {
  return {
    content: [
      {
        type: "text",
        text: `## ❌ handoff_write 失败 [${code}]\n\n${details}`,
      },
    ],
    isError: true,
  };
}

// ============================================================
// GOAL_REQUIRED 诊断信息构造
// ------------------------------------------------------------
// 设计依据：docs/dogfooding-sprint-retrospective.md §1 Q2
// 核心：active 文件不存在时报 GOAL_REQUIRED 是预期行为（done = 终态）
//       但用户视角易误以为「同会话刚 resume 过应该能继续」
//       → 错误信息必须明确：是新建语义 / active 期望路径 / 是否有归档候选
// ============================================================

function buildGoalRequiredDiagnostics({ branch, activePath, projectRoot, local }) {
  const relActivePath =
    path.relative(projectRoot, activePath).replace(/\\/g, "/") || activePath;

  // 探测 archive 下是否有同 slug 候选（最近 3 个）
  const slug = slugify(branch);
  let archiveCandidates = [];
  try {
    const archiveDir = getArchiveDir({ local });
    if (fs.existsSync(archiveDir)) {
      archiveCandidates = fs
        .readdirSync(archiveDir, { withFileTypes: true })
        .filter(
          (d) =>
            d.isFile() &&
            d.name.startsWith(`HANDOFF_${slug}_`) &&
            d.name.endsWith(".md")
        )
        .map((d) => {
          const fp = path.join(archiveDir, d.name);
          return { name: d.name, mtime: fs.statSync(fp).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 3);
    }
  } catch {
    // archive 探测失败不影响主流程
  }

  const lines = [
    `首次创建 handoff 必须传 \`goal\`（一句话项目目标）。`,
    ``,
    `### 📍 诊断`,
    `- **branch**: \`${branch}\``,
    `- **期望 active 路径**: \`${relActivePath}\` _(不存在)_`,
    `- **写入语义**: 因 active 文件不存在，本次 write 视为**新建 handoff**`,
  ];

  if (archiveCandidates.length > 0) {
    lines.push(
      `- **同 slug 归档候选**: 检测到 ${archiveCandidates.length} 个最近归档文件：`,
      ...archiveCandidates.map((c) => `    - \`${c.name}\``),
      ``,
      `> ⚠️ 上一个同 branch 的 handoff 已被归档（可能是 \`status=done\` 或手动归档）。`,
      `> 这意味着旧任务在语义上已**结束**。如果你想：`,
      `> - **延续旧任务的工作**：请显式传 \`goal\`（可从归档文件 read_file 复制旧 goal）`,
      `> - **开始新任务**：传一个新的 \`goal\``
    );
  } else {
    lines.push(
      `- **同 slug 归档候选**: 无（archive 目录无同 branch 归档文件）`,
      ``,
      `> 这是该 branch 上的全新 handoff。请传 \`goal\` + 至少 1 项 \`next_action\`。`
    );
  }

  lines.push(
    ``,
    `### 🔧 修复方法`,
    `调用 \`handoff_write\` 时传：`,
    `- \`goal\`: 一句话目标（≤120 字符）`,
    `- \`next_action\`: 至少 1 项可执行动作`,
    ``,
    `> 💡 schema 语义：\`status=done\` 是**终态**，归档后 active 槽位释放，下次 write 即新建。`,
    `> 详见 \`docs/handoff-schema.md\` §3 状态机。`
  );

  return lines.join("\n");
}
