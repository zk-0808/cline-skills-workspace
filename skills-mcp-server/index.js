// ============================================================
// skills-mcp-server v2.0.0
// 拆分架构：index.js 仅做路由分发，每个 handler 独立文件
// ============================================================

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HANDLERS_DIR = path.join(__dirname, "handlers");

// ============================================================
// Skill 调用计数器
// ============================================================
const skillUsage = {};

// ============================================================
// 证据链系统 — 防止模型声称已读取源文件但实际没读
// 每个 handler 对应的源文件路径（superpowers 真实 Skill）
// ============================================================
const SUPERFORCES_DIR = "C:\\Users\\19936\\.claude\\skills\\superpowers\\skills";

const SOURCE_FILES = {
  "writing_plans":               path.join(SUPERFORCES_DIR, "writing-plans", "SKILL.md"),
  "executing_plans":             path.join(SUPERFORCES_DIR, "executing-plans", "SKILL.md"),
  "requesting_code_review":      path.join(SUPERFORCES_DIR, "requesting-code-review", "SKILL.md"),
  "verification_before_completion": path.join(SUPERFORCES_DIR, "verification-before-completion", "SKILL.md"),
  "systematic_debugging":        path.join(SUPERFORCES_DIR, "systematic-debugging", "SKILL.md"),
  "test_driven_development":     path.join(SUPERFORCES_DIR, "test-driven-development", "SKILL.md"),
  "brainstorming":               path.join(SUPERFORCES_DIR, "brainstorming", "SKILL.md"),
  "subagent_driven_development": path.join(SUPERFORCES_DIR, "subagent-driven-development", "SKILL.md"),
  "dispatching_parallel_agents": path.join(SUPERFORCES_DIR, "dispatching-parallel-agents", "SKILL.md"),
  "finishing_development_branch": path.join(SUPERFORCES_DIR, "finishing-a-development-branch", "SKILL.md"),
};

const evidenceLog = {};  // key: handler name → { path, readAt, hash, preview }
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").substring(0, 12);

// ============================================================
// 动态加载所有 handler 模块
// ============================================================
async function loadHandlers() {
  const modules = {};
  const files = fs.readdirSync(HANDLERS_DIR).filter(f => f.endsWith(".js"));

  for (const file of files) {
    const modulePath = path.join(HANDLERS_DIR, file);
    try {
      // Windows: 使用 file:// URL 避免 ESM loader 将 e:\ 解析为协议 scheme
      const mod = await import(pathToFileURL(modulePath).href);
      if (mod.toolDefinition && mod.handler) {
        modules[mod.toolDefinition.name] = mod;
      }
    } catch (err) {
      console.error(`[skills-mcp] 加载 handler 失败: ${file}`, err.message);
    }
  }

  return modules;
}

// ============================================================
// 记录 skill 使用
// ============================================================
function recordUsage(name) {
  if (name === "get_skill_stats" || name === "get_platform_rules") return;
  skillUsage[name] = (skillUsage[name] || 0) + 1;
}

// ============================================================
// 初始化服务器
// ============================================================
const server = new Server(
  {
    name: "skills-mcp-server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================
// 启动并注册工具
// ============================================================
async function start() {
  const handlerModules = await loadHandlers();

  // 向各 handler 注入全局引用
  if (handlerModules["get_skill_stats"]) {
    handlerModules["get_skill_stats"].setSkillUsage(skillUsage);
  }
  if (handlerModules["record_source_read"]) {
    handlerModules["record_source_read"].setEvidenceLog(evidenceLog, SOURCE_FILES, hash);
  }
  if (handlerModules["check_evidence_chain"]) {
    handlerModules["check_evidence_chain"].setEvidenceLog(evidenceLog, SOURCE_FILES);
  }

  // ListTools — 返回所有 handler 的 toolDefinition
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(handlerModules).map(mod => mod.toolDefinition),
  }));

  // ============================================================
  // 证据链验证函数 — 在 handler 执行前强制验证
  // ============================================================
  function checkEvidence(name) {
    const sourcePath = SOURCE_FILES[name];
    if (!sourcePath) return { required: false, reason: "此 Skill 无关联源文件" };
    
    const evidence = evidenceLog[name];
    if (!evidence) {
      return {
        required: true,
        passed: false,
        sourcePath,
        reason: `❌ 未检测到对源文件的读取记录。请先调用 record_source_read 读取:\n${sourcePath}`
      };
    }

    // 检查源文件是否在读取后被修改过
    try {
      const currentContent = fs.readFileSync(sourcePath, "utf8");
      const currentHash = hash(currentContent);
      if (currentHash !== evidence.hash) {
        return {
          required: true,
          passed: false,
          sourcePath,
          reason: `⚠️ 源文件自读取后已被修改 (哈希从 ${evidence.hash} 变更为 ${currentHash})，请重新读取`
        };
      }
    } catch (e) {
      // 文件不存在或无法读取，跳过哈希校验
    }

    return {
      required: true,
      passed: true,
      sourcePath,
      evidence: {
        readAt: evidence.readAt,
        hash: evidence.hash,
        preview: evidence.preview
      }
    };
  }

  // CallTool — 路由到对应 handler，执行证据链检查
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const mod = handlerModules[name];

    if (!mod) {
      return {
        content: [{ type: "text", text: `## ❌ 未知工具: ${name}\n\n可用工具: ${Object.keys(handlerModules).join(", ")}` }],
        isError: true,
      };
    }

    recordUsage(name);

    // 证据链检查（跳过记录类和证据类工具自身）
    const skipEvidence = ["get_skill_stats", "get_platform_rules", "record_source_read", "check_evidence_chain", "inject_platform_rules"];
    if (!skipEvidence.includes(name)) {
      const evidenceCheck = checkEvidence(name);
      if (evidenceCheck.required && !evidenceCheck.passed) {
        return {
          content: [{ type: "text", text: `## ⛔ 执行被拒绝 — 证据链缺失\n\n### 工具: ${name}\n\n${evidenceCheck.reason}\n\n### 如何解决\n\`\`\`\n调用 record_source_read 提供源文件读取证据:\n{ "handler_name": "${name}" }\n\`\`\`` }],
          isError: true,
        };
      }
    }

    const result = await mod.handler(args || {});

    // 如果 handler 有解析器，使用它；否则原样返回
    return typeof result.content === "string" 
      ? { content: [{ type: "text", text: result.content }] }
      : result;
  });

  // 连接 transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // ============================================================
  // 启动报告 — 结构化输出，一眼看清加载结果
  // ============================================================
  const toolNames = Object.keys(handlerModules).sort();
  const toolList = toolNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n");
  console.error(`[skills-mcp-server] ========================================`);
  console.error(`[skills-mcp-server]  ✅ 启动成功`);
  console.error(`[skills-mcp-server]  ├─ 版本: 2.0.0`);
  console.error(`[skills-mcp-server]  ├─ 工具总数: ${toolNames.length}`);
  console.error(`[skills-mcp-server]  └─ 工具列表:`);
  console.error(toolList);
  console.error(`[skills-mcp-server] ========================================`);
  console.error(`[skills-mcp-server] 就绪，等待请求...`);
}

start().catch((err) => {
  console.error("[skills-mcp-server] 启动失败:", err);
  process.exit(1);
});