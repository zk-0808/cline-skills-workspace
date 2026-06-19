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
  // 兼容 LF 和 CRLF 行尾（Windows 编辑器常见）
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  
  const lines = match[1].split(/\r?\n/);
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
      if (desc.length < 30) {
        errors.push(`[${skillName}] description 过短 (${desc.length} 字符，至少 30)`);
      }
      if (desc.length > 200) {
        warnings.push(`[${skillName}] description 过长 (${desc.length} 字符，建议 ≤ 200)`);
      }
      // 中文动词常见字
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

/**
 * 校验 .clinerules 不含本机化字符串（开发者层污染检查）。
 *
 * 命中 ERROR 的字符串：
 *   - 绝对路径（含盘符）
 *   - Shell 具体路径/版本（pwsh.exe / PowerShell 7 等）
 *   - 本机环境特定（GBK 936 / Windows 11 中文系统 / Set-ExecutionPolicy 等）
 *   - 环境变量占位符（%APPDATA% / %USERPROFILE% 等 — 仅限 cmd 风格）
 */
function validateClinerules() {
  const clinerulesPath = path.join(__dirname, '..', '.clinerules');
  if (!fs.existsSync(clinerulesPath)) {
    warnings.push('[.clinerules] 文件不存在，跳过本机化检查');
    return;
  }

  const content = fs.readFileSync(clinerulesPath, 'utf8');
  const lines = content.split(/\r?\n/);

  // 绝对路径正则（Windows 盘符 + Unix 根路径）
  const absPathPattern = /[A-Za-z]:[\\\\/][^\s`"')]*/;

  // 本机化禁词（命中即 ERROR）
  // 注意：不包含 Set-ExecutionPolicy — 规范 7 中作为通用指引提及是合理的（"若报错，提示用户执行..."）
  const forbidden = [
    { pattern: /pwsh\.exe/i, desc: 'Shell 可执行文件名 pwsh.exe（若为通用指引，用"PowerShell"即可）' },
    { pattern: /GBK\s*936/, desc: '本机代码页 GBK 936' },
    { pattern: /Windows 11 中文系统/, desc: '本机系统描述（Windows 11 中文系统）' },
    { pattern: /%APPDATA%/, desc: 'cmd 风格环境变量 %APPDATA%' },
    { pattern: /%USERPROFILE%/, desc: 'cmd 风格环境变量 %USERPROFILE%' },
    { pattern: /terminal\.integrated\.defaultProfile\.windows/, desc: 'VS Code settings.json 本机 Shell 配置 key' },
    { pattern: /19936/, desc: '本机用户名 19936' },
    { pattern: /23\.04\.0/, desc: '本机 Node 小版本号' },
    { pattern: /v24\.15/i, desc: '本机 Node 精确版本号 v24.15' },
  ];

  // 检查每行
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // 跳过注释行和空行（注释行允许引用规范编号，如 "规范 7 本机规则"）
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 检查绝对路径（但跳过规范 7 中"DEV_NOTES.md"这类无害引用）
    const absMatch = line.match(absPathPattern);
    if (absMatch) {
      errors.push(`[.clinerules:${lineNum}] 含绝对路径 "${absMatch[0]}" — 应放入 DEV_NOTES.md`);
      continue; // 不再报同行的禁词
    }

    // 检查禁词
    for (const f of forbidden) {
      if (f.pattern.test(line)) {
        errors.push(`[.clinerules:${lineNum}] 含本机化内容 (${f.desc}) — 应放入 DEV_NOTES.md`);
        break; // 每行只报一次
      }
    }
  }
}

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
  
  // 额外校验：.clinerules 不含本机化污染
  validateClinerules();

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
