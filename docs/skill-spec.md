# SKILL.md 规范标准 v1.0

> 本文档定义 cline-skills-workspace 中每个 Skill 的 SKILL.md 文件必须遵循的格式标准。
> 遵循此规范是 Skill 被接受入库的前提条件。

---

## 1. YAML Frontmatter（必须）

每个 SKILL.md 必须以 YAML frontmatter 开头。以下 12 个字段全部必填。

```yaml
---
name: brainstorming
version: 1.0.0
description: 创意构思前置 — 探索意图、需求和设计
category: workflow
preferred_mode: plan
tools: [read_file, search_files, ask_followup_question, plan_mode_respond]
permissions: [read_only]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

### 1.1 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 唯一标识符，小写 + 连字符。必须与所在目录名完全一致 |
| `version` | semver | 语义化版本号。Breaking change 升大版本，新功能升中版本，修复升补丁版本 |
| `description` | string | 一句话描述 Skill 功能。必须包含至少一个动词，长度 50-200 字符 |
| `category` | enum | `workflow` / `domain` / `utility` / `meta` |
| `preferred_mode` | enum | 建议 Cline 切换的模式：`plan` / `act` / `any` |
| `tools` | string[] | **建议性契约**：提示 LLM 优先使用的工具列表。最终执行权归 Cline 核心调度器 |
| `permissions` | enum[] | 安全权限声明：`read_only` 或 `requires_user_approval_for_write` |
| `context_priority` | enum | 上下文压缩时优先保留级别：`high` / `medium` / `low` |
| `dependencies` | string[] | 依赖的其他 Skill 的 `name` 值。无依赖则为 `[]` |
| `requires_mcp` | string[] | 依赖的 MCP 服务名。无依赖则为 `[]` |
| `platform` | enum | 适用平台：`any` / `windows` / `macos` / `linux` |
| `min_cline_version` | string | 最低 Cline 版本要求 |

### 1.2 Category 四分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `workflow` | 编排类 — 开发流程步骤 | brainstorming, writing-plans, executing-plans |
| `domain` | 领域类 — 特定领域的专业能力 | pptx, file-search |
| `utility` | 工具类 — 通用辅助能力 | skill-installer, dispatching-parallel-agents |
| `meta` | 元类 — 跨越多个步骤的质量保障 | verification-before-completion, requesting-code-review |

### 1.3 Permissions 枚举

| 值 | 说明 |
|----|------|
| `read_only` | 只读操作：读取文件、搜索、询问用户 |
| `requires_user_approval_for_write` | 写操作需要用户确认：写入文件、执行命令、删除 |

---

## 2. 正文章节（必须）

每个 SKILL.md 必须按顺序包含以下章节：

### 2.1 标题

```markdown
# Skill: [name]
```

### 2.2 前置条件

列出使用此 Skill 前必须满足的条件。例如：

```markdown
## 前置条件

- 用户已描述需求意图
- 未进入实现阶段
```

### 2.3 输入

参数表格。格式：

```markdown
## 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| topic | string | 是 | 需求主题 |
| constraints | string[] | 否 | 额外约束条件 |
```

### 2.4 输出

正常输出和错误输出的格式说明。

```markdown
## 输出

- **正常输出**: 结构化的设计文档 (Markdown)
- **错误输出**: 需求不明的提示，包含具体缺失信息
```

### 2.5 使用示例

至少 1 个，推荐 2-3 个覆盖典型场景。每个示例包含场景描述 + 预期行为。

```markdown
## 使用示例

### 示例 1: 新功能设计

**场景**: 用户提出「开发用户注册功能」

**预期行为**:
1. 探索项目上下文
2. 提问澄清需求
3. 输出设计方案
```

---

## 3. 文件组织

每个 Skill 的目录结构：

```
skills/<skill-name>/
├── SKILL.md           # 技能定义（必须）
├── SKILL.test.md      # 测试用例（必须）
└── examples/          # 使用示例（必须，至少 1 个示例文件）
    └── basic-usage.md
```

---

## 4. 校验规则

`tools/validate-skills.js` 执行以下检查：

1. **Frontmatter 必填字段**: 12 个字段全部存在
2. **name/目录名一致性**: `name` 值必须与所在目录名完全一致
3. **description 质量**: 必须包含至少一个中文动词，长度 50-200 字符
4. **category 合法值**: `workflow` / `domain` / `utility` / `meta` 之一
5. **permissions 合法值**: 每个元素为 `read_only` 或 `requires_user_approval_for_write`
6. **context_priority 合法值**: `high` / `medium` / `low` 之一
7. **version semver 格式**: 符合 `x.y.z` 格式
8. **交叉引用检查**: `dependencies` 中引用的 Skill 名必须在 `skills/` 中存在；`requires_mcp` 中引用的 MCP 服务必须在已知列表中
9. **正文章节完整性**: 包含「前置条件」「输入」「输出」「使用示例」四个章节

---

## 5. 测试规范：SKILL.test.md

采用 **LLM-as-a-Judge** 语义断言机制。

### 5.1 测试用例格式

```markdown
# 测试: brainstorming

## TC-01: 正常输入
**输入**: topic = "用户注册功能"
**语义断言**:
  - must_contain_concept: ["探索上下文", "澄清问题", "设计方案"]
  - llm_judge_prompt: "输出是否包含一个结构化的设计文档？"
  - max_tokens: 500
```

### 5.2 断言类型

| 断言 | 说明 |
|------|------|
| `must_contain_concept` | 输出中必须包含的关键概念列表 |
| `must_not_contain` | 输出中禁止出现的内容 |
| `llm_judge_prompt` | 由另一个 LLM 实例判断 true/false 的语义问题 |
| `max_tokens` | 输出长度上限 |

### 5.3 要求

- 每个 SKILL.test.md 至少包含 2 条测试用例
- 必须覆盖：正常输入 + 异常输入（空值/错误格式）
- 推荐覆盖：边界值（极大/极小输入）