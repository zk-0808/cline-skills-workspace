# Phase 1: Skill Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库从「求职 Demo」重整为「纯开源产品质量标杆」，15 个 Skill 全部通过 validate-skills.js 校验。

**Architecture:** 仓库重整 → 规范文档 → 校验工具 → 批量规范化 15 个 Skill → 测试用例 → 贡献指南 → README。前三步建立基础设施，后三步批量应用。

**Tech Stack:** Node.js (validate-skills.js), Markdown/YAML frontmatter, Git

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `archive/showcase/` | Create | 迁移求职材料到此 |
| `skills/` | Create | 新建统一技能目录 |
| `docs/skill-spec.md` | Create | SKILL.md 规范标准文档 |
| `docs/examples/` | Create | 从 demo/ 迁移保留 |
| `tools/validate-skills.js` | Create | 技能格式校验脚本 |
| `skills/brainstorming/SKILL.md` | Modify (migrate) | 规范化改造（代表） |
| `skills/brainstorming/SKILL.test.md` | Create | 测试用例（代表） |
| `skills/brainstorming/examples/` | Create | 使用示例目录 |
| `skills/*/SKILL.md` (×14) | Modify (migrate) | 其余 14 个 Skill 规范化 |
| `skills/*/SKILL.test.md` (×14) | Create | 其余 14 个 Skill 测试用例 |
| `CONTRIBUTING.md` | Create | 贡献指南 |
| `README.md` | Modify | 重写为新定位 |

---

### Task 1: 仓库目录重整

**Files:**
- Create: `archive/showcase/` (移动)
- Create: `skills/` (新目录)
- Create: `docs/examples/` (新目录)
- Modify: 删除/移动多个文件

- [ ] **Step 1: 创建新目录结构**

```bash
mkdir -p archive
mkdir -p skills
mkdir -p docs/examples
mkdir -p tools
```

- [ ] **Step 2: 归档求职材料**

```bash
mv agentic-development-workflow/showcase archive/showcase
```

- [ ] **Step 3: 迁移演示案例到 docs/examples**

```bash
mv agentic-development-workflow/demo docs/examples
```

- [ ] **Step 4: 迁移 Skill 文件到 skills/ 目录**

```bash
cp -r .claude/skills/* skills/
```

- [ ] **Step 5: 删除旧的 .claude/skills/ 目录（确认迁移成功后）**

```bash
rm -rf .claude/skills
```

- [ ] **Step 6: 更新 .gitignore，排除旧的 showcase/demo 路径，新增 skills/ 不忽略**

```gitignore
# 新增/修改以下行
skills/          # 不忽略，技能目录需要被跟踪
archive/showcase/  # 归档内容
```

- [ ] **Step 7: 验证目录结构**

```bash
ls -la skills/          # 应有 15 个子目录
ls -la archive/         # 应有 showcase/
ls -la docs/examples/   # 应有 demo/ 下的内容
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: reorganize repo structure for v1.0

- archive/showcase/: 归档求职材料
- skills/: 新建统一技能目录，从 .claude/skills/ 迁移
- docs/examples/: 从 demo/ 迁移演示案例
- 删除 .claude/skills/"
```

---

### Task 2: 编写 SKILL.md 规范文档

**Files:**
- Create: `docs/skill-spec.md`

- [ ] **Step 1: 创建规范文档**

```bash
touch docs/skill-spec.md
```

- [ ] **Step 2: 写入完整规范内容**

```markdown
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
```

- [ ] **Step 3: Verify 文件可读**

```bash
wc -l docs/skill-spec.md   # 应 > 50 行
head -3 docs/skill-spec.md  # 确认标题正确
```

- [ ] **Step 4: Commit**

```bash
git add docs/skill-spec.md
git commit -m "docs: add SKILL.md specification standard v1.0"
```

---

### Task 3: 编写 validate-skills.js 校验脚本

**Files:**
- Create: `tools/validate-skills.js`

- [ ] **Step 1: 创建脚本骨架并处理命令行参数**

```javascript
#!/usr/bin/env node
// tools/validate-skills.js
// 校验 skills/ 下所有 SKILL.md 是否符合规范标准

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const SPEC_FILE = path.join(__dirname, '..', 'docs', 'skill-spec.md');

const VALID_CATEGORIES = ['workflow', 'domain', 'utility', 'meta'];
const VALID_PERMISSIONS = ['read_only', 'requires_user_approval_for_write'];
const VALID_PRIORITIES = ['high', 'medium', 'low'];
const VALID_MODES = ['plan', 'act', 'any'];
const VALID_PLATFORMS = ['any', 'windows', 'macos', 'linux'];
const KNOWN_MCP_SERVERS = ['github-mcp', 'filesystem-mcp', 'playwright', 'duckduckgo'];

let errors = [];
let warnings = [];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  const lines = match[1].split('\n');
  const result = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    let value = line.substring(colonIdx + 1).trim();
    
    // 解析数组值 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      value = inner ? inner.split(',').map(s => s.trim().replace(/['"]/g, '')) : [];
    }
    // 去除字符串引号
    if (typeof value === 'string' && (value.startsWith('"') || value.startsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const REQUIRED_FIELDS = [
  'name', 'version', 'description', 'category', 'preferred_mode',
  'tools', 'permissions', 'context_priority', 'dependencies',
  'requires_mcp', 'platform', 'min_cline_version'
];

// 获取所有已存在的 Skill 名（用于交叉引用检查）
function getExistingSkillNames() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR).filter(f => {
    const fullPath = path.join(SKILLS_DIR, f);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'));
  });
}
```

- [ ] **Step 2: 实现单个 Skill 的校验函数**

```javascript
function validateSkill(skillDir, skillNames) {
  const skillFile = path.join(SKILLS_DIR, skillDir, 'SKILL.md');
  const skillName = skillDir;
  
  if (!fs.existsSync(skillFile)) {
    errors.push(`[${skillName}] SKILL.md 不存在`);
    return;
  }
  
  const content = fs.readFileSync(skillFile, 'utf8');
  const frontmatter = parseFrontmatter(content);
  
  if (!frontmatter) {
    errors.push(`[${skillName}] 缺少有效的 YAML frontmatter (--- ... ---)`);
    return;
  }
  
  // 1.1 必填字段检查
  for (const field of REQUIRED_FIELDS) {
    if (frontmatter[field] === undefined || frontmatter[field] === null) {
      errors.push(`[${skillName}] 缺少必填字段: ${field}`);
    }
  }
  
  // 1.2 name/目录名一致性
  if (frontmatter.name && frontmatter.name !== skillDir) {
    errors.push(`[${skillName}] name 字段 "${frontmatter.name}" 与目录名 "${skillDir}" 不一致`);
  }
  
  // 1.3 description 质量 — 含中文动词，50-200 字符
  if (frontmatter.description) {
    const desc = frontmatter.description;
    if (typeof desc !== 'string') {
      errors.push(`[${skillName}] description 必须是字符串`);
    } else {
      if (desc.length < 50) {
        errors.push(`[${skillName}] description 过短 (${desc.length} 字符，至少 50)`);
      }
      if (desc.length > 200) {
        warnings.push(`[${skillName}] description 过长 (${desc.length} 字符，建议 ≤ 200)`);
      }
      // 中文动词常见字: 探索、设计、实现、审查、验证、调试、创建、管理、生成
      const verbs = ['探索', '设计', '实现', '审查', '验证', '调试', '创建', '管理', '生成',
                     '安装', '搜索', '编排', '分发', '编写', '执行', '完成', '处理', '分析',
                     '重构', '修复', '定位'];
      const hasChineseVerb = verbs.some(v => desc.includes(v));
      if (!hasChineseVerb) {
        warnings.push(`[${skillName}] description 可能缺少中文动词，请检查`);
      }
    }
  }
  
  // 1.4 category 合法值
  if (frontmatter.category && !VALID_CATEGORIES.includes(frontmatter.category)) {
    errors.push(`[${skillName}] category "${frontmatter.category}" 无效，合法值: ${VALID_CATEGORIES.join(', ')}`);
  }
  
  // 1.5 permissions 合法值
  if (frontmatter.permissions) {
    const perms = Array.isArray(frontmatter.permissions) ? frontmatter.permissions : [frontmatter.permissions];
    for (const p of perms) {
      if (!VALID_PERMISSIONS.includes(p)) {
        errors.push(`[${skillName}] permissions 值 "${p}" 无效，合法值: ${VALID_PERMISSIONS.join(', ')}`);
      }
    }
  }
  
  // 1.6 context_priority 合法值
  if (frontmatter.context_priority && !VALID_PRIORITIES.includes(frontmatter.context_priority)) {
    errors.push(`[${skillName}] context_priority "${frontmatter.context_priority}" 无效`);
  }
  
  // 1.7 preferred_mode 合法值
  if (frontmatter.preferred_mode && !VALID_MODES.includes(frontmatter.preferred_mode)) {
    errors.push(`[${skillName}] preferred_mode "${frontmatter.preferred_mode}" 无效`);
  }
  
  // 1.8 platform 合法值
  if (frontmatter.platform && !VALID_PLATFORMS.includes(frontmatter.platform)) {
    errors.push(`[${skillName}] platform "${frontmatter.platform}" 无效`);
  }
  
  // 1.9 version semver 格式
  if (frontmatter.version) {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(frontmatter.version)) {
      errors.push(`[${skillName}] version "${frontmatter.version}" 不符合 semver 格式 (x.y.z)`);
    }
  }
  
  // 2.0 交叉引用检查 — dependencies
  if (frontmatter.dependencies && Array.isArray(frontmatter.dependencies)) {
    for (const dep of frontmatter.dependencies) {
      if (!skillNames.includes(dep)) {
        errors.push(`[${skillName}] 依赖的 Skill "${dep}" 不存在于 skills/ 目录中`);
      }
    }
  }
  
  // 2.1 交叉引用检查 — requires_mcp
  if (frontmatter.requires_mcp && Array.isArray(frontmatter.requires_mcp)) {
    for (const mcp of frontmatter.requires_mcp) {
      if (!KNOWN_MCP_SERVERS.includes(mcp)) {
        warnings.push(`[${skillName}] 依赖的 MCP 服务 "${mcp}" 不在已知列表中，请确认`);
      }
    }
  }
  
  // 3.0 正文章节完整性
  const requiredSections = ['前置条件', '输入', '输出', '使用示例'];
  for (const section of requiredSections) {
    if (!content.includes(`# ${section}`) && !content.includes(`## ${section}`)) {
      errors.push(`[${skillName}] 缺少正文章节: ${section}`);
    }
  }
  
  // 检查是否有 examples/ 目录
  const examplesDir = path.join(SKILLS_DIR, skillDir, 'examples');
  if (!fs.existsSync(examplesDir)) {
    warnings.push(`[${skillName}] 缺少 examples/ 目录`);
  }
  
  // 检查是否有 SKILL.test.md
  const testFile = path.join(SKILLS_DIR, skillDir, 'SKILL.test.md');
  if (!fs.existsSync(testFile)) {
    warnings.push(`[${skillName}] 缺少 SKILL.test.md`);
  }
}
```

- [ ] **Step 3: 实现主函数和入口**

```javascript
function main() {
  console.log('=== Skills Validator v1.0 ===\n');
  console.log(`Spec: ${SPEC_FILE}`);
  console.log(`Skills dir: ${SKILLS_DIR}\n`);
  
  const skillNames = getExistingSkillNames();
  
  if (skillNames.length === 0) {
    console.log('❌ 未找到任何 Skill，请检查 skills/ 目录');
    process.exit(1);
  }
  
  console.log(`找到 ${skillNames.length} 个 Skill\n`);
  
  for (const skillDir of skillNames) {
    validateSkill(skillDir, skillNames);
  }
  
  // 输出报告
  console.log('═'.repeat(60));
  console.log('校验报告');
  console.log('═'.repeat(60));
  
  if (errors.length > 0) {
    console.log(`\n❌ 错误 (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  警告 (${warnings.length}):`);
    warnings.forEach(w => console.log(`  ${w}`));
  }
  
  console.log(`\n══════════════════════════════`);
  console.log(`总计: ${skillNames.length} 个 Skill`);
  console.log(`错误: ${errors.length}, 警告: ${warnings.length}`);
  
  if (errors.length === 0) {
    console.log(`\n✅ 所有 Skill 通过校验!`);
    process.exit(0);
  } else {
    console.log(`\n❌ ${errors.length} 个错误需要修复`);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 4: 添加 shebang 并设置可执行权限**

```bash
chmod +x tools/validate-skills.js
```

- [ ] **Step 5: 测试 — 先在有错误的情况下运行**

```bash
node tools/validate-skills.js
# 预期: 大量错误，因为现有 SKILL.md 只含 name+description
# 输出应包含: "缺少必填字段: version", "缺少正文章节: 前置条件" 等
```

- [ ] **Step 6: 确认脚本输出了有意义的错误**

预期输出类似：
```
❌ 错误 (120+):
  [brainstorming] 缺少必填字段: version
  [brainstorming] 缺少必填字段: category
  ...
```

- [ ] **Step 7: Commit**

```bash
git add tools/validate-skills.js
git commit -m "feat: add skills validation script

- 校验 12 个必填 frontmatter 字段
- name/目录名一致性检查
- description 质量启发式（中文动词 + 长度范围）
- category/permissions/priority/mode/platform 枚举校验
- version semver 格式检查
- dependencies/requires_mcp 交叉引用检查
- 正文章节完整性检查（前置条件/输入/输出/使用示例）"
```

---

### Task 4: 规范化改造 — brainstorming（代表性 Skill）

**Files:**
- Modify: `skills/brainstorming/SKILL.md` (重写 frontmatter)
- Create: `skills/brainstorming/examples/basic-usage.md`
- Create: `skills/brainstorming/SKILL.test.md`

- [ ] **Step 1: 读取当前 SKILL.md 正文内容，保留所有正文**

```bash
cat skills/brainstorming/SKILL.md | wc -l
# 预期: 164 行
```

- [ ] **Step 2: 重写 SKILL.md — 添加完整 12 字段 frontmatter + 规范化章节**

保持原有正文内容不变，在前面添加完整 frontmatter，并在正文前插入必填的章节标记。

由于文件过长（164 行原文），此处分步操作。先替换 frontmatter 部分：

在文件开头，将原有：
```yaml
---
name: brainstorming
description: "You MUST use this before any creative work..."
---
```

替换为：

```yaml
---
name: brainstorming
version: 1.0.0
description: 创意构思前置 — 在实现前探索意图、需求和设计，通过自然协作对话将想法转化为成型设计
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

- [ ] **Step 3: 在正文的大标题后添加必填章节标记**

在 `# Brainstorming Ideas Into Designs` 后、原有内容 `## Anti-Pattern` 前插入：

```markdown
## 前置条件

- 用户已描述需求意图
- 未进入实现阶段
- 项目上下文可通过文件系统访问

## 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| topic | string | 是 | 需求主题或创意方向 |
| constraints | string[] | 否 | 额外约束条件 |

## 输出

- **正常输出**: 结构化的设计文档 (Markdown)，包含架构、组件、数据流、错误处理、测试等章节
- **错误输出**: 需求不明的提示，说明需要补充的具体信息

## 使用示例

### 示例 1: 新功能设计

**场景**: 用户提出「开发用户注册功能」

**预期行为**:
1. 探索项目上下文（读取文件、了解现有结构）
2. 逐项提问澄清需求（每次一个问题）
3. 提出 2-3 种方案，说明利弊
4. 逐节呈现设计方案，等待用户确认
5. 撰写设计文档到 `docs/specs/`
```

**注意**：这些章节标记可以放在正文开头，也可以合并进原有 Checklist 附近。保持原文 `# Brainstorming Ideas Into Designs` 作为总标题不变，在其后添加章节标记，然后保留 `## Anti-Pattern` 及之后的所有原文内容。

- [ ] **Step 4: 创建 examples/ 目录和示例文件**

```bash
mkdir -p skills/brainstorming/examples
```

```markdown
# brainstorming — 使用示例

## 示例 1: 新功能设计

**输入**: topic = "开发用户标签管理系统"

**调用**: use_skill("brainstorming")

**过程**:
1. Agent 读取项目文件了解当前架构
2. Agent 提问「标签是全局的还是每个用户独立的？」
3. 用户确认后，Agent 提出 3 种方案
4. 用户选择方案 2，Agent 逐节呈现设计
5. 生成 spec 文档

**输出**: `docs/specs/2026-xx-xx-tag-system-design.md`

## 示例 2: 重构方案设计

**输入**: topic = "将单体 API 拆分为微服务", constraints = ["不增加部署复杂度"]

**调用**: use_skill("brainstorming")

**过程**:
1. Agent 理解当前单体架构
2. Agent 基于约束条件提出 2 种方案（BFF + 垂直切分 vs. 按领域拆服务）
3. 用户选择后细化设计
```

- [ ] **Step 5: 创建 SKILL.test.md**

```bash
touch skills/brainstorming/SKILL.test.md
```

```markdown
# 测试: brainstorming

## TC-01: 正常输入 — 新功能设计

**输入**: topic = "用户注册功能"

**语义断言**:
  - must_contain_concept: ["探索上下文", "澄清问题", "设计方案"]
  - llm_judge_prompt: "输出是否包含一个结构化的设计文档，且按步骤呈现：探索 → 提问 → 方案 → 设计？"
  - max_tokens: 1000

## TC-02: 空输入 — 缺少必填参数

**输入**: topic = ""

**语义断言**:
  - must_contain_concept: ["请提供", "主题"]
  - llm_judge_prompt: "输出是否明确提示用户 topic 不能为空？"

## TC-03: 边界值 — 长文本输入

**输入**: topic = "我们需要构建一个完整的电商平台，包含商品管理、订单系统、支付集成、物流追踪、用户评价、优惠券系统、会员等级、数据分析后台、商家管理端、客服系统等模块"

**语义断言**:
  - llm_judge_prompt: "输出是否提示将大型需求拆分为多个子项目分别设计？而不是试图一次性设计所有模块。"
  - max_tokens: 800
```

- [ ] **Step 6: 运行校验脚本 — 确认 brainstorming 通过**

```bash
node tools/validate-skills.js
```

如果还有 warning/error，逐步修复直到 brainstorming 自身零错误。

- [ ] **Step 7: Commit**

```bash
git add skills/brainstorming/
git commit -m "feat: normalize brainstorming skill to v1.0 spec

- 添加完整 12 字段 YAML frontmatter
- 添加前置条件/输入/输出/使用示例章节
- 添加 examples/basic-usage.md
- 添加 SKILL.test.md（3 条 LLM-as-a-Judge 测试用例）"
```

---

### Task 5-18: 规范化改造 — 其余 14 个 Skill

> ⚠️ 每个 Skill 作为一个独立 task，遵循与 Task 4 完全相同的步骤模式。以下列出每个 Skill 的 frontmatter 关键差异，省略重复步骤。

- [ ] **Task 5: writing-plans**

```yaml
---
name: writing-plans
version: 1.0.0
description: 编写详细的实施计划 — 将设计 spec 转化为零上下文工程师可直接执行的逐步骤任务列表
category: workflow
preferred_mode: plan
tools: [read_file, write_to_file, search_files]
permissions: [read_only]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 6: executing-plans**

```yaml
---
name: executing-plans
version: 1.0.0
description: 执行已编写的实施计划 — 按任务顺序逐步骤实现，设置检查点供审查
category: workflow
preferred_mode: act
tools: [read_file, write_to_file, replace_in_file, execute_command]
permissions: [requires_user_approval_for_write]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 7: requesting-code-review**

```yaml
---
name: requesting-code-review
version: 1.0.0
description: 代码审查 — 在完成任务或实现主要功能后验证工作是否符合需求和质量标准
category: meta
preferred_mode: plan
tools: [read_file, search_files]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 8: verification-before-completion**

```yaml
---
name: verification-before-completion
version: 1.0.0
description: 完成前验证 — 在提交代码或创建 PR 前确认工作已验证通过，禁止未经验证声明成功
category: meta
preferred_mode: act
tools: [execute_command, read_file]
permissions: [requires_user_approval_for_write]
context_priority: medium
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 9: systematic-debugging**

```yaml
---
name: systematic-debugging
version: 1.0.0
description: 系统化调试 — 在遇到任何 bug、测试失败或意外行为时，先定位根因再修复，禁止猜测式修复
category: workflow
preferred_mode: act
tools: [read_file, search_files, execute_command]
permissions: [requires_user_approval_for_write]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 10: test-driven-development**

```yaml
---
name: test-driven-development
version: 1.0.0
description: 测试驱动开发 — 在实现任何功能或修复 bug 前先编写失败测试，遵循红-绿-重构循环
category: workflow
preferred_mode: act
tools: [read_file, write_to_file, replace_in_file, execute_command]
permissions: [requires_user_approval_for_write]
context_priority: high
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 11: hypothesis-driven-research**

```yaml
---
name: hypothesis-driven-research
version: 1.0.0
description: 假设驱动调研 — 在任何网络搜索或技术调研前强制先形成假设再搜索，防止盲目的搜索行为
category: workflow
preferred_mode: plan
tools: [search_files, use_mcp_tool]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: ["duckduckgo"]
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 12: dispatching-parallel-agents**

```yaml
---
name: dispatching-parallel-agents
version: 1.0.0
description: 并行代理调度 — 当面对 2 个以上可独立并行执行的子任务时进行并行分发
category: utility
preferred_mode: any
tools: [read_file, search_files]
permissions: [read_only]
context_priority: low
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 13: file-search**

```yaml
---
name: file-search
version: 1.0.0
description: 文件搜索 — 搜索代码库中的文本模式、AST 结构、按文件名查找、PDF 解析，为任务构建上下文信息
category: domain
preferred_mode: any
tools: [search_files, read_file, list_files]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 14: finishing-a-development-branch**

```yaml
---
name: finishing-a-development-branch
version: 1.0.0
description: 完成开发分支 — 实现完成且所有测试通过后，决定如何集成工作：合并/PR/清理
category: workflow
preferred_mode: act
tools: [execute_command]
permissions: [requires_user_approval_for_write]
context_priority: medium
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 15: pptx**

```yaml
---
name: pptx
version: 1.0.0
description: PowerPoint 操作 — 涉及 .pptx 文件的任何操作：创建演示文稿、解析提取文本、编辑修改模板、合并拆分幻灯片
category: domain
preferred_mode: act
tools: [execute_command, read_file, write_to_file]
permissions: [requires_user_approval_for_write]
context_priority: medium
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 16: search-orchestrator**

```yaml
---
name: search-orchestrator
version: 1.0.0
description: 搜索编排器 — 在任何网络搜索或多步骤调研前强制分解问题、列出假设、设计搜索路径并评估证据
category: workflow
preferred_mode: plan
tools: [use_mcp_tool, search_files]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: ["duckduckgo"]
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 17: skill-installer**

```yaml
---
name: skill-installer
version: 1.0.0
description: 技能安装管理 — 发现、评估、安装和管理 Agent Skills，支持多策略安装与自动回退
category: utility
preferred_mode: any
tools: [execute_command, read_file, write_to_file]
permissions: [requires_user_approval_for_write]
context_priority: low
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Task 18: subagent-driven-development**

```yaml
---
name: subagent-driven-development
version: 1.0.0
description: 子代理驱动开发 — 执行包含多个独立任务的实施计划时，为每个任务分派独立的子代理
category: utility
preferred_mode: act
tools: [read_file, write_to_file, replace_in_file, execute_command]
permissions: [requires_user_approval_for_write]
context_priority: low
dependencies: []
requires_mcp: []
platform: any
min_cline_version: "3.0.0"
---
```

- [ ] **Step for each Task 5-18: 逐个执行**

对每个 Skill 执行以下步骤：

1. 重写 `skills/<name>/SKILL.md` frontmatter 为完整 12 字段
2. 添加正文章节标记（前置条件/输入/输出/使用示例）
3. 创建 `skills/<name>/examples/basic-usage.md`
4. 创建 `skills/<name>/SKILL.test.md`（至少 2 条测试用例）
5. 运行 `node tools/validate-skills.js` 确认通过
6. Commit: `git add skills/<name>/ && git commit -m "feat: normalize <name> skill to v1.0 spec"`

- [ ] **Step: 全部 15 个 Skill 规范化后，运行最终校验**

```bash
node tools/validate-skills.js
# 预期: 0 errors, 部分 warning（如缺少 SKILL.test.md 的 warning 在补充后消失）
```

- [ ] **Step: Final commit for normalization batch**

```bash
git add skills/
git commit -m "feat: normalize all 15 skills to v1.0 spec

- 全部 Skill 补全 12 字段 YAML frontmatter
- 添加前置条件/输入/输出/使用示例章节
- 添加 examples/ 和 SKILL.test.md
- 通过 tools/validate-skills.js 校验"
```

---

### Task 19: 编写 CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: 创建文件**

```bash
touch CONTRIBUTING.md
```

- [ ] **Step 2: 写入贡献指南**

```markdown
# 贡献指南

感谢你对 cline-skills-workspace 的关注!本指南将帮助你提交高质量的 Skill。

## 目录

- [行为准则](#行为准则)
- [快速开始](#快速开始)
- [Skill 提交流程](#skill-提交流程)
- [审核标准](#审核标准)
- [命名规范](#命名规范)
- [测试要求](#测试要求)

## 行为准则

本项目遵循 CNCF 行为准则。核心原则：尊重他人，建设性沟通。

## 快速开始

1. Fork 本仓库
2. 使用 `tools/validate-skills.js` 检查你的 Skill
3. 提交 PR

```bash
# 1. 校验你的 Skill
node tools/validate-skills.js

# 2. 修复所有 ERROR（WARNING 建议修复）
# 3. 确保 SKILL.test.md 至少包含 2 条测试用例
```

## Skill 提交流程

### 1. 创建 Skill 目录

```
skills/<your-skill-name>/
├── SKILL.md           # 技能定义（必须）
├── SKILL.test.md      # 测试用例（必须，至少 2 条）
└── examples/          # 使用示例（必须）
    └── basic-usage.md
```

### 2. 编写 SKILL.md

严格遵循 `docs/skill-spec.md` 规范。12 个 frontmatter 字段全部必填。

### 3. 编写 SKILL.test.md

参考 `docs/skill-spec.md` 第 4 节。使用 LLM-as-a-Judge 断言格式。

### 4. 运行校验

```bash
node tools/validate-skills.js
```

**ERROR 必须全部修复。WARNING 建议修复。**

### 5. 提交 PR

PR 标题格式: `feat: add <skill-name> skill`

## 审核标准

PR 审核检查清单：

- [ ] `node tools/validate-skills.js` 零 ERROR
- [ ] SKILL.md 12 个 frontmatter 字段完整
- [ ] name 与目录名一致
- [ ] description 含动词且语义清晰
- [ ] category 分类正确
- [ ] 正文包含「前置条件」「输入」「输出」「使用示例」
- [ ] SKILL.test.md 至少 2 条语义断言
- [ ] examples/ 至少有 1 个文件
- [ ] 没有硬编码的路径或密钥
- [ ] version 遵循 semver

## 命名规范

### Skill 名称

- 小写英文 + 连字符
- 动词-名词 或 名词 格式
- 示例: `systematic-debugging`, `writing-plans`, `pptx`

### 目录名

- 必须与 SKILL.md 中 `name` 字段完全一致

## 测试要求

每个 Skill 的 SKILL.test.md 必须包含：

1. **正常输入测试** — 标准场景，验证核心功能
2. **异常输入测试** — 空输入、错误格式等
3. **边界值测试**（推荐）— 极大/极小输入

使用 LLM-as-a-Judge 断言格式（详见 `docs/skill-spec.md` §4）。

## 许可证

本项目采用 MIT 许可证。贡献你的 Skill 即表示你同意将其以 MIT 许可证分发。
```

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide

- Skill 提交流程（5 步骤）
- 9 项审核清单
- 命名规范
- LLM-as-a-Judge 测试要求"
```

---

### Task 20: 重写 README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 备份当前 README**

```bash
cp README.md README.old.md  # 临时备份，确认后删除
```

- [ ] **Step 2: 重写 README.md**

```markdown
# Cline Skills Workspace

> Cline Agent 技能的质量标杆仓库。每个 Skill 都经过测试验证、有明确版本、可独立安装使用。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-15-blue)](skills/)

---

## 快速开始

将 `skills/` 下任意 Skill 目录复制到你的 Cline 配置目录即可使用：

```bash
# 安装单个 Skill
cp -r skills/brainstorming ~/.claude/skills/

# 重启 Cline 后生效
```

**5 分钟体验**：用 brainstorming 技能设计一个新功能。

1. 在 Cline 中输入: "我想设计一个用户标签系统"
2. Cline 自动加载 brainstorming 技能
3. 通过对话逐步产出完整设计文档

---

## 技能目录

| 分类 | 技能 | 版本 | 说明 |
|------|------|------|------|
| **workflow** | | | |
| | [brainstorming](skills/brainstorming/) | 1.0.0 | 创意构思前置 |
| | [writing-plans](skills/writing-plans/) | 1.0.0 | 编写实施计划 |
| | [executing-plans](skills/executing-plans/) | 1.0.0 | 执行实施计划 |
| | [systematic-debugging](skills/systematic-debugging/) | 1.0.0 | 系统化调试 |
| | [test-driven-development](skills/test-driven-development/) | 1.0.0 | 测试驱动开发 |
| | [hypothesis-driven-research](skills/hypothesis-driven-research/) | 1.0.0 | 假设驱动调研 |
| | [search-orchestrator](skills/search-orchestrator/) | 1.0.0 | 搜索编排 |
| | [finishing-a-development-branch](skills/finishing-a-development-branch/) | 1.0.0 | 分支收尾 |
| **meta** | | | |
| | [requesting-code-review](skills/requesting-code-review/) | 1.0.0 | 代码审查 |
| | [verification-before-completion](skills/verification-before-completion/) | 1.0.0 | 完成前验证 |
| **domain** | | | |
| | [pptx](skills/pptx/) | 1.0.0 | PowerPoint 操作 |
| | [file-search](skills/file-search/) | 1.0.0 | 文件搜索 |
| **utility** | | | |
| | [skill-installer](skills/skill-installer/) | 1.0.0 | 技能安装管理 |
| | [dispatching-parallel-agents](skills/dispatching-parallel-agents/) | 1.0.0 | 并行代理调度 |
| | [subagent-driven-development](skills/subagent-driven-development/) | 1.0.0 | 子代理驱动开发 |

---

## 技能标准

每个 Skill 遵循 [SKILL.md 规范](../skill-spec.md) — 12 个必填 frontmatter 字段，4 个正文章节。

所有 Skill 通过 `tools/validate-skills.js` 自动校验:

```bash
node tools/validate-skills.js
# ✅ 所有 Skill 通过校验!
```

---

## 项目结构

```
cline-skills-workspace/
├── skills/                       # 技能定义（核心资产）
│   ├── brainstorming/
│   │   ├── SKILL.md              # 标准化技能定义
│   │   ├── SKILL.test.md         # 测试用例
│   │   └── examples/             # 使用示例
│   └── ... (14 more)
├── skills-mcp-server/            # MCP 服务器
├── tools/
│   └── validate-skills.js        # 技能格式校验
├── docs/
│   ├── skill-spec.md             # 规范标准
│   ├── roadmap.md                # 发展规划
│   └── examples/                 # 演示案例
└── CONTRIBUTING.md               # 贡献指南
```

---

## 愿景

成为 Cline 生态的「npm for skills」— 每个 Skill 可发现、可安装、可验证。

**当前阶段**: 深度优先 — 将 15 个 Skill 做到工业级质量。

详见 [发展规划](docs/roadmap.md)。

---

## 贡献

欢迎贡献新 Skill! 请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解提交流程和审核标准。

---

## License

MIT
```

- [ ] **Step 3: 验证 README**

```bash
wc -l README.md          # 应 > 80 行
head -5 README.md        # 确认标题正确
```

- [ ] **Step 4: 删除临时备份**

```bash
rm README.old.md
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for v1.0 open-source focus

- 新定位：质量标杆仓库
- 技能目录索引表（15 个 Skill，按分类排列）
- 5 分钟快速入门
- 移除求职相关内容"
```

---

### Task 21: 最终校验

- [ ] **Step 1: 运行完整校验**

```bash
node tools/validate-skills.js
# 预期: 0 errors, 0 warnings
```

- [ ] **Step 2: 检查所有必需文件存在**

```bash
echo "=== Skills ===" && ls -1 skills/ | wc -l
echo "=== SKILL.md files ===" && find skills/ -name "SKILL.md" | wc -l
echo "=== SKILL.test.md files ===" && find skills/ -name "SKILL.test.md" | wc -l
echo "=== examples dirs ===" && find skills/ -type d -name "examples" | wc -l
# 预期: 15 skills, 15 SKILL.md, 15 SKILL.test.md, 15 examples/
```

- [ ] **Step 3: 最终提交**

```bash
git add -A
git status
git commit -m "chore: phase 1 completion — all 15 skills validated"
```

---

## Self-Review Checklist

| Check | Status |
|-------|--------|
| Spec coverage: 1.1 (仓库重整) → Task 1 | ✅ |
| Spec coverage: 1.2 (skill-spec.md) → Task 2 | ✅ |
| Spec coverage: 1.3 (validate-skills.js) → Task 3 | ✅ |
| Spec coverage: 1.4 (15 Skill 规范化) → Tasks 4-18 | ✅ |
| Spec coverage: 1.5 (SKILL.test.md) → Included in Tasks 4-18 | ✅ |
| Spec coverage: 1.6 (CONTRIBUTING.md) → Task 19 | ✅ |
| Spec coverage: 1.7 (README.md) → Task 20 | ✅ |
| No placeholders: "TBD"/"TODO" scan | ✅ None found |
| No vague "add error handling" steps | ✅ All steps concrete |
| Type consistency: frontmatter fields consistent across all skills | ✅ Same 12-field schema |
| validate-skills.js covers: name/dir consistency, description quality, cross-references | ✅ All implemented |