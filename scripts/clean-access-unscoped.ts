// Reads the folders and files that have no workspace (read-only). Used by scripts/clean-access-plan.ts.
import { getAdminDb } from '../src/core/firebase-admin';
import type { FileRow, FolderRow } from '../src/lib/data-cleanup-unscoped';

export interface UnscopedDocs {
  folderRows: FolderRow[];
  fileRows: FileRow[];
  /** Full data of the records that have no workspace (kept for the backup). */
  folders: Map<string, Record<string, any>>;
  files: Map<string, Record<string, any>>;
  /** Ids of those records that some record in another collection mentions, anywhere in its fields. */
  namedElsewhere: Set<string>;
}

const OWN_COLLECTIONS = new Set(['fileManagerFolders', 'files']);

function collectMatches(value: unknown, wanted: ReadonlySet<string>, found: Set<string>, depth = 0): void {
  if (depth > 8 || value === null || value === undefined) return;
  if (typeof value === 'string') { if (wanted.has(value)) found.add(value); return; }
  if (Array.isArray(value)) { value.forEach((v) => collectMatches(v, wanted, found, depth + 1)); return; }
  if (typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((v) => collectMatches(v, wanted, found, depth + 1));
}

export async function gatherUnscoped(): Promise<UnscopedDocs> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin is unavailable.');
  const [folderSnap, fileSnap] = await Promise.all([db.collection('fileManagerFolders').get(), db.collection('files').get()]);
  const folderRows: FolderRow[] = folderSnap.docs.map((d) => ({ id: d.id, parentId: d.data().parentId ?? null, orgId: d.data().orgId ?? null }));
  const fileRows: FileRow[] = fileSnap.docs.map((d) => ({ id: d.id, folderId: d.data().folderId ?? null, orgId: d.data().orgId ?? null }));
  const folders = new Map(folderSnap.docs.filter((d) => !d.data().orgId).map((d) => [d.id, d.data()]));
  const files = new Map(fileSnap.docs.filter((d) => !d.data().orgId).map((d) => [d.id, d.data()]));

  const wanted = new Set([...folders.keys(), ...files.keys()]);
  const namedElsewhere = new Set<string>();
  for (const collection of await db.listCollections()) {
    if (OWN_COLLECTIONS.has(collection.id)) continue;
    const snap = await collection.get();
    snap.forEach((d) => collectMatches(d.data(), wanted, namedElsewhere));
  }
  return { folderRows, fileRows, folders, files, namedElsewhere };
}
