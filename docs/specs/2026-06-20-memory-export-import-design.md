# memory_export / memory_import 设计文档

> 状态：草案（design-only，不实现）
> 日期：2026-06-20
> 分支：feat/handoff-protocol · P0-A
> 目标：定义导出格式 / project_id 策略 / 迁移策略 / 兼容策略

---

## 1. 背景与问题定义

### 1.1 当前状态

memory 存储路径由 `getProjectHash(projectRoot)` 决定 —— SHA256(绝对路径.toLowercase())[:12]。

**后果**：同一 git 仓库在不同机器上产生不同 project_hash，memory 无法跨设备迁移。

**现存基础设施**：
- `getProjectHashByGitUrl()` 已实现（基于归一化 git remote URL），但未接入存储路径
- `git.js` 的 `getRemoteUrl()` + `normalizeRemoteUrl()` 提供跨设备稳定的仓库身份

### 1.2 目标

提供 `memory_export` / `memory_import` 两个 MCP 工具，实现项目记忆的：
- **跨设备迁移**（笔记本 → 台式机）
- **备份恢复**（误删 / 重装系统）
- **团队共享**（可选未来方向，本设计预留但暂不实现权限控制）

### 1.3 非目标

- 不替代当前 `getProjectHash`（已有 26+ 条记忆依赖路径哈希落盘）
- 不实现自动同步 / 云端存储
- 不新增 P0 功能（仅设计）

---

## 2. 导出格式设计

### 2.1 容器格式：JSON Lines（`.jsonl`）

选型理由（相比 JSON 数组 / SQL dump）：
- **流式处理**：逐行读写，内存友好（万条级别也安全）
- **人类可读**：每行独立 JSON 对象，`grep` / `jq` 可直接操作
- **容错**：单行损坏不影响其他行（JSON 数组损坏一处则整体不可解析）
- **追加友好**：增量导出只需追加新行

### 2.2 文件结构

```
# 第一行：文件头（元信息）
{"type":"header","version":1,"exported_at":1718848000,"source_hash":"a1b2c3d4e5f6","source_project_root":"/home/user/projects/my-app","source_remote_url":"https://github.com/user/my-app","count":42}

# 后续行：记忆条目（一行一条）
{"type":"memory","id":1,"kind":"semantic","content":"项目使用 React 18 + TypeScript 5","tags":"react,typescript","source":"user","confidence":1.0,"created_at":1718800000,"pinned":1}
{"type":"memory","id":2,"kind":"episodic","content":"2026-06-18：修复 handoff 协议中 W006 警告","tags":"handoff,bugfix","source":"agent","confidence":0.8,"created_at":1718810000,"pinned":0}
```

### 2.3 Header 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定 `"header"` |
| `version` | integer | ✅ | 格式版本，初始为 `1` |
| `exported_at` | integer | ✅ | Unix 时间戳（秒），导出时间 |
| `source_hash` | string | ✅ | 导出时的 project_hash（基于绝对路径） |
| `source_project_root` | string | ❌ | 导出时的项目根路径（用于迁移映射提示） |
| `source_remote_url` | string | ❌ | 导出时的 git remote URL（跨设备稳定身份，归一化后） |
| `count` | integer | ✅ | 导出的记忆条目数（不含 header） |

### 2.4 Memory 条目字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定 `"memory"` |
| `id` | integer | ✅ | 原始数据库 id（import 时会被重新分配） |
| `kind` | string | ✅ | `episodic` / `semantic` / `procedural` |
| `content` | string | ✅ | 记忆正文 |
| `tags` | string | ✅ | 逗号分隔的标签（可为空字符串） |
| `source` | string | ❌ | 来源标记，默认 `"agent"` |
| `confidence` | number | ✅ | 可信度 0-1 |
| `created_at` | integer | ✅ | 原始创建时间（Unix 秒） |
| `pinned` | integer | ✅ | 钉选状态：0 或 1 |

### 2.5 文件扩展名与 MIME

- 扩展名：`.memories.jsonl`
- MIME type：`application/x-ndjson`（非正式但业界惯例）
- 字符编码：UTF-8（无 BOM）

---

## 3. project_id 选择策略

### 3.1 当前隔离键

`getProjectHash()` → SHA256(绝对路径.toLowercase())[:12]，例：
- 笔记本：`C:\Users\alice\projects\my-app` → `a1b2c3d4e5f6`
- 台式机：`D:\work\my-app` → `f6e5d4c3b2a1`

**相同仓库、不同机器 → 不同哈希。**

### 3.2 导入时的身份解析（三步法）

导入时目标机器的 project_id 解析优先级：

```
1. 环境变量 CLINE_PROJECT_ROOT → getProjectHash()
2. git remote URL 匹配 → getProjectHashByGitUrl()
3. 用户显式指定 → --target-project <path>
```

**步骤 1 优先**：用户在同一台机器上导入备份时，路径哈希不变量保证直接命中。

**步骤 2 兜底**：跨设备迁移时，用 git remote URL 匹配。若 header 中的 `source_remote_url` 与目标机器的 `getRemoteUrl()` 归一化后一致，使用 `getProjectHashByGitUrl()` 作为目标哈希。

**步骤 3 为选项**：无 git remote 或 URL 变化时，用户手动指定目标项目路径。

### 3.3 冲突处理

若目标哈希已存在 `memory.db`：
- **默认**：合并模式（跳过重复 ID，只插入新记录）
- **可选**：替换模式（先清空目标再导入，需用户显式确认）

### 3.4 不替代现有哈希

按 do_not 约束，`getProjectHash` 保持不变。导入后的记忆写入 `getProjectHashByGitUrl()` 对应的目录，不与现有路径哈希目录冲突。两条路径独立共存：
- `~/.cline-skills/memory/{path-hash}/` — 本机原有记忆
- `~/.cline-skills/memory/{git-url-hash}/` — 跨设备导入的记忆

未来（P2+）可提供合并工具，将 path-hash 目录迁移到 git-url-hash 目录。

---

## 4. 迁移策略

### 4.1 路径迁移映射

导出文件 header 记录 `source_hash`（路径哈希）和 `source_remote_url`（git URL）。导入时自动检测：

| 场景 | source_remote_url | 目标 remote_url | 行为 |
|------|-------------------|-----------------|------|
| 同机恢复 | — | — | `getProjectHash()` 不变，直接写入 |
| 同仓库跨设备 | `https://github.com/user/repo` | `https://github.com/user/repo` | 匹配成功，用 `getProjectHashByGitUrl()` |
| 无 remote | null | null | 路径必然不同，提示用户 --target-project |
| remote 变化 | `https://github.com/old/repo` | `https://github.com/new/repo` | 不匹配，提示用户确认 |

### 4.2 ID 重分配

导入时不保留原始 `id`（SQLite AUTOINCREMENT 可能冲突）。`original_id` 记录在导出中，导入后返回映射表：

```json
{
  "imported": 42,
  "skipped": 3,
  "id_mapping": {
    "1": 105,
    "2": 106
  }
}
```

### 4.3 时间戳保留

`created_at` 保留原始值，不更新为导入时间。这保持记忆的时间语义正确。

---

## 5. 兼容策略

### 5.1 版本号语义

| version | 变更 | 兼容性 |
|---------|------|--------|
| 1 | 初始格式 | 基准 |
| 2（未来） | 新增可选字段（如 `expires_at`） | 向后兼容：v1 导入器忽略未知字段 |
| N（未来） | 不兼容变更（如字段重命名） | 导入时检测 `version > supported` → 拒绝 + 提示升级 |

### 5.2 向后兼容规则

- **新字段**：导入器忽略未知字段，不报错
- **缺失可选字段**：使用默认值（`source=""`, `confidence=0.8`）
- **缺失必填字段**：拒绝该条，记录在 `skipped` 中
- **未知 kind**：拒绝导入，不允许随意扩展枚举

### 5.3 前向兼容规则

- 导出的 v1 文件可被未来的 v2+ 导入器读取
- v2 新增的可选字段在 v1 文件中不存在 → v2 导入器使用默认值

### 5.4 格式验证

导入前校验：
1. 第一行必须为 `type: "header"`，包含必填字段
2. `version` 必须 ≤ 当前支持的最高版本
3. 后续行 `type: "memory"`，`kind` / `content` / `confidence` / `created_at` / `pinned` 必填
4. `kind` 必须在允许列表中
5. `confidence` 在 0-1 范围内
6. `content` 长度 ≥ 5

校验失败 → 整行跳过，累计到 `skipped` 计数，不中断导入流程。

---

## 6. 工具接口草案

### 6.1 memory_export

```yaml
name: memory_export
description: 导出当前项目的所有记忆为 JSON Lines 文件。返回文件内容文本，供 Agent 或用户保存。
input:
  format: "jsonl"          # 预留，当前仅 jsonl（默认）
  kind: "semantic"         # 可选过滤（同 memory_recall）
  output_path: null        # 可选：写入指定文件路径；不传则返回文本内容
```

### 6.2 memory_import

```yaml
name: memory_import
description: 从 JSON Lines 文件导入记忆到当前项目。支持合并 / 替换模式。
input:
  content: "..."           # JSONL 文本内容（必填）
  mode: "merge"            # "merge"（默认）| "replace"
  target_project: null     # 可选：手动指定目标项目路径
  dry_run: false           # 可选：仅验证，不写入
```

### 6.3 安全约束

- `replace` 模式需额外确认参数 `confirm_replace: true`
- 单次导入上限：10000 条（超出拒绝，防止 OOM）
- `dry_run` 模式返回校验结果（有效条数 / 跳过条数 / 错误详情）

---

## 7. 示例工作流

### 7.1 跨设备迁移

```
# 机器 A（笔记本）
1. memory_export → 得到 memories.jsonl
2. 保存文件（如通过 git 提交或 U 盘）

# 机器 B（台式机）
3. checkout 相同仓库
4. memory_import content=<文件内容>
5. 自动匹配 git remote URL → 写入 git-url-hash 目录
6. memory_recall 验证记忆可检索
```

### 7.2 备份恢复

```
# 备份
1. memory_export output_path="/backup/2026-06-20.memories.jsonl"
2. git add /backup/2026-06-20.memories.jsonl && git commit

# 恢复（同机）
3. memory_import content=<文件内容> mode=merge
```

---

## 8. 边界情况

| 场景 | 处理 |
|------|------|
| 空记忆库导出 | header 中 `count=0`，无 memory 行 |
| 导入时目标目录不存在 | 自动创建（`fs.mkdirSync` recursive） |
| tags 含逗号的标签 | 用双引号包裹（CSV 风格），或考虑改用 JSON 数组 |
| 超大 content（>10KB） | 导入时记录警告但正常写入 |
| 并发导入 | 依赖 SQLite WAL + busy_timeout（已有 PRAGMA 配置） |
| 非 git 仓库 | `source_remote_url=null`，导入时只用路径哈希 |

---

## 9. 未解决的问题（待后续讨论）

1. **tags 字段格式**：当前逗号分隔，含逗号的标签如何转义？方案 A：改为 JSON 数组（破坏兼容）；方案 B：用双引号包裹含逗号标签（CSV 风格）。倾向方案 B，但需验证 FTS5 搜索不受影响。

2. **导入后双目录共存**：path-hash 和 git-url-hash 两个目录各有 memory.db，`memory_recall` 默认只查当前路径哈希的库。是否需要同时查两个目录？倾向暂不合并，等 P2+ 迁移工具。

3. **memory_export 输出方式**：返回文本内容 vs 写文件。倾向两者都支持——`output_path` 为空时返回文本；非空时写文件并返回路径。

4. **团队共享的权限模型**：预留 `source_user` 字段？暂不引入，等实际需求。

---

## 10. 关联文档

- `skills-mcp-server/lib/db.js` — 当前存储实现
- `skills-mcp-server/lib/git.js` — `getProjectHashByGitUrl()` / `normalizeRemoteUrl()`
- `skills-mcp-server/handlers/memory-commit.js` — 写入接口
- `skills-mcp-server/handlers/memory-recall.js` — 检索接口
- `docs/reviews/2026-06-18-external-review.md` §2.4 — 外部评审建议（git URL hash）