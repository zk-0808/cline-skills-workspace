#!/usr/bin/env node
// 分析 Cline 最近 N 个 task 的上下文用量
// 用法: node tools/analyze-recent-tasks.mjs [n=5] [skipCurrent=1]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const N = Number(process.argv[2] ?? 5);
const SKIP_CURRENT = Number(process.argv[3] ?? 1); // 跳过最新的 N 个（默认跳过当前会话）

const TASKS_DIR = path.join(
  process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'),
  'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks'
);

if (!fs.existsSync(TASKS_DIR)) {
  console.error('Tasks dir not found:', TASKS_DIR);
  process.exit(1);
}

const dirs = fs.readdirSync(TASKS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => {
    const p = path.join(TASKS_DIR, d.name);
    const stat = fs.statSync(p);
    return { id: d.name, path: p, mtime: stat.mtimeMs };
  })
  .sort((a, b) => b.mtime - a.mtime);

const targets = dirs.slice(SKIP_CURRENT, SKIP_CURRENT + N);

console.log(`Tasks dir: ${TASKS_DIR}`);
console.log(`Total tasks: ${dirs.length}, analyzing ${targets.length} (skipped ${SKIP_CURRENT} latest)\n`);

const results = [];

for (const t of targets) {
  const uiPath = path.join(t.path, 'ui_messages.json');
  const apiPath = path.join(t.path, 'api_conversation_history.json');
  const metaPath = path.join(t.path, 'task_metadata.json');

  const uiSize = fs.existsSync(uiPath) ? fs.statSync(uiPath).size : 0;
  const apiSize = fs.existsSync(apiPath) ? fs.statSync(apiPath).size : 0;

  let ui = [];
  try { ui = JSON.parse(fs.readFileSync(uiPath, 'utf8')); } catch { ui = []; }

  // 提取 api_req_started 消息（包含 tokensIn/tokensOut/cacheWrites/cacheReads）
  const apiReqs = [];
  let firstUserText = '';
  let firstTaskTs = null;
  let lastTs = null;

  for (const m of ui) {
    if (firstTaskTs == null) firstTaskTs = m.ts;
    lastTs = m.ts;
    if (m.type === 'say' && m.say === 'task' && !firstUserText) {
      firstUserText = (m.text ?? '').slice(0, 100).replace(/\s+/g, ' ');
    }
    if (m.type === 'say' && m.say === 'api_req_started' && m.text) {
      try {
        const info = JSON.parse(m.text);
        apiReqs.push({
          ts: m.ts,
          tokensIn: info.tokensIn ?? 0,
          tokensOut: info.tokensOut ?? 0,
          cacheWrites: info.cacheWrites ?? 0,
          cacheReads: info.cacheReads ?? 0,
          cost: info.cost ?? 0,
          cancelReason: info.cancelReason ?? null,
        });
      } catch {}
    }
  }

  // 峰值上下文 ≈ 最后一次成功 api_req 的 tokensIn + cacheReads + cacheWrites
  // （Anthropic 计费下：实际窗口 ≈ tokensIn + cacheReads + cacheWrites，因为 cache 命中部分仍占窗口）
  const peakReq = apiReqs.length ? apiReqs[apiReqs.length - 1] : null;
  const peakContext = peakReq
    ? peakReq.tokensIn + peakReq.cacheReads + peakReq.cacheWrites
    : 0;

  // 累计 token / cost
  const sumIn = apiReqs.reduce((s, r) => s + r.tokensIn, 0);
  const sumOut = apiReqs.reduce((s, r) => s + r.tokensOut, 0);
  const sumCacheR = apiReqs.reduce((s, r) => s + r.cacheReads, 0);
  const sumCacheW = apiReqs.reduce((s, r) => s + r.cacheWrites, 0);
  const sumCost = apiReqs.reduce((s, r) => s + r.cost, 0);

  results.push({
    id: t.id,
    mtime: new Date(t.mtime).toISOString(),
    durationMin: firstTaskTs && lastTs ? ((lastTs - firstTaskTs) / 60000).toFixed(1) : 'N/A',
    firstUserText,
    uiMessages: ui.length,
    apiReqs: apiReqs.length,
    peakContextTokens: peakContext,
    sumTokensIn: sumIn,
    sumTokensOut: sumOut,
    sumCacheReads: sumCacheR,
    sumCacheWrites: sumCacheW,
    sumCostUSD: sumCost.toFixed(4),
    uiFileKB: (uiSize / 1024).toFixed(1),
    apiFileKB: (apiSize / 1024).toFixed(1),
  });
}

// 表格输出
console.log('=== 详细数据 ===\n');
for (const r of results) {
  console.log(`[Task ${r.id}]  ${r.mtime}`);
  console.log(`  首条任务: "${r.firstUserText}..."`);
  console.log(`  时长: ${r.durationMin} 分钟  |  UI 消息: ${r.uiMessages}  |  API 请求: ${r.apiReqs}`);
  console.log(`  峰值上下文: ${r.peakContextTokens.toLocaleString()} tokens  (最后一次 API 请求时)`);
  console.log(`  累计 tokensIn: ${r.sumTokensIn.toLocaleString()}  tokensOut: ${r.sumTokensOut.toLocaleString()}`);
  console.log(`  累计 cacheReads: ${r.sumCacheReads.toLocaleString()}  cacheWrites: ${r.sumCacheWrites.toLocaleString()}`);
  console.log(`  累计成本: $${r.sumCostUSD}  |  ui_messages.json: ${r.uiFileKB} KB  |  api_history: ${r.apiFileKB} KB`);
  console.log();
}

// 汇总
const totals = results.reduce((acc, r) => ({
  peakSum: acc.peakSum + r.peakContextTokens,
  sumIn: acc.sumIn + r.sumTokensIn,
  sumOut: acc.sumOut + r.sumTokensOut,
  sumCacheR: acc.sumCacheR + r.sumCacheReads,
  sumCacheW: acc.sumCacheW + r.sumCacheWrites,
  cost: acc.cost + Number(r.sumCostUSD),
  apiReqs: acc.apiReqs + r.apiReqs,
}), { peakSum: 0, sumIn: 0, sumOut: 0, sumCacheR: 0, sumCacheW: 0, cost: 0, apiReqs: 0 });

console.log('=== 汇总 ===');
console.log(`  会话数: ${results.length}`);
console.log(`  峰值上下文均值: ${Math.round(totals.peakSum / results.length).toLocaleString()} tokens`);
console.log(`  峰值上下文最大: ${Math.max(...results.map(r => r.peakContextTokens)).toLocaleString()} tokens`);
console.log(`  峰值上下文最小: ${Math.min(...results.map(r => r.peakContextTokens)).toLocaleString()} tokens`);
console.log(`  累计 API 请求: ${totals.apiReqs}`);
console.log(`  累计 tokensIn:  ${totals.sumIn.toLocaleString()}`);
console.log(`  累计 tokensOut: ${totals.sumOut.toLocaleString()}`);
console.log(`  累计 cacheReads:  ${totals.sumCacheR.toLocaleString()}`);
console.log(`  累计 cacheWrites: ${totals.sumCacheW.toLocaleString()}`);
console.log(`  累计成本: $${totals.cost.toFixed(4)}`);