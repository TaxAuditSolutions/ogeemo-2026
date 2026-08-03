import fs from 'node:fs/promises';
import path from 'node:path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const escaped = inQuotes && line[i + 1] === '"';
      if (escaped) {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

async function loadTargetGuideIds() {
  const csvPath = path.join(process.cwd(), 'docs', 'guides', 'coverage-matrix.csv');
  const raw = await fs.readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const head = parseCsvLine(lines[0]);
  const idx = {
    domain: head.indexOf('domain'),
    module: head.indexOf('module'),
    intent: head.indexOf('intent'),
    status: head.indexOf('status'),
  };

  const ids = [];
  for (let i = 1; i < lines.length; i += 1) {
    const c = parseCsvLine(lines[i]);
    const domain = (c[idx.domain] || '').toLowerCase();
    const module = (c[idx.module] || '').toLowerCase();
    const intent = c[idx.intent] || '';
    const status = (c[idx.status] || '').toLowerCase();

    if (domain === 'assistant' && module === 'knowledge' && status === 'draft') {
      ids.push(`${module}--${intent}`);
    }
  }

  return Array.from(new Set(ids));
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }

  const db = getFirestore();
  const guideIds = await loadTargetGuideIds();

  if (guideIds.length === 0) {
    console.log('No assistant/knowledge draft guideIds found to purge.');
    return;
  }

  let totalDeleted = 0;

  for (const guideId of guideIds) {
    const snap = await db.collection('help_guides').where('guideId', '==', guideId).get();
    if (snap.empty) {
      console.log(`No docs found for ${guideId}`);
      continue;
    }

    let batch = db.batch();
    let opCount = 0;
    let deletedForGuide = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      opCount += 1;
      deletedForGuide += 1;
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

    console.log(`Purged ${deletedForGuide} docs for ${guideId}`);
  }

  console.log(`GuideIds processed: ${guideIds.length}`);
  console.log(`Total docs deleted: ${totalDeleted}`);
}

main().catch((err) => {
  console.error('Failed to purge guide docs:', err);
  process.exit(1);
});
