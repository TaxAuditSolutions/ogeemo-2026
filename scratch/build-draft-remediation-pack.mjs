import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const matrixPath = path.join(root, 'docs/guides/coverage-matrix.csv');
const reportPaths = [
  path.join(root, 'docs/guides/verification-report-critical-draft.md'),
  path.join(root, 'docs/guides/verification-report-important-draft.md'),
  path.join(root, 'docs/guides/verification-report-critical-draft-rerun-top3.md'),
  path.join(root, 'docs/guides/verification-report-important-draft-rerun-top3.md'),
];
const outCsv = path.join(root, 'docs/guides/draft-remediation-pack-2026-07-22.csv');
const outMd = path.join(root, 'docs/guides/draft-remediation-pack-2026-07-22.md');

function parseCsvLine(line) {
  const vals = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      vals.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  vals.push(cur);
  return vals;
}

function csvEscape(v) {
  const s = (v ?? '').toString();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseReasons(mdText) {
  const lines = mdText.split(/\r?\n/);
  const reasons = new Map();
  let key = null;
  for (const line of lines) {
    const m = line.match(/^- \[(PASS|FAIL)\] ([^:]+)::(.+)$/);
    if (m) {
      key = `${m[2].trim()}::${m[3].trim()}`;
      continue;
    }
    if (key) {
      const r = line.match(/^  - Reason: (.+)$/);
      if (r) {
        reasons.set(key, r[1].trim());
        key = null;
      }
    }
  }
  return reasons;
}

function focusStrategy(moduleName, intent, reason) {
  const low = reason.toLowerCase();
  const base = `Embed explicit UI path, required selections, and concrete field examples for ${moduleName}/${intent}.`;
  if (low.includes('missing or insufficient context')) {
    return `${base} Add one direct troubleshooting branch for no-data and permission failures.`;
  }
  if (low.includes('long-form procedural response')) {
    return `${base} Force a single canonical path and avoid module-ambiguous alternatives.`;
  }
  return `${base} Increase specificity of validations and post-action checks.`;
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

const mergedReasons = new Map();
for (const rp of reportPaths) {
  if (!fs.existsSync(rp)) continue;
  const reasons = parseReasons(fs.readFileSync(rp, 'utf8'));
  for (const [k, v] of reasons.entries()) mergedReasons.set(k, v);
}

const outRows = [];
for (const line of matrixLines.slice(1)) {
  const row = parseCsvLine(line);
  if ((row[idx.status] || '').trim().toLowerCase() !== 'draft') continue;

  const moduleName = (row[idx.module] || '').trim();
  const intent = (row[idx.intent] || '').trim();
  const key = `${moduleName}::${intent}`;
  const reason = mergedReasons.get(key) || 'reason not found';
  const strategy = focusStrategy(moduleName, intent, reason);
  const cluster = reason.toLowerCase().includes('missing or insufficient context')
    ? 'missing-context'
    : reason.toLowerCase().includes('long-form procedural response')
      ? 'ambiguous-procedure'
      : 'other';

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
    cluster,
    strategy,
  ]);
}

outRows.sort((a, b) => {
  const kA = `${a[4]}|${a[1]}|${a[2]}`;
  const kB = `${b[4]}|${b[1]}|${b[2]}`;
  return kA.localeCompare(kB);
});

const outHeader = [
  'domain','module','intent','targetAudience','criticality','status','owner','sourceGuideId','verificationReason','failureCluster','reworkStrategy'
];
const csv = [outHeader, ...outRows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';
fs.writeFileSync(outCsv, csv, 'utf8');

const moduleCounts = new Map();
const clusterCounts = new Map();
for (const r of outRows) {
  moduleCounts.set(r[1], (moduleCounts.get(r[1]) || 0) + 1);
  clusterCounts.set(r[9], (clusterCounts.get(r[9]) || 0) + 1);
}

const topModules = [...moduleCounts.entries()].sort((a,b)=>b[1]-a[1]);
const clusters = [...clusterCounts.entries()].sort((a,b)=>b[1]-a[1]);

const md = [
  '# Draft Remediation Pack (2026-07-22)',
  '',
  `Total draft rows: ${outRows.length}`,
  '',
  '## Failure Clusters',
  ...clusters.map(([k,v]) => `- ${k}: ${v}`),
  '',
  '## Top Modules',
  ...topModules.map(([k,v]) => `- ${k}: ${v}`),
  '',
  `CSV source: ${path.relative(root, outCsv)}`,
].join('\n') + '\n';
fs.writeFileSync(outMd, md, 'utf8');

console.log('Draft rows exported:', outRows.length);
console.log('CSV:', outCsv);
console.log('MD:', outMd);
