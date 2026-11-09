// Finds contacts orphaned by an earlier folder delete and (optionally) deletes the safe ones.
//
//   npm run contacts:orphans                          report only, every workspace (read-only)
//   npm run contacts:orphans -- --org <orgId> --apply  delete the safe ones in ONE workspace
//
// An orphan is a contact whose folderId points at a folder that no longer exists, so it only ever shows
// under "Unassigned". It is deleted only when nothing needs it. Held back, and listed with the reason:
//   - work still names it (tasks, projects, quotes, invoices, work orders, time logs, leave, inventory)
//   - a sign-in account is linked to it
//   - it carries worker or HR data (worker type, pay, SIN, employee number): someone should decide
// Contacts with a blank folder, or whose folder belongs to another workspace, are reported, never deleted.
// Every deleted contact is first written to scratch/orphan-contacts-backup-<time>.json.
import fs from 'node:fs';
import path from 'node:path';
import { getAdminDb } from '../src/core/firebase-admin';
import { CONTACT_REFERENCES, chunkItems } from '../src/lib/contact-merge';
import { classifyOrphans } from '../src/lib/orphan-contacts';

const repoRoot = path.join(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const argValue = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin is unavailable. Configure service-account credentials first.');
  const apply = process.argv.includes('--apply');
  const onlyOrg = argValue('--org');
  if (apply && !onlyOrg) throw new Error('--apply needs --org <orgId>, so one workspace is cleaned at a time.');

  const [folderSnap, contactSnap, userSnap] = await Promise.all([
    db.collection('contactFolders').get(),
    db.collection('contacts').get(),
    db.collection('users').get(),
  ]);
  const folders = folderSnap.docs.map((d) => ({ id: d.id, orgId: d.data().orgId as string | undefined }));
  const contacts = contactSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
  const linkedUsers = new Map<string, string>();
  userSnap.forEach((u) => { const c = u.data().contactId; if (c) linkedUsers.set(c, u.data().displayName || u.data().email || u.id); });

  // Which contact ids are named by work, per collection (one read per collection, not per contact).
  const workLinks = new Map<string, Record<string, number>>();
  for (const reference of CONTACT_REFERENCES) {
    const snap = await db.collection(reference.collection).get();
    const seen = new Set<string>();
    snap.forEach((doc) => {
      const value = doc.data()[reference.field];
      if (typeof value !== 'string' || !value) return;
      const key = `${value}|${reference.collection}|${doc.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const counts = workLinks.get(value) ?? {};
      counts[reference.collection] = (counts[reference.collection] ?? 0) + 1;
      workLinks.set(value, counts);
    });
  }

  console.log(`Scanned ${contacts.length} contacts, ${folders.length} folders, ${userSnap.size} sign-in accounts and ${workLinks.size} contacts named by work.`);
  const result = classifyOrphans(contacts, folders, Object.fromEntries(workLinks), Object.fromEntries(linkedUsers));
  const orgs = Array.from(new Set(result.map((r) => r.orgId))).sort();
  for (const org of orgs) {
    if (onlyOrg && org !== onlyOrg) continue;
    const rows = result.filter((r) => r.orgId === org);
    console.log(`\n=== workspace ${org}: ${rows.length} contact(s) without a valid folder ===`);
    for (const row of rows) {
      console.log(`  ${row.action.toUpperCase().padEnd(8)} ${row.kind.padEnd(14)} ${row.name || '(no name)'}  [${row.id}]${row.reason ? '  - ' + row.reason : ''}`);
    }
  }

  if (!apply) {
    const del = result.filter((r) => r.action === 'delete' && (!onlyOrg || r.orgId === onlyOrg)).length;
    console.log(`\nReport only. ${del} contact(s) would be deleted. Nothing was changed.`);
    return;
  }

  const toDelete = result.filter((r) => r.action === 'delete' && r.orgId === onlyOrg);
  if (toDelete.length === 0) { console.log('\nNothing to delete.'); return; }
  const backupPath = path.join(repoRoot, 'scratch', `orphan-contacts-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  const byId = new Map(contacts.map((c) => [c.id, c]));
  fs.writeFileSync(backupPath, JSON.stringify(toDelete.map((r) => byId.get(r.id)), null, 2));
  console.log(`\nBackup written: ${backupPath}`);

  for (const chunk of chunkItems(toDelete)) {
    const batch = db.batch();
    chunk.forEach((row) => batch.delete(db.collection('contacts').doc(row.id)));
    await batch.commit();
  }
  console.log(`Deleted ${toDelete.length} orphaned contact(s) from ${onlyOrg}.`);
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
