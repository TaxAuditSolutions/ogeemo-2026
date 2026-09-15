/**
 * Housekeeping: (1) backs up and deletes the garbage contact created by the
 * pre-fix co-pilot fallback ("form john white, ..." saved as a whole name),
 * (2) reports the count of orphan contactFolders with orgId: null (no deletion).
 * Run: node --env-file=.env.local --import tsx tmp/cleanup-housekeeping.ts
 */
import { getAdminDb } from '../src/core/firebase-admin';

async function main() {
  const db = getAdminDb();
  if (!db) throw new Error('Admin DB not available');

  const garbageId = 'ZfVSZXuui67YtWRTrwRY';
  const garbageRef = db.collection('contacts').doc(garbageId);
  const garbageSnap = await garbageRef.get();
  if (garbageSnap.exists) {
    console.log('=== BACKUP of garbage contact before deletion ===');
    console.log(JSON.stringify({ id: garbageSnap.id, ...garbageSnap.data() }, null, 2));
    await garbageRef.delete();
    const verify = await garbageRef.get();
    console.log('deleted:', !verify.exists);
  } else {
    console.log('garbage contact already gone');
  }

  const folders = await db.collection('contactFolders').get();
  const orphanFolders = folders.docs.filter((d) => !d.data().orgId);
  console.log(`=== contactFolders: ${folders.size} total, ${orphanFolders.length} orphans (orgId: null, invisible to all org queries — left in place) ===`);

  const contacts = await db.collection('contacts').get();
  const orphanContacts = contacts.docs.filter((d) => !d.data().orgId);
  console.log(`=== contacts: ${contacts.size} total, ${orphanContacts.length} orphans (orgId: null) ===`);
  orphanContacts.forEach((d) => console.log('ORPHAN CONTACT:', JSON.stringify({ id: d.id, name: d.data().name ?? null })));
}

main().catch((error) => {
  console.error('CLEANUP FAILED:', error);
  process.exit(1);
});