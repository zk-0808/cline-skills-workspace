#!/usr/bin/env node
// 用法：node tools/inspect-task-window.mjs <task-id> [start-iso] [end-iso]
// 默认输出指定 task 中所有 tool_use / tool_result / ask / say 消息（按 ts 升序），含时间戳

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const taskId = process.argv[2];
const startIso = process.argv[3];
const endIso = process.argv[4];

if (!taskId) {
  console.error('Usage: node tools/inspect-task-window.mjs <task-id> [start-iso] [end-iso]');
  process.exit(1);
}

const TASKS_DIR = path.join(
  process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'),
  'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks'
);

const uiPath = path.join(TASKS_DIR, taskId, 'ui_messages.json');
if (!fs.existsSync(uiPath)) {
  console.error('ui_messages.json not found:', uiPath);
  process.exit(1);
}

const startMs = startIso ? Date.parse(startIso) : -Infinity;
const endMs = endIso ? Date.parse(endIso) : Infinity;

const ui = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
console.log(`Task ${taskId}: ${ui.length} ui messages\n`);

let count = 0;
for (const m of ui) {
  if (m.ts < startMs || m.ts > endMs) continue;
  count++;
  const ts = new Date(m.ts).toISOString().replace('T', ' ').slice(0, 19);
  const tsLocal = new Date(m.ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const kind = m.type === 'say' ? `say.${m.say}` : `ask.${m.ask}`;

  // 截断 text，但 tool / api_req_started 完整显示
  let text = m.text ?? '';
  const isImportant = m.say === 'tool' || m.say === 'api_req_started' || m.ask === 'tool' || m.ask === 'command';
  if (!isImportant && text.length > 200) text = text.slice(0, 200) + '…';

  console.log(`[${tsLocal}] [${kind}]`);
  if (text) console.log(text);
  if (m.images?.length) console.log(`  (+${m.images.length} images)`);
  console.log();
}

console.log(`\n=== 共输出 ${count} 条消息（窗口 ${startIso ?? '不限'} ~ ${endIso ?? '不限'}） ===`);