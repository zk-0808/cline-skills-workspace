# 贡献指南

感谢你对 cline-skills-workspace 的关注！本指南将帮助你提交高质量的 Skill。

## 快速开始

```bash
# 1. Fork 本仓库
# 2. 校验你创建的 Skill
node tools/validate-skills.js
# 3. 修复所有 ERROR（WARNING 建议修复）
# 4. 提交 PR
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

参考 `docs/skill-spec.md` 第 5 节。使用 LLM-as-a-Judge 断言格式。

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
- [ ] description 含动词且语义清晰（≥ 30 字符）
- [ ] category 分类正确
- [ ] 正文包含「前置条件」「输入」「输出」「使用示例」
- [ ] SKILL.test.md 至少 2 条语义断言
- [ ] examples/ 至少有 1 个文件
- [ ] 没有硬编码的路径或密钥
- [ ] version 遵循 semver

## 命名规范

- 小写英文 + 连字符
- 动词-名词 或 名词 格式
- 示例: `systematic-debugging`, `writing-plans`, `pptx`
- 目录名必须与 SKILL.md 中 `name` 字段完全一致

## 测试要求

每个 SKILL.test.md 必须包含：

1. **正常输入测试** — 标准场景，验证核心功能
2. **异常输入测试** — 空输入、错误格式等
3. **边界值测试**（推荐）— 极大/极小输入

使用 LLM-as-a-Judge 断言格式（详见 `docs/skill-spec.md` §5）。

## License

本项目采用 MIT 许可证。贡献你的 Skill 即表示你同意将其以 MIT 许可证分发。