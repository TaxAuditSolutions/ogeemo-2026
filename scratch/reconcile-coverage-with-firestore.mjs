import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local', quiet: true });

const csvPath = path.join(process.cwd(), 'docs/guides/coverage-matrix.csv');
const backupPath = path.join(
  process.cwd(),
  `docs/guides/coverage-matrix.backup-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
);

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!saRaw) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(saRaw);
} catch (e) {
  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

function parseCsvLine(line) {
  const out = [];
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
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function toCsvLine(fields) {
  return fields
    .map((v) => {
      const s = (v ?? '').toString();
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join(',');
}

const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
if (lines.length < 2) {
  console.error('coverage-matrix.csv appears empty');
  process.exit(1);
}

const header = parseCsvLine(lines[0]);
const idx = {
  module: header.indexOf('module'),
  intent: header.indexOf('intent'),
  status: header.indexOf('status'),
  owner: header.indexOf('owner'),
  sourceGuideId: header.indexOf('sourceGuideId'),
};

for (const [k, v] of Object.entries(idx)) {
  if (v < 0) {
    console.error(`Missing required column: ${k}`);
    process.exit(1);
  }
}

const rows = lines.slice(1).map(parseCsvLine);
const missingRows = rows.filter((r) => (r[idx.status] || '').trim().toLowerCase() === 'missing');

const snap = await db.collection('help_guides').where('source.targetUrl', '==', 'coverage-matrix').get();
const ingestedGuideIds = new Set();
for (const doc of snap.docs) {
  const d = doc.data();
  if (typeof d?.guideId === 'string' && d.guideId.trim()) {
    ingestedGuideIds.add(d.guideId.trim());
  }
}

let promoted = 0;
let stillMissing = 0;
const notFound = [];

for (const row of rows) {
  const status = (row[idx.status] || '').trim().toLowerCase();
  if (status !== 'missing') continue;

  const moduleVal = (row[idx.module] || '').trim();
  const intentVal = (row[idx.intent] || '').trim();
  const existingGuideId = (row[idx.sourceGuideId] || '').trim();
  const derivedGuideId = `${moduleVal}--${intentVal}`;
  const candidateGuideId = existingGuideId || derivedGuideId;

  if (ingestedGuideIds.has(candidateGuideId)) {
    row[idx.status] = 'draft';
    if (!existingGuideId) row[idx.sourceGuideId] = candidateGuideId;
    if (!(row[idx.owner] || '').trim()) row[idx.owner] = 'copilot-auto-ingest';
    promoted += 1;
  } else {
    stillMissing += 1;
    notFound.push(candidateGuideId);
  }
}

fs.copyFileSync(csvPath, backupPath);
const out = [toCsvLine(header), ...rows.map(toCsvLine)].join('\n') + '\n';
fs.writeFileSync(csvPath, out, 'utf8');

console.log('Firestore coverage-matrix documents scanned:', snap.size);
console.log('Distinct guideIds found:', ingestedGuideIds.size);
console.log('Missing rows checked:', missingRows.length);
console.log('Rows promoted missing -> draft:', promoted);
console.log('Rows still missing:', stillMissing);
console.log('Backup written:', backupPath);
if (notFound.length > 0) {
  console.log('Sample not found guideIds:', notFound.slice(0, 15).join(', '));
}
