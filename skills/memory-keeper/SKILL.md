---
name: memory-keeper
version: 0.1.0
description: 跨会话长期记忆管理 — 通过 SQLite+FTS5 在项目本地持久化关键事实、决策和经验，让新会话能检索历史而非从零开始
category: utility
preferred_mode: any
tools: [memory_commit, memory_recall, memory_list]
permissions: [requires_user_approval_for_write]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---

# Memory Keeper · 跨会话项目记忆

## 前置条件

- skills-mcp-server 已启动且 `memory_commit / memory_recall / memory_list` 工具可见
- 当前工作目录就是想要建立记忆的项目根目录（记忆库以项目路径哈希隔离）
- 项目可写入 `.cline-memory/memory.db`（已加入 `.gitignore`）

## 输入

`memory_commit`（写入）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| kind | enum | 是 | `episodic`(事件)/`semantic`(事实)/`procedural`(操作步骤) |
| content | string | 是 | 记忆正文，建议 ≤ 500 字符 |
| tags | string[] | 否 | 标签数组，如 `["bugfix","auth"]` |
| source | string | 否 | 证据来源标签 `[实测]/[源码]/[文档]/[社区]/[推测]` |
| confidence | number | 否 | 0-1 置信度，默认 0.8 |
| pinned | boolean | 否 | 是否钉选到列表顶部 |

`memory_recall`（检索）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 否 | FTS5 查询；留空则按时间倒序返回最新 |
| kind | enum | 否 | 限定记忆类型 |
| tag | string | 否 | 按 tag 精确过滤 |
| limit | number | 否 | 返回上限，默认 10 |

`memory_list`（管理）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | enum | 否 | `list`/`stats`/`delete`/`pin`/`unpin`，默认 list |
| id | number | 条件必填 | delete/pin/unpin 时必填 |

## 输出

- **正常输出**：Markdown 格式的记忆条目列表（含 ID、kind、tags、时间、内容预览、bm25 分数）
- **错误输出**：参数校验失败、kind 非法、ID 不存在的明确提示

## 使用示例

### 示例 1：会话开始时复盘项目背景

**场景**：用户开启新会话，没说项目细节

**Agent 行为**：
1. 立即调用 `memory_recall`（无 query）拉取项目最近 10 条记忆
2. 阅读后在内部摘要项目状态，再决定是否需要追问

```json
{ "tool": "memory_recall", "args": { "limit": 10 } }
```

### 示例 2：记下重要的实测发现

**场景**：调试中发现 PowerShell 不支持 `&&`

```json
{
  "tool": "memory_commit",
  "args": {
    "kind": "procedural",
    "content": "本机 PowerShell 5.1 不支持 && 链式命令，需改用分号 ; 或 -and",
    "tags": ["powershell","windows","shell"],
    "source": "[实测]",
    "confidence": 1.0,
    "pinned": true
  }
}
```

### 示例 3：检索特定主题的历史决策

```json
{ "tool": "memory_recall", "args": { "query": "auth 认证", "kind": "semantic" } }
```

## 何时写入记忆（写入策略）

只在以下场景写入，避免噪音：

1. **关键决策**：架构选型、技术栈选择，附依据
2. **昂贵的实测发现**：花了时间才搞清的环境/兼容性事实
3. **稳定的事实**：项目核心约定、外部 API 行为、数据 schema
4. **失败教训**：踩过的坑及解决方案
5. **未完成的交接**：会话结束时未关闭的待办（建议同时调用 `compact_context`）

**不要写入**：临时调试输出、可从代码直接读到的事实、用户随口的需求草稿。

## 何时检索（读取策略）

- **新会话第一步**：无 query 拉 10 条最新，建立基线
- **接到模糊任务时**：用关键词检索是否已有相关历史
- **做选型决策前**：检索 `kind=semantic` 看是否已有约定
- **报错时**：先检索是否之前遇过同类问题

## 三种记忆类型

| kind | 含义 | 例子 |
|------|------|------|
| episodic | 事件/事情经过 | "2026-06-17 修复了 X bug，根因是 Y" |
| semantic | 项目事实/约定 | "本项目用 ESM，不要写 require()" |
| procedural | 操作步骤/经验 | "推送前必须 `node tools/validate-skills.js`" |

## 与宪法的对齐

- **证据优于推测**：`source` 字段保留证据来源标签
- **复杂度必须被证明**：每条记忆只解决一个问题，避免长篇大论
- **问题定义优于方案设计**：在 ACH 阶段优先 `memory_recall` 是否已有答案

## 数据存储

- 路径：`<项目根>/.cline-memory/memory.db`（SQLite）
- 引擎：FTS5 全文索引 + bm25 排序
- 隔离：路径哈希命名，多项目互不干扰
- 备份：用户自行 `cp memory.db memory.db.bak` 或纳入私有备份
- 删除：`memory_list action=delete id=N`，或直接删 `.cline-memory/` 目录