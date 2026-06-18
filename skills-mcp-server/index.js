// ============================================================
// skills-mcp-server v2.1.0
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
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HANDLERS_DIR = path.join(__dirname, "handlers");

// ============================================================
// Node 版本预检 (来源：2026-06-18 外部评审 §4.3)
//   node:sqlite 在 v22.5 起进入 stable / 默认启用 FTS5
//   早于该版本运行会得到非常隐晦的 ERR_UNKNOWN_BUILTIN_MODULE
//   这里前置硬失败，避免运行时才暴露
// ============================================================
const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 5;

function checkNodeVersion() {
  const m = /^v(\d+)\.(\d+)\.(\d+)/.exec(process.version);
  if (!m) {
    throw new Error(`无法解析 Node 版本: ${process.version}`);
  }
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  if (major < MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor < MIN_NODE_MINOR)) {
    throw new Error(
      `[skills-mcp-server] Node 版本过低: ${process.version}，` +
      `需要 ≥ v${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.0（node:sqlite stable）`
    );
  }
}

// ============================================================
// 动态加载所有 handler 模块（eager / 启动期一次性扫描）
// 约定：handlers/*.js 必须导出 { toolDefinition, handler }
//
// 失败处理（来源：2026-06-18 外部评审 §4.3）：
//   - 缺导出 / 语法错 / 运行时抛错 → 立即向上抛，进程退出
//   - 不再静默跳过：避免「以为有这个工具，调用时才发现没注册」的隐蔽 bug
//   - 通过环境变量 SKILLS_MCP_LENIENT_LOAD=1 可临时降级为旧行为（开发调试用）
// ============================================================
async function loadHandlers() {
  const modules = {};
  const files = fs.readdirSync(HANDLERS_DIR).filter((f) => f.endsWith(".js"));
  const lenient = process.env.SKILLS_MCP_LENIENT_LOAD === "1";
  const failures = [];

  for (const file of files) {
    const modulePath = path.join(HANDLERS_DIR, file);
    try {
      // Windows: 使用 file:// URL 避免 ESM loader 将 e:\ 解析为协议 scheme
      const mod = await import(pathToFileURL(modulePath).href);
      if (!mod.toolDefinition || !mod.handler) {
        const msg = `${file}: 缺少 toolDefinition 或 handler 导出`;
        failures.push(msg);
        continue;
      }
      const name = mod.toolDefinition.name;
      if (modules[name]) {
        failures.push(`${file}: 工具名 "${name}" 与既有 handler 冲突`);
        continue;
      }
      modules[name] = mod;
    } catch (err) {
      failures.push(`${file}: ${err.message}`);
    }
  }

  if (failures.length > 0) {
    const detail = failures.map((f) => `  - ${f}`).join("\n");
    if (lenient) {
      console.error(`[skills-mcp-server] ⚠️ LENIENT 模式: ${failures.length} 个 handler 加载失败但被忽略\n${detail}`);
    } else {
      throw new Error(
        `[skills-mcp-server] handler 加载失败 (${failures.length} 个):\n${detail}\n` +
        `修复后重启；或临时设 SKILLS_MCP_LENIENT_LOAD=1 跳过`
      );
    }
  }

  if (Object.keys(modules).length === 0) {
    throw new Error("[skills-mcp-server] 没有任何 handler 加载成功，无法启动");
  }

  return modules;
}

// ============================================================
// 初始化服务器
// ============================================================
const server = new Server(
  {
    name: "skills-mcp-server",
    version: "2.1.0",
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
  checkNodeVersion();
  const handlerModules = await loadHandlers();

  // ListTools — 返回所有 handler 的 toolDefinition
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(handlerModules).map((mod) => mod.toolDefinition),
  }));

  // CallTool — 路由到对应 handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const mod = handlerModules[name];

    if (!mod) {
      return {
        content: [
          {
            type: "text",
            text: `## ❌ 未知工具: ${name}\n\n可用工具: ${Object.keys(handlerModules).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    const result = await mod.handler(args || {});

    // handler 可能返回 string content 或完整 result 对象
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
  console.error(`[skills-mcp-server]  ├─ 版本: 2.1.0`);
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