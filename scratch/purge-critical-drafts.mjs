import fs from 'node:fs';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const CRITICALITY_FILTER = (process.env.GUIDE_CRITICALITY ?? 'critical').toLowerCase();

function parseCsvLine(line) {
  const values = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
      continue;
    }

    if (ch === ',' && !inQ) {
      values.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  values.push(cur.trim());
  return values;
}

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const rows = fs.readFileSync('docs/guides/coverage-matrix.csv', 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(rows[0]);
const idx = {
  module: header.indexOf('module'),
  intent: header.indexOf('intent'),
  criticality: header.indexOf('criticality'),
  status: header.indexOf('status'),
};

const ids = [];
for (let i = 1; i < rows.length; i += 1) {
  const c = parseCsvLine(rows[i]);
  if (
    (c[idx.status] || '').toLowerCase() === 'draft' &&
    (c[idx.criticality] || '').toLowerCase() === CRITICALITY_FILTER
  ) {
    ids.push(`${c[idx.module]}--${c[idx.intent]}`);
  }
}

const uniqueIds = [...new Set(ids)];
let totalDeleted = 0;

for (const guideId of uniqueIds) {
  const snap = await db.collection('help_guides').where('guideId', '==', guideId).get();
  if (snap.empty) {
    continue;
  }

  let batch = db.batch();
  let opCount = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    opCount += 1;
    totalDeleted += 1;

    if (opCount === 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`purged ${guideId}: ${snap.size}`);
}

console.log(`${CRITICALITY_FILTER} draft guideIds: ${uniqueIds.length}`);
console.log(`total deleted: ${totalDeleted}`);
