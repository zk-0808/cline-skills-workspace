// ============================================================
// handoff_resume — 新会话开局：定位/校验/恢复 active handoff
// 严格遵循 docs/handoff-schema.md §5（7 步流程）
// ============================================================

import path from "path";
import {
  getActivePath,
  getHandoffDir,
  readFileSafe,
  atomicWriteFile,
  slugify,
} from "../lib/handoff-fs.js";
import {
  parseHandoff,
  serializeHandoff,
  validate,
  isStale,
  daysSinceUpdate,
  STALE_DAYS_DEFAULT,
} from "../lib/handoff-schema.js";
import {
  getCurrentBranch,
  isInGitRepo,
  getProjectRoot,
} from "../lib/git.js";
import { getProjectHash } from "../lib/db.js";

export const toolDefinition = {
  name: "handoff_resume",
  description:
    "新会话开局：读取当前 git branch 的 active handoff 文件，校验后返回结构化恢复包" +
    "（goal / next_action / do_not / in_progress / artifacts / stale_days）。" +
    "调用方应在响应中主动复述 next_action 和 do_not，等用户确认后再继续工作。" +
    "若文件不存在/无效/branch 不匹配/已 stale/项目 hash 不符 → 返回 ok=false 与具体错误码。",
  inputSchema: {
    type: "object",
    properties: {
      local: {
        type: "boolean",
        description: "默认 false。true 时从 ~/.cline-skills/handoffs/<project-hash>/ 读取。",
      },
      branch: {
        type: "string",
        description: "可选：显式指定 branch（覆盖 git 自动探测）。少数情况下用于跨 branch 查询。",
      },
      confirm_branch_mismatch: {
        type: "boolean",
        description: "默认 false。true 时即使 branch 不匹配也强制返回（用户确认）。",
      },
      confirm_stale: {
        type: "boolean",
        description: "默认 false。true 时即使 stale 也返回并自动改 status=stale 写回。",
      },
      confirm_project_hash_mismatch: {
        type: "boolean",
        description: "默认 false。true 时即使 project_hash 不匹配也强制返回。",
      },
      stale_days: {
        type: "number",
        description: `stale 阈值（默认 ${STALE_DAYS_DEFAULT} 天）`,
      },
    },
  },
};

export async function handler(args = {}) {
  const {
    local = false,
    branch: branchOverride,
    confirm_branch_mismatch = false,
    confirm_stale = false,
    confirm_project_hash_mismatch = false,
    stale_days = STALE_DAYS_DEFAULT,
  } = args;

  try {
    const projectRoot = getProjectRoot();
    const inGit = isInGitRepo(projectRoot);

    // ===== Step 1：定位文件 =====
    let currentBranch = branchOverride || (inGit ? getCurrentBranch(projectRoot) : null);
    if (!currentBranch && local) currentBranch = "local-default";
    if (!currentBranch) {
      return failResult("NO_BRANCH", "无法确定当前 branch。请确认在 git 仓库内或传 branch 参数。");
    }

    const activePath = getActivePath(currentBranch, { local });

    // ===== Step 2：存在性检查 =====
    const content = readFileSafe(activePath);
    if (content === null) {
      const { dir } = getHandoffDir({ local });
      return failResult(
        "NO_HANDOFF",
        `当前 branch \`${currentBranch}\` 无 active handoff。\n` +
          `查找路径：${path.relative(projectRoot, activePath).replace(/\\/g, "/") || activePath}\n\n` +
          `**下一步**：调用 \`handoff_write\` 创建第一个 handoff，传入 goal + next_action。`
      );
    }

    // ===== Step 3：解析 + 致命错误检查 =====
    const parsed = parseHandoff(content);
    const expectedSlug = slugify(currentBranch);
    const currentProjectHash = getProjectHash(projectRoot);

    const { errors, warnings } = validate(parsed, {
      expectedBranch: expectedSlug,
      expectedProjectHash: currentProjectHash,
      staleDays: stale_days,
      checkStale: true,
    });

    // 过滤出阻塞性 error（E011/E012 单独走 4/6 步处理）
    const blockingErrors = errors.filter(
      (e) => !e.startsWith("E011") && !e.startsWith("E012")
    );
    if (blockingErrors.length) {
      return failResult(
        "INVALID_HANDOFF",
        `handoff 文件校验失败：\n${blockingErrors.map((e) => `  - ${e}`).join("\n")}`,
        { errors: blockingErrors }
      );
    }

    const fm = parsed.frontmatter;
    const sections = parsed.sections;

    // ===== Step 4：branch 一致性 =====
    const branchMismatch = errors.some((e) => e.startsWith("E011")) ||
      (fm.branch && slugify(String(fm.branch)) !== expectedSlug);
    if (branchMismatch && !confirm_branch_mismatch) {
      return failResult(
        "BRANCH_MISMATCH",
        `handoff 中的 branch="${fm.branch}" 与当前 git branch="${currentBranch}" 不一致。\n` +
          `**下一步**：确认你想恢复的 branch 后，重试时传 \`confirm_branch_mismatch: true\`。`
      );
    }

    // ===== Step 6：project_hash 一致性 =====
    const hashMismatch = errors.some((e) => e.startsWith("E012"));
    if (hashMismatch && !confirm_project_hash_mismatch) {
      return failResult(
        "PROJECT_HASH_MISMATCH",
        `handoff 的 project_hash="${fm.project_hash}" 与当前项目 hash="${currentProjectHash}" 不一致。\n` +
          `项目可能被搬迁/clone 到新路径。\n` +
          `**下一步**：若确认是同一项目，重试时传 \`confirm_project_hash_mismatch: true\`。`
      );
    }

    // ===== Step 5：stale 检测 =====
    const stale = fm.status === "active" && fm.updated_at && isStale(fm.updated_at, stale_days);
    const staleDaysCount = fm.updated_at ? daysSinceUpdate(fm.updated_at) : null;

    if (stale && !confirm_stale) {
      return failResult(
        "STALE_HANDOFF",
        `handoff 距今 ${staleDaysCount} 天未更新（≥ ${stale_days} 天阈值）。\n` +
          `goal: ${fm.goal}\n` +
          `**下一步**：若确认仍要继续此 handoff，重试时传 \`confirm_stale: true\`（会自动改 status=stale 写回）。`
      );
    }

    // 若 confirm_stale + 实际 stale → 自动改 status=stale 写回（不更新 updated_at，保持历史标记）
    if (stale && confirm_stale && fm.status !== "stale") {
      const newFm = { ...fm, status: "stale" };
      const out = serializeHandoff({ frontmatter: newFm, sections });
      atomicWriteFile(activePath, out);
    }

    // ===== Step 7：返回结构化恢复包 =====
    const resumePack = {
      ok: true,
      branch: fm.branch,
      goal: fm.goal,
      status: stale ? "stale" : fm.status,
      next_action: sections.next_action || [],
      do_not: sections.do_not || [],
      completed_count: (sections.completed || []).length,
      in_progress: sections.in_progress || [],
      artifacts: sections.artifacts || [],
      stale_days: staleDaysCount,
      blocked_by: (sections.blocked_by || []).length ? sections.blocked_by : null,
      path: path.relative(projectRoot, activePath).replace(/\\/g, "/") || activePath,
      warnings,
    };

    // 渲染人类可读的简报（Cline 应主动复述 next_action 和 do_not）
    const lines = [
      `## 📋 handoff 已恢复`,
      ``,
      `- **branch**: \`${fm.branch}\``,
      `- **status**: \`${resumePack.status}\`${staleDaysCount !== null ? `（${staleDaysCount} 天前更新）` : ""}`,
      `- **goal**: ${fm.goal}`,
      `- **completed**: ${resumePack.completed_count} 项`,
      ``,
      `### ▶️ next_action（${resumePack.next_action.length} 项）`,
      ...(resumePack.next_action.length
        ? resumePack.next_action.map((x) => `- ${x}`)
        : ["- _（无）_"]),
      ``,
      `### 🚫 do_not（${resumePack.do_not.length} 项）`,
      ...(resumePack.do_not.length
        ? resumePack.do_not.map((x) => `- ${x}`)
        : ["- _（无）_"]),
    ];

    if (resumePack.in_progress.length) {
      lines.push(
        ``,
        `### 🔄 in_progress`,
        ...resumePack.in_progress.map((x) => `- ${x}`)
      );
    }

    if (resumePack.artifacts.length) {
      lines.push(
        ``,
        `### 📎 artifacts（建议直接 read_file）`,
        ...resumePack.artifacts.map((x) => `- \`${x}\``)
      );
    }

    if (resumePack.blocked_by) {
      lines.push(
        ``,
        `### ⛔ blocked_by`,
        ...resumePack.blocked_by.map((x) => `- ${x}`)
      );
    }

    if (warnings.length) {
      lines.push(
        ``,
        `### ⚠️ 警告`,
        ...warnings.map((w) => `- ${w}`)
      );
    }

    lines.push(
      ``,
      `---`,
      `**Cline 提示**：请在响应中主动复述上方的 next_action 和 do_not，与用户确认后再开始工作。`,
      ``,
      `<!-- 结构化数据（供调用方解析）-->`,
      "```json",
      JSON.stringify(resumePack, null, 2),
      "```"
    );

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  } catch (err) {
    return failResult("UNCAUGHT", err.stack || err.message);
  }
}

// ============================================================
// 辅助
// ============================================================

function failResult(code, details, extra = {}) {
  const payload = { ok: false, code, details, ...extra };
  return {
    content: [
      {
        type: "text",
        text:
          `## ⚠️ handoff_resume: ${code}\n\n${details}\n\n` +
          "<!-- 结构化数据 -->\n```json\n" +
          JSON.stringify(payload, null, 2) +
          "\n```",
      },
    ],
    isError: true,
  };
}