// Validate and publish repository-authored Knowledge Base entries to Firestore.
// Usage: npm run knowledge:sync             (writes)
//        npm run knowledge:sync -- --dry-run (validates only)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../src/core/firebase-admin';
import { loadKnowledgeDocuments } from '../src/ai/knowledge-base/source-documents';
import { buildSearchTerms } from '../src/ai/knowledge-base/retriever';
import { KNOWLEDGE_CHUNKS_COLLECTION, KNOWLEDGE_METADATA_COLLECTION } from '../src/ai/knowledge-base/retrieve';

const repoRoot = path.join(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const documents = loadKnowledgeDocuments();
  const entries = documents.map((document) => ({
    ...document,
    published: true,
    managedBy: 'ogeemo-repo-sync',
    searchTerms: buildSearchTerms(document),
    contentHash: crypto.createHash('sha256').update(JSON.stringify(document)).digest('hex'),
  }));
  const version = crypto.createHash('sha256').update(entries.map((entry) => `${entry.id}:${entry.contentHash}`).join('\n')).digest('hex');
  console.log(`Validated ${entries.length} Knowledge Base entries. Version ${version.slice(0, 12)}.`);
  if (process.argv.includes('--dry-run')) return;

  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin is unavailable. Configure service-account credentials before syncing.');
  const collection = db.collection(KNOWLEDGE_CHUNKS_COLLECTION);
  const existing = await collection.where('managedBy', '==', 'ogeemo-repo-sync').get();
  const sourceIds = new Set(entries.map((entry) => entry.id));
  const stale = existing.docs.filter((doc) => !sourceIds.has(doc.id));
  const batch = db.batch();
  for (const entry of entries) {
    batch.set(collection.doc(entry.id), { ...entry, updatedAt: FieldValue.serverTimestamp() });
  }
  for (const doc of stale) batch.delete(doc.ref);
  batch.set(db.collection(KNOWLEDGE_METADATA_COLLECTION).doc('current'), {
    version,
    documentCount: entries.length,
    managedBy: 'ogeemo-repo-sync',
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  console.log(`Published ${entries.length} entries; removed ${stale.length} stale managed entries.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
