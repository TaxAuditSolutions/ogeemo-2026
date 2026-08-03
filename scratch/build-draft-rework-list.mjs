import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const matrixPath = path.join(root, 'docs/guides/coverage-matrix.csv');
const criticalReportPath = path.join(root, 'docs/guides/verification-report-critical-draft.md');
const importantReportPath = path.join(root, 'docs/guides/verification-report-important-draft.md');
const outPath = path.join(root, 'docs/guides/draft-rework-list-2026-07-22.csv');

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function csvEscape(value) {
  const s = (value ?? '').toString();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseFailureReasons(md) {
  const lines = md.split(/\r?\n/);
  const reasons = new Map();
  let currentKey = null;
  for (const line of lines) {
    const failMatch = line.match(/^- \[FAIL\] ([^:]+)::(.+)$/);
    if (failMatch) {
      const moduleName = failMatch[1].trim();
      const intent = failMatch[2].trim();
      currentKey = `${moduleName}::${intent}`;
      continue;
    }
    if (currentKey) {
      const reasonMatch = line.match(/^  - Reason: (.+)$/);
      if (reasonMatch) {
        reasons.set(currentKey, reasonMatch[1].trim());
        currentKey = null;
      }
    }
  }
  return reasons;
}

const matrixRaw = fs.readFileSync(matrixPath, 'utf8');
const matrixLines = matrixRaw.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(matrixLines[0]);
const idx = {
  domain: header.indexOf('domain'),
  module: header.indexOf('module'),
  intent: header.indexOf('intent'),
  targetAudience: header.indexOf('targetAudience'),
  criticality: header.indexOf('criticality'),
  status: header.indexOf('status'),
  owner: header.indexOf('owner'),
  sourceGuideId: header.indexOf('sourceGuideId'),
};

const criticalReasons = parseFailureReasons(fs.readFileSync(criticalReportPath, 'utf8'));
const importantReasons = parseFailureReasons(fs.readFileSync(importantReportPath, 'utf8'));
const allReasons = new Map([...criticalReasons, ...importantReasons]);

function focusFromReason(reason, moduleName, intent) {
  const base = reason.toLowerCase();
  if (base.includes('missing or insufficient context')) {
    return `Add module-specific UI path, required preconditions, and concrete field values for ${moduleName}/${intent}`;
  }
  if (base.includes('long-form procedural response')) {
    return `Tighten guide to one canonical workflow with explicit step order for ${moduleName}/${intent}`;
  }
  return `Improve step fidelity and troubleshooting detail for ${moduleName}/${intent}`;
}

const outHeader = [
  'domain',
  'module',
  'intent',
  'targetAudience',
  'criticality',
  'status',
  'owner',
  'sourceGuideId',
  'verificationReason',
  'reworkFocus',
];
const outRows = [];

for (const line of matrixLines.slice(1)) {
  const row = parseCsvLine(line);
  const status = (row[idx.status] || '').trim().toLowerCase();
  if (status !== 'draft') continue;

  const moduleName = (row[idx.module] || '').trim();
  const intent = (row[idx.intent] || '').trim();
  const key = `${moduleName}::${intent}`;
  const reason = allReasons.get(key) || 'not found in reports';
  const focus = focusFromReason(reason, moduleName, intent);

  outRows.push([
    row[idx.domain] || '',
    moduleName,
    intent,
    row[idx.targetAudience] || '',
    row[idx.criticality] || '',
    row[idx.status] || '',
    row[idx.owner] || '',
    row[idx.sourceGuideId] || '',
    reason,
    focus,
  ]);
}

outRows.sort((a, b) => {
  const kA = `${a[4]}|${a[1]}|${a[2]}`;
  const kB = `${b[4]}|${b[1]}|${b[2]}`;
  return kA.localeCompare(kB);
});

const csv = [outHeader, ...outRows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';
fs.writeFileSync(outPath, csv, 'utf8');

const byModule = new Map();
for (const r of outRows) {
  byModule.set(r[1], (byModule.get(r[1]) || 0) + 1);
}
const topModules = [...byModule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

console.log('Draft rows exported:', outRows.length);
console.log('Output file:', outPath);
console.log('Top modules with remaining drafts:');
for (const [m, c] of topModules) {
  console.log(`- ${m}: ${c}`);
}
