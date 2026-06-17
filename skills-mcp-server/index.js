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
// 动态加载所有 handler 模块
// 约定：handlers/*.js 必须导出 { toolDefinition, handler }
// ============================================================
async function loadHandlers() {
  const modules = {};
  const files = fs.readdirSync(HANDLERS_DIR).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const modulePath = path.join(HANDLERS_DIR, file);
    try {
      // Windows: 使用 file:// URL 避免 ESM loader 将 e:\ 解析为协议 scheme
      const mod = await import(pathToFileURL(modulePath).href);
      if (mod.toolDefinition && mod.handler) {
        modules[mod.toolDefinition.name] = mod;
      } else {
        console.error(`[skills-mcp] 跳过 ${file}: 缺少 toolDefinition 或 handler 导出`);
      }
    } catch (err) {
      console.error(`[skills-mcp] 加载 handler 失败: ${file}`, err.message);
    }
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