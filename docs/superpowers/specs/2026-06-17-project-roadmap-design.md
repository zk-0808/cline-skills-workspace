# Project Development Roadmap

> 创建日期：2026-06-17
> 版本：2.0.0（2026-06-20 修订）
> 基于：ChatGLM 5.2 建议 + Agent Constitution 约束 + 2026-06-18 外部评审 + Dogfooding Sprint 复盘
>
> **v2.0 修订说明**：原 v1.0 路线图（Phases 1-4）保留为 §5「原始规划」。项目在 2026-06-18 发生 pivot——Phase 2 从「MCP Server 质量增强」转向「Project Continuity Layer MVP（memory / handoff / compact）」，详见 §5b。

---

## 1. 项目愿景

成为 Cline Agent 技能的质量标杆仓库 —— 每个 Skill 都经过测试验证、有明确版本、可独立安装使用。

### 定位与阶段

- **当前**：个人/小团队工具
- **目标**：渐进式走向社区共建平台（「先 A 后 B」）
- **当前过渡**：从求职 Demo 转向纯开源产品，求职材料归档到 `archive/`

### 核心原则（从 Agent Constitution 派生）

1. **质量 > 数量**：15 个 Skill 每个都达到工业级，远比 50 个半成品有价值
2. **可独立使用**：每个 Skill 是自包含的，不依赖其他 Skill 才能工作
3. **可验证**：每个 Skill 有测试用例，CI 自动验证
4. **渐进平台化**：架构上预留 CLI/Web 接口，但 v1.0 不实现
5. **证据优于推测**：所有技术决策标注来源等级

---

## 2. v1.0 仓库架构

```
cline-skills-workspace/
├── .clinerules                    # Agent 宪法 — 注入 System Prompt 的行为约束
├── LEARNINGS.md                   # 经验库 — 五问复盘记录
├── README.md                      # 重写：项目介绍 + 5 分钟快速开始
├── CONTRIBUTING.md                # 新增：贡献指南（流程 + 审核标准 + 命名规范）
├── docs/
│   ├── skill-spec.md              # SKILL.md 规范标准文档
│   └── roadmap.md                 # 本文件：发展规划
├── skills/                        # 重整：所有 Skill 统一目录
│   ├── brainstorming/
│   │   ├── SKILL.md               # 规范化格式（含 YAML frontmatter）
│   │   ├── SKILL.test.md          # 测试用例（LLM-as-a-Judge 断言）
│   │   └── examples/              # 使用示例
│   ├── systematic-debugging/
│   │   ├── SKILL.md
│   │   ├── SKILL.test.md
│   │   └── examples/
│   ├── executing-plans/
│   ├── writing-plans/
│   ├── requesting-code-review/
│   ├── verification-before-completion/
│   ├── test-driven-development/
│   ├── hypothesis-driven-research/
│   ├── dispatching-parallel-agents/
│   ├── file-search/
│   ├── finishing-a-development-branch/
│   ├── pptx/
│   ├── search-orchestrator/
│   ├── skill-installer/
│   └── subagent-driven-development/
├── skills-mcp-server/             # MCP Server（保留并增强）
│   ├── index.js                   # 路由分发 + 证据链系统
│   ├── handlers/                  # 独立 handler 模块
│   └── tests/                     # 新增：Server 层单元测试
├── tools/                         # 辅助脚本
│   └── validate-skills.js         # Skill 格式校验脚本
├── archive/                       # 归档内容
│   └── showcase/                  # 求职材料（不再维护）
└── docs/
    └── examples/                  # 从 demo/ 迁移，去求职化保留演示价值
```

### 移除/归档

| 内容 | 处理 | 原因 |
|------|------|------|
| `agentic-development-workflow/showcase/` | → `archive/showcase/` | 求职材料，不维护 |
| `agentic-development-workflow/demo/` | → `docs/examples/` | 保留演示，去求职化 |
| `.claude/skills/` | → `skills/` | 目录名更直观 |

---

## 3. SKILL.md 规范标准

### 3.1 YAML Frontmatter

```yaml
---
name: brainstorming                          # 唯一标识，小写 + 连字符
version: 1.0.0                               # 语义化版本
description: 创意构思前置 — 探索意图、需求和设计
category: workflow                            # workflow | domain | utility | meta
preferred_mode: plan                          # 建议 Cline 切换的模式：plan | act | any
tools: [read_file, search_files, ask_followup_question, plan_mode_respond]
permissions: [read_only]                      # read_only | requires_user_approval_for_write
context_priority: high                        # high | medium | low（上下文压缩时优先保留）
dependencies: []                              # 依赖的其他 Skill 名
requires_mcp: []                              # 依赖的 MCP 服务（如 "github-mcp"）
platform: any                                 # any | windows | macos | linux
min_cline_version: "3.0.0"                    # 最低 Cline 版本 [推测]
---
```

### 3.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 唯一标识符，小写 + 连字符 |
| `version` | semver | ✅ | 语义化版本，breaking change 升大版本 |
| `description` | string | ✅ | 一句话描述 Skill 的功能 |
| `category` | enum | ✅ | `workflow` / `domain` / `utility` / `meta` |
| `preferred_mode` | enum | ✅ | 建议 Cline 切换的模式（plan/act/any）|
| `tools` | string[] | ✅ | **建议性契约**：提示 LLM 优先使用这些工具。最终执行权归 Cline 核心调度器 [设计决策] |
| `permissions` | enum[] | ✅ | 安全权限声明：`read_only` 或 `requires_user_approval_for_write` |
| `context_priority` | enum | ✅ | 上下文压缩时优先保留级别 |
| `dependencies` | string[] | ✅ | 依赖的其他 Skill 名，绝大多数为 `[]` |
| `requires_mcp` | string[] | ✅ | 依赖的 MCP 服务，如无则为 `[]` |
| `platform` | enum | ✅ | 适用平台 |
| `min_cline_version` | string | ✅ | 最低 Cline 版本要求 |

### 3.3 四分类体系

| 分类 | 说明 | 示例 |
|------|------|------|
| `workflow` | 编排类 — 开发流程步骤 | brainstorming, writing-plans, executing-plans |
| `domain` | 领域类 — 特定领域的专业能力 | pptx, file-search |
| `utility` | 工具类 — 通用辅助能力 | skill-installer, dispatching-parallel-agents |
| `meta` | 元类 — 跨越多个步骤的质量保障 | verification-before-completion, requesting-code-review |

### 3.4 SKILL.md 正文规范

每个 SKILL.md 必须包含以下章节：

1. **前置条件** — 使用此 Skill 前必须满足的条件
2. **输入** — 参数表格（名称、类型、必填、说明）
3. **输出** — 正常输出格式 + 错误输出格式
4. **使用示例** — 至少 1 个，推荐 2-3 个覆盖典型场景

---

## 4. 测试规范：SKILL.test.md

### 4.1 设计理念

**行为驱动** — 描述 Skill 是否做了正确的事，而非断言返回的精确字符串（LLM 输出天然不确定）。

采用 **LLM-as-a-Judge** 语义断言机制 [ChatGLM 建议]。

### 4.2 测试用例格式

```markdown
# 测试: brainstorming

## TC-01: 正常输入
**输入**: topic = "用户注册功能"
**语义断言**:
  - must_contain_concept: ["探索上下文", "澄清问题", "设计方案"]
  - llm_judge_prompt: "输出是否包含一个结构化的设计文档，且步骤逻辑清晰？"
  - max_tokens: 500

## TC-02: 空输入
**输入**: topic = ""
**语义断言**:
  - must_contain_concept: ["错误", "请提供"]
  - llm_judge_prompt: "输出是否明确提示用户输入不能为空？"

## TC-03: 边界值
**输入**: topic = 500字长文本
**语义断言**:
  - llm_judge_prompt: "输出是否完整处理了长文本输入，没有截断或遗漏？"
```

### 4.3 断言类型

| 断言 | 说明 |
|------|------|
| `must_contain_concept` | 输出中必须包含的关键概念列表 |
| `must_not_contain` | 输出中禁止出现的内容 |
| `llm_judge_prompt` | 由另一个 LLM 实例判断 true/false 的语义问题 |
| `max_tokens` | 输出长度上限 |
| `format_check` | 格式校验（如：是否包含 YAML frontmatter） |

### 4.4 自动化执行

Phase 3 将实现 `tools/run-tests.js`，调用 LLM API 自动执行 `llm_judge_prompt`，实现半自动化回归测试。

---

## 5. 分阶段路线图

### 总览

```
Phase 1 (v1.0) ─── 基础规范 + 技能达标          0~2 个月
Phase 2 (v1.5) ─── MCP Server 增强               2~4 个月
Phase 3 (v2.0) ─── 工具链 + 社区基础              4~8 个月
Phase 4 (v3.0) ─── 平台化（远期，不详细设计）      8~12 个月
```

---

### Phase 1：夯实质量基础（v1.0，0~2 个月）

**目标**：每个 Skill 都有标准化 SKILL.md + SKILL.test.md，通过 validate 脚本检查。

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| 1.1 | 仓库重整 | `archive/showcase/`、`skills/` 目录、`.claude/skills/` → `skills/` 迁移 | P0 |
| 1.2 | 编写 `docs/skill-spec.md` | 正式的 SKILL.md 规范文档（含本文件第 3 节全部字段） | P0 |
| 1.3 | 编写 `tools/validate-skills.js` | 校验：frontmatter 必填字段 + name/目录名一致性 + description 质量启发式（含动词、50-200 字符）+ dependencies/requires_mcp 交叉引用存在性检查 | P0 |
| 1.4 | 15 个 Skill 规范化改造 | 每个 Skill 补全 frontmatter + 输入/输出定义 + examples/ | P0 |
| 1.5 | 15 个 Skill 测试用例编写 | 每个 Skill 写 SKILL.test.md（LLM-as-a-Judge 断言） | P1 |
| 1.6 | `CONTRIBUTING.md` | 贡献流程 + 审核标准 + 命名规范 | P1 |
| 1.7 | `README.md` 重写 | 新定位 + 5 分钟快速入门 + 技能目录索引表 | P0 |

**退出标准**：任意新 Skill 必须通过 `validate-skills.js` 才能合入。

---

### Phase 2：MCP Server 质量增强（v1.5，2~4 个月）

**目标**：MCP Server 从「功能可用」到「工业级可靠性」。

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| 2.1 | 证据链系统完善 | `record_source_read` / `check_evidence_chain` 覆盖全部 15 个 handler | P1 |
| 2.2 | 错误处理标准化 | 统一错误码 + 错误信息格式 + 重试建议 | P1 |
| 2.3 | Handler 单元测试 | `skills-mcp-server/tests/` — 每个 handler 的输入/输出测试 | P1 |
| 2.4 | 启动自检增强 | 启动时自动校验所有 Skill frontmatter，问题 Skill 标记为 degraded | P2 |
| 2.5 | 性能基线 | 建立 benchmark（P50/P95/P99），集成到 CI 做回归测试，目标 < 50ms | P2 |
| 2.6 | Cline 官方初步沟通 | 带已验证的规范和 MCP Server 主动接触 Cline 团队，了解官方 Roadmap | P2 |

**退出标准**：`skills-mcp-server/` 有完整测试覆盖，CI 通过。

---

### Phase 3：工具链 + 社区基础设施（v2.0，4~8 个月）

> ⚠️ **启动闸门**：仅当 Phase 1+2 稳定、且 ≥ 3 个外部贡献者/用户时启动。避免过早平台化导致分发低质量技能。

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| 3.1 | CLI 工具 `cline-skills` | `search` / `install` / `list` / `create` 命令。`create` 为交互式向导，自动生成 SKILL.md 骨架 + SKILL.test.md 模板 + examples/ 目录 | P1 |
| 3.2 | 符号链接安装 | `install` 创建符号链接到 `~/.claude/skills/`，更新即时生效；安装时校验 registry.json 签名 | P1 |
| 3.3 | LLM-as-a-Judge 测试运行器 | `tools/run-tests.js` 自动执行 SKILL.test.md 语义断言，支持多 Judge 投票 (2-3 个不同 LLM 多数通过) 和 Judge 提示词模板库 | P1 |
| 3.4 | GitHub Actions CI | PR 自动运行 `validate-skills` + handler 单元测试 + 测试运行器 | P2 |
| 3.5 | VS Code 扩展（MVP） | 技能浏览侧边栏 + 一键安装 | P2 |
| 3.6 | 技能注册表（GitHub raw JSON） | `registry.json` 索引全部技能元数据 + 校验和/签名，CLI 安装时验证完整性 | P2 |
| 3.7 | 社区治理初建 | `CONTRIBUTING.md` 补充贡献者协议 + 技能维护者角色 + 审核清单 | P2 |

**退出标准**：`cline-skills install brainstorming` 可在 30 秒内完成，无需手动复制文件。

---

### Phase 4：平台化（v3.0，远期，不详细设计）

> ⚠️ 此阶段为远景描述，取决于 Phases 1-3 的社区反馈和用户规模。

| 方向 | 说明 |
|------|------|
| **技能市场 Web UI** | Next.js 网站：搜索、筛选、评分、评论 |
| **技能质量评分** | 下载量 + 评分 + 更新频率 = 综合热度 |
| **Cline 官方标准推动** | 延续 Phase 2 沟通，争取纳入官方推荐 / 合并入主项目 |
| **跨 Agent 兼容** | 抽象技能定义层，适配 Cursor、Aider 等其他 AI Agent |

---

| 决策 | 理由 |
|------|------|
| CLI 放在 Phase 3 而非 Phase 1 | 没有质量的 CLI 只会分发坏技能，加速信任崩塌 [复杂度必须被证明] |
| VS Code 扩展放在 Phase 3 | 依赖 CLI 稳定，且需要足够的技能数量才有浏览价值 |
| Phase 3 有启动闸门 | 避免过早平台化，确保基础设施能承载社区增长 |
| Phase 4 不做详细设计 | 过度规划远期是浪费，专注当下可交付的阶段 |
| `tools` 字段为建议性契约 | Cline 不提供第三方工具拦截 API，硬约束不可行 [实测] |
| 测试采用 LLM-as-a-Judge | LLM 输出天然不确定，传统单元测试失效 [ChatGLM 建议] |
| `skills/` 替代 `.claude/skills/` | 目录名更直观，降低新用户认知门槛 |
| Phase 2 延迟，先做 Phase 1.5 | 错误处理标准化需基于实战日志；Cline 官方沟通需带着真实数据。先跑 1-2 个项目积累 LEARNINGS，再回过头来规划 Phase 2 具体范围 [证据优于推测] |

---

## 5b. 实际执行轨迹（2026-06-20 修订）

> ⚠️ 本节为 v2.0 新增。项目在 2026-06-18 发生方向性 pivot——原始 Phase 2「MCP Server 质量增强」被实际建成的新 Phase 2「Project Continuity Layer MVP」替代。

> **命名说明**：实际建成的是跨会话连续性能力（memory / handoff / compact），而非完整 Agent Runtime（执行调度/工具路由/权限系统等）。采用「Project Continuity Layer」避免读者误以为已在做通用 Agent Runtime。

### Pivot 原因

原路线图设计于 2026-06-17（仅 1 天前），当时聚焦「Skill 质量标准」且尚未明确项目定位。24 小时后：

1. 外部评审（2026-06-18）指出了「Project Continuity」作为核心差异化的潜力
2. 项目定位从「Skill Marketplace」转向「Project Continuity for AI Coding」
3. 发现原始 Phase 2（证据链/错误标准化/性能基线）的优先级低于建立跨会话连续性 MVP

### 实际完成 vs 原始规划

| 原始 Phase | 原始定义 | 实际完成 | 偏差原因 |
|-----------|---------|---------|---------|
| Phase 1 | Skill Foundation | ✅ 95% 完成（15/15 SKILL.md, 13/15 SKILL.test.md, validate 0 ERROR） | 2 个 SKILL.test.md（context-compactor / memory-keeper）标记为 P1 延期 |
| Phase 2（原） | MCP Server 质量增强 | ⚠️ ~20%（证据链已删除、benchmark 仅设计、Cline 沟通未启动） | pivot 到 Project Continuity Layer |
| **→ Phase 2（实际）** | **Project Continuity Layer MVP** | **✅ 完成** | **memory + handoff + compact 三层模型** |

### 实际 Phase 2 详情：Project Continuity Layer MVP

| 组件 | 工具 | 状态 | 验证 |
|------|------|------|------|
| **memory** | `memory_commit` / `memory_recall` / `memory_list` | ✅ | 13 + 23 用例 |
| **handoff** | `handoff_write` / `handoff_resume` | ✅ | 58 + 19 用例 |
| **compact** | `compact_context` | ✅ | 集成在 handlers |
| **安装** | `install.mjs` | ✅ | 5 种模式 |
| **定位** | `product-positioning.md` v1.0 | ✅ | 锁定 |
| **Schema** | `handoff-schema.md` v1.0 | ✅ | 锁定 |
| **项目身份** | `getProjectHashByGitUrl()` | ✅ | 28 用例 |

**总验证**：141 用例 / 0 失败

### 3 天 Dogfooding Sprint 结论（2026-06-18 → 06-21）

| 问题 | 答案 |
|------|------|
| Q1: handoff 会不会被持续使用？ | ✅ 会。4 次完整 write/resume 循环，非演示 |
| Q2: handoff 字段对不对？ | ✅ 8 字段全部用过，`do_not` 是差异化最强字段；`in_progress`/`blocked_by` 保留观察 |
| Q3: memory 和 handoff 是否重叠？ | ✅ 0 次犹豫。三层模型在真实使用中边界清晰 |

详见 [`docs/dogfooding-sprint-retrospective.md`](../../dogfooding-sprint-retrospective.md)。

### 当前版本状态（v1.0 MVP）

```
Skill Foundation (Phase 1) ✅
    +
Project Continuity Layer MVP (Phase 2 实际) ✅
    =
v1.0 第一次产品闭环 ✅
```

**v1.0 冻结门槛**（2026-06-20）：
- ✅ GOAL_REQUIRED 诊断增强
- ✅ README 同步实际能力
- ✅ `.clinerules` 规范 10 补充编码管道陷阱
- ⏳ 路线图本文档更新（当前）

**v1.1 候选（Sprint 后 P1）**：
- memory_export/import 实现（设计已完成）
- benchmark 框架实现（设计已完成）
- 补 2 个缺失的 SKILL.test.md

---

## 7. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Cline 核心 API 变更导致 Skill 失效 | 中 | 高 | `min_cline_version` 字段 + CI 定期回归 |
| 社区贡献技能质量低 | 高 | 中 | `validate-skills.js` + 人工审核 + 评分机制 (Phase 3) |
| LLM-as-a-Judge 测试不可靠 | 中 | 中 | 人工复核 + 多轮 Judge + 降级为人工检查 |
| 过早平台化导致维护负担 | 低 | 高 | Phase 3 启动闸门阻止 |
| 技能数量增长导致仓库膨胀 | 低 | 中 | `skills/` 按分类分子目录 (Phase 2+ 评估) |

---

## 8. 成功指标

| 阶段 | 指标 |
|------|------|
| Phase 1 完成 | 15 个 Skill 全部通过 `validate-skills.js`；`CONTRIBUTING.md` 可用 |
| Phase 2 完成 | `skills-mcp-server/tests/` 覆盖率 > 80%；handler 延迟 < 50ms |
| Phase 3 完成 | ≥ 3 个外部贡献者；`cline-skills install` 端到端可用 |
| Phase 4 触发 | ≥ 50 GitHub stars；≥ 10 个外部贡献 Skill |

---

## 附录 A：信息来源标注

本文档中关键结论的来源标注遵循 Agent Constitution 宪法一：

| 标注 | 说明 |
|------|------|
| `[实测]` | 本人执行命令/读取文件/调用工具确认 |
| `[源码]` | GitHub 等仓库源码确认 |
| `[文档]` | 官方文档或 README 确认 |
| `[社区]` | 论坛/Issue/技术博客经验 |
| `[推测]` | 未经验证的推断 |
| `[设计决策]` | 经讨论确认的主动设计选择 |

---

## 附录 B：ChatGLM 建议采纳清单

| 建议 | 采纳状态 | 落点 |
|------|----------|------|
| `tools` 字段明确为建议性契约 | ✅ 采纳 | §3.2 字段说明 |
| 新增 `permissions` 字段 | ✅ 采纳 | §3.2 Frontmatter |
| 新增 `preferred_mode` 字段 | ✅ 采纳 | §3.2 Frontmatter |
| 新增 `context_priority` 字段 | ✅ 采纳 | §3.2 Frontmatter |
| 新增 `requires_mcp` 字段 | ✅ 采纳 | §3.2 Frontmatter |
| LLM-as-a-Judge 测试断言 | ✅ 采纳 | §4 测试规范 |
| CLI 工具开发 | ✅ 采纳 (Phase 3) | §5 Phase 3 |
| 技能市场 Web UI | ✅ 采纳 (Phase 4) | §5 Phase 4 |
| VS Code 扩展 | ✅ 采纳 (Phase 3) | §5 Phase 3 |
| 三阶段全路线 | ⚠️ 调整为四阶段 | §5 分阶段路线图 |