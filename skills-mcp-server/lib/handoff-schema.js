// ============================================================
// lib/handoff-schema.js — Handoff Schema 解析、序列化、校验
// 严格遵循 docs/handoff-schema.md v1.0
// ============================================================

import YAML from "yaml";
import { slugify } from "./handoff-fs.js";
import { getProjectHash } from "./db.js";
import { getProjectRoot } from "./git.js";

// ============================================================
// 常量（schema §2.2 / §3 / §4）
// ============================================================

export const SCHEMA_VERSION = "1.0";
export const STATUSES = ["active", "blocked", "done", "stale"];
export const STALE_DAYS_DEFAULT = 14;

export const REQUIRED_FRONTMATTER = [
  "schema_version",
  "status",
  "branch",
  "goal",
  "created_at",
  "updated_at",
  "project_hash",
];

// 章节顺序固定（schema §2.3）
export const SECTION_ORDER = [
  "completed",
  "in_progress",
  "next_action",
  "do_not",
  "artifacts",
  "blocked_by",
];

// 必填章节（blocked_by 仅 status=blocked 时必填）
export const REQUIRED_SECTIONS = SECTION_ORDER.filter((s) => s !== "blocked_by");

// ISO8601 含时区正则（必须有 +HH:MM / -HH:MM / Z 后缀）
const ISO_WITH_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// 禁用 body 元素（schema §2.4）
const FORBIDDEN_BODY_PATTERNS = [
  /<[a-z][\s\S]*?>/i,                // HTML 标签
  /!\[[^\]]*\]\([^)]+\)/,            // 图片
  /^\s*\|.*\|.*\|/m,                 // 表格
  /^```/m,                           // 代码块
];

// ============================================================
// 时间格式化（带本地时区偏移）
// ============================================================

/**
 * 输出本地时区 ISO8601（含偏移），例：2026-06-18T15:30:00+08:00
 * 与 schema §2.2 要求一致。
 *
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function formatLocalTimezoneISO(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const tz = -date.getTimezoneOffset(); // 分钟，东区为正
  const sign = tz >= 0 ? "+" : "-";
  const tzH = pad(Math.floor(Math.abs(tz) / 60));
  const tzM = pad(Math.abs(tz) % 60);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${tzH}:${tzM}`
  );
}

/**
 * 计算 stale 状态。
 *
 * @param {string} updatedAt - ISO8601 字符串
 * @param {number} [thresholdDays=14]
 * @returns {boolean}
 */
export function isStale(updatedAt, thresholdDays = STALE_DAYS_DEFAULT) {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return false;
  const diffDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return diffDays >= thresholdDays;
}

/**
 * 返回距 updated_at 多少天（向下取整）。
 */
export function daysSinceUpdate(updatedAt) {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

// ============================================================
// 解析（parseHandoff）
// ============================================================

/**
 * 解析 handoff 文件内容。
 * 返回结构化 { frontmatter, sections, raw }，不抛错（除非完全无 frontmatter）。
 * 错误由 validate() 检测。
 *
 * @param {string} content - 完整 markdown 文件内容
 * @returns {{ frontmatter: object|null, sections: object, raw: string, frontmatterError: string|null }}
 *
 * sections 结构：{ completed: ["item1", "item2"], in_progress: [...], ... }
 * frontmatter 解析失败 → frontmatter=null，frontmatterError 含原因
 */
export function parseHandoff(content) {
  const result = {
    frontmatter: null,
    sections: {},
    raw: content,
    frontmatterError: null,
    sectionOrder: [],   // 解析时的实际顺序（用于检测 W003）
  };

  // 1. 切分 frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
    result.frontmatterError = "缺少 YAML frontmatter（应以 --- 开始和结束）";
    return result;
  }

  const [, fmYaml, body] = fmMatch;

  // 2. 解析 YAML
  try {
    // 关键：让 yaml 把日期保留为字符串（避免转 Date 对象丢精度）
    result.frontmatter = YAML.parse(fmYaml, {
      // schema='core' 会把无引号 ISO 串解析为 Date；我们用 schema='failsafe' 保字符串
      // 但 failsafe 也会拒绝 number/bool；折中：解析后手动把 Date → string
    });
    if (result.frontmatter && typeof result.frontmatter === "object") {
      for (const k of Object.keys(result.frontmatter)) {
        if (result.frontmatter[k] instanceof Date) {
          // 还原为 ISO 字符串
          result.frontmatter[k] = result.frontmatter[k].toISOString();
        }
      }
    }
  } catch (err) {
    result.frontmatterError = `YAML 解析失败: ${err.message}`;
    return result;
  }

  // 3. 解析 body 章节（## name → bullets）
  const sectionRegex = /^##\s+(\w+)\s*$/gm;
  const matches = [...body.matchAll(sectionRegex)];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    const sectionBody = body.slice(start, end);

    result.sectionOrder.push(name);
    result.sections[name] = parseBullets(sectionBody);
  }

  return result;
}

/**
 * 从章节正文提取 bullet 列表。忽略空行和注释；保留行内 backtick / link 内容。
 *
 * @param {string} text
 * @returns {string[]}
 */
function parseBullets(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const m = line.match(/^\s*-\s+(.+)$/);
    if (m) items.push(m[1].trim());
  }
  return items;
}

// ============================================================
// 序列化（serializeHandoff）
// ============================================================

/**
 * 把结构化数据渲染为完整 handoff markdown 字符串。
 * 严格按 schema §2 章节顺序输出。
 *
 * @param {object} input
 * @param {object} input.frontmatter - 全部必填字段
 * @param {object} input.sections - { completed, in_progress, next_action, do_not, artifacts, blocked_by? }
 * @returns {string}
 */
export function serializeHandoff({ frontmatter, sections }) {
  if (!frontmatter || typeof frontmatter !== "object") {
    throw new Error("serializeHandoff: frontmatter 必填");
  }

  // 强制按 REQUIRED_FRONTMATTER 顺序输出（schema_version 在最前）
  const orderedFm = {};
  for (const k of REQUIRED_FRONTMATTER) {
    if (frontmatter[k] !== undefined) {
      orderedFm[k] = frontmatter[k];
    }
  }
  // 加上其他用户自定义字段
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!(k in orderedFm)) orderedFm[k] = v;
  }

  const fmYaml = YAML.stringify(orderedFm).trimEnd();
  let out = `---\n${fmYaml}\n---\n\n`;

  // 章节按固定顺序输出
  for (const name of SECTION_ORDER) {
    // blocked_by 仅在有内容或 status=blocked 时输出
    if (name === "blocked_by") {
      const items = sections?.[name] || [];
      if (frontmatter.status !== "blocked" && items.length === 0) continue;
    }
    const items = sections?.[name] || [];
    out += `## ${name}\n`;
    if (items.length === 0) {
      out += `\n`;
    } else {
      for (const item of items) {
        out += `- ${item}\n`;
      }
      out += `\n`;
    }
  }

  return out.trimEnd() + "\n";
}

// ============================================================
// 校验（validate） — schema §4
// ============================================================

/**
 * 校验 handoff 数据。
 *
 * @param {object} parsed - parseHandoff 返回值
 * @param {object} [opts]
 * @param {string} [opts.expectedBranch] - 文件名 slug 对应的 branch（用于 E011）
 * @param {string} [opts.expectedProjectHash] - 当前项目 hash（用于 E012）
 * @param {number} [opts.staleDays=14]
 * @param {boolean} [opts.checkStale=true]
 * @param {boolean} [opts.checkOrder=true]
 * @returns {{ errors: string[], warnings: string[] }}
 *
 * errors / warnings 形如 ["E001: ...", "W001: ..."]
 */
export function validate(parsed, opts = {}) {
  const errors = [];
  const warnings = [];

  const {
    expectedBranch,
    expectedProjectHash,
    staleDays = STALE_DAYS_DEFAULT,
    checkStale = true,
    checkOrder = true,
  } = opts;

  // E001: frontmatter 解析失败
  if (parsed.frontmatterError) {
    errors.push(`E001: ${parsed.frontmatterError}`);
    return { errors, warnings }; // 后续无法校验，直接返回
  }

  const fm = parsed.frontmatter || {};

  // E002: 必填字段缺失
  const missing = REQUIRED_FRONTMATTER.filter((k) => fm[k] === undefined || fm[k] === null || fm[k] === "");
  if (missing.length) {
    errors.push(`E002: 缺少必填 frontmatter 字段: ${missing.join(", ")}`);
  }

  // E003: status 非法
  if (fm.status !== undefined && !STATUSES.includes(fm.status)) {
    errors.push(`E003: status="${fm.status}" 不在枚举 ${STATUSES.join("/")} 内`);
  }

  // E004: schema_version 不匹配
  if (fm.schema_version !== undefined && String(fm.schema_version) !== SCHEMA_VERSION) {
    errors.push(`E004: schema_version="${fm.schema_version}" 不匹配当前 "${SCHEMA_VERSION}"`);
  }

  // E005: 时间字段格式
  for (const k of ["created_at", "updated_at"]) {
    if (fm[k] !== undefined && !ISO_WITH_TZ.test(String(fm[k]))) {
      errors.push(`E005: ${k}="${fm[k]}" 不是合法 ISO8601 含时区格式`);
    }
  }

  // E006: created_at > updated_at
  if (fm.created_at && fm.updated_at) {
    const c = Date.parse(fm.created_at);
    const u = Date.parse(fm.updated_at);
    if (!Number.isNaN(c) && !Number.isNaN(u) && c > u) {
      errors.push(`E006: created_at (${fm.created_at}) 晚于 updated_at (${fm.updated_at})`);
    }
  }

  // E008: 必填 body 章节缺失
  const presentSections = parsed.sectionOrder || Object.keys(parsed.sections || {});
  const missingSecs = REQUIRED_SECTIONS.filter((s) => !presentSections.includes(s));
  if (missingSecs.length) {
    errors.push(`E008: 缺少必填 body 章节: ${missingSecs.join(", ")}`);
  }

  // E009: next_action 为空
  if (presentSections.includes("next_action")) {
    const items = parsed.sections.next_action || [];
    if (items.length === 0) {
      errors.push(`E009: next_action 章节为空，至少 1 项`);
    }
  }

  // E007: status=blocked 但 blocked_by 为空
  if (fm.status === "blocked") {
    const items = parsed.sections.blocked_by || [];
    if (items.length === 0) {
      errors.push(`E007: status=blocked 但 blocked_by 为空`);
    }
  }

  // E011: 文件名 slug 与 branch 字段不一致（需要外部传 expectedBranch）
  if (expectedBranch && fm.branch) {
    if (slugify(String(fm.branch)) !== expectedBranch) {
      errors.push(`E011: 文件名 slug="${expectedBranch}" 与 branch="${fm.branch}" (slug=${slugify(String(fm.branch))}) 不一致`);
    }
  }

  // E012: project_hash 不匹配
  if (expectedProjectHash && fm.project_hash) {
    if (String(fm.project_hash) !== expectedProjectHash) {
      errors.push(`E012: project_hash="${fm.project_hash}" 与当前项目 "${expectedProjectHash}" 不一致`);
    }
  }

  // === 警告 ===

  // W001: active 但 stale
  if (checkStale && fm.status === "active" && fm.updated_at && isStale(fm.updated_at, staleDays)) {
    const days = daysSinceUpdate(fm.updated_at);
    warnings.push(`W001: status=active 但 ${days} 天未更新（≥ ${staleDays} 天阈值），应标记 stale`);
  }

  // W002: stale 但仍占 active 槽位（文件名是 _active）
  // 调用方在 expectedBranch 给出时即代表文件在 active 槽
  if (expectedBranch && fm.status === "stale") {
    warnings.push(`W002: status=stale 但仍占 active 槽位，应在 resume 时处理或归档`);
  }

  // W003: 章节顺序错误
  if (checkOrder && presentSections.length > 0) {
    const expectedOrder = SECTION_ORDER.filter((s) => presentSections.includes(s));
    const actual = presentSections.filter((s) => SECTION_ORDER.includes(s));
    if (JSON.stringify(actual) !== JSON.stringify(expectedOrder)) {
      warnings.push(`W003: body 章节顺序不符规范（期望 ${expectedOrder.join("→")}，实际 ${actual.join("→")}）`);
    }
  }

  // W004: goal 超长
  if (fm.goal && String(fm.goal).length > 120) {
    warnings.push(`W004: goal 长度 ${String(fm.goal).length} 超过 120 字符`);
  }

  // W005: artifacts 含项目外绝对路径
  const artifacts = parsed.sections.artifacts || [];
  for (const a of artifacts) {
    // 简单启发：以 / 或 X:\ 开头，且不在项目根内
    if (/^([a-zA-Z]:\\|\/)/.test(a)) {
      warnings.push(`W005: artifacts 含绝对路径 "${a}"，建议用项目相对路径`);
      break;
    }
  }

  // W006: body 含禁用元素
  for (const sec of Object.values(parsed.sections || {})) {
    for (const item of sec) {
      for (const pat of FORBIDDEN_BODY_PATTERNS) {
        if (pat.test(item)) {
          warnings.push(`W006: body 含禁用元素（HTML/图片/代码块/表格）`);
          break;
        }
      }
    }
  }

  // W007: do_not 列表为空
  const doNot = parsed.sections.do_not || [];
  if (doNot.length === 0) {
    warnings.push(`W007: do_not 列表为空，建议至少记录 1 条以发挥差异化价值`);
  }

  return { errors: dedupe(errors), warnings: dedupe(warnings) };
}

function dedupe(arr) {
  return [...new Set(arr)];
}

// ============================================================
// 构造默认 frontmatter（用于 handoff_write 首次创建）
// ============================================================

/**
 * 创建一份新 frontmatter 模板，填充必填字段。
 *
 * @param {object} input
 * @param {string} input.branch
 * @param {string} input.goal
 * @param {string} [input.status="active"]
 * @param {string} [input.cwd] - 项目工作目录
 * @returns {object}
 */
export function buildFrontmatter({ branch, goal, status = "active", cwd }) {
  const now = formatLocalTimezoneISO(new Date());
  const projectRoot = getProjectRoot(cwd);
  return {
    schema_version: SCHEMA_VERSION,
    status,
    branch,
    goal,
    created_at: now,
    updated_at: now,
    project_hash: getProjectHash(projectRoot),
  };
}

/**
 * 合并旧 frontmatter 与新输入：
 * - created_at 保留
 * - updated_at 用 now
 * - 其他字段：新输入覆盖旧值（仅当新输入非 undefined）
 *
 * @param {object} oldFm
 * @param {object} newInput
 * @returns {object}
 */
export function mergeFrontmatter(oldFm, newInput) {
  const merged = { ...oldFm };
  for (const [k, v] of Object.entries(newInput)) {
    if (v !== undefined && k !== "created_at" && k !== "updated_at") {
      merged[k] = v;
    }
  }
  merged.updated_at = formatLocalTimezoneISO(new Date());
  // 强制 schema_version 锁到当前
  merged.schema_version = SCHEMA_VERSION;
  return merged;
}