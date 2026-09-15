/**
 * Firestore diagnostic: dump the real folder catalog and look for the
 * co-pilot test contacts to see exactly what orgId/folderId they got.
 * Run: node --env-file=.env.local --import tsx tmp/diag-firestore.ts
 */
import { getAdminDb } from '../src/core/firebase-admin';
import fs from 'fs';

async function main() {
  const db = getAdminDb();
  if (!db) throw new Error('Admin DB not available');

  const folders = await db.collection('contactFolders').get();
  console.log(`=== contactFolders (${folders.size}) ===`);
  folders.forEach((d) => {
    const data = d.data();
    console.log(JSON.stringify({ id: d.id, name: data.name ?? null, orgId: data.orgId ?? null }));
  });

  const names = ['Joe Blow', 'Sam Sneed', 'Nick Illiopoulos', 'Jane Roe'];
  const contacts = await db.collection('contacts').where('name', 'in', names).get();
  console.log(`=== test contacts (${contacts.size}) ===`);
  contacts.forEach((d) => {
    const data = d.data();
    console.log(JSON.stringify({
      id: d.id,
      name: data.name ?? null,
      email: data.email ?? null,
      orgId: data.orgId ?? null,
      folderId: data.folderId ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: data.createdAt?.toDate?.().toISOString?.() ?? data.createdAt ?? null,
    }));
  });

  const recent = await db.collection('contacts').limit(200).get();
  console.log(`=== total contacts scanned: ${recent.size} ===`);
  recent.forEach((d) => {
    const data = d.data();
    console.log(JSON.stringify({
      id: d.id,
      name: data.name ?? null,
      orgId: data.orgId ?? null,
      folderId: data.folderId ?? null,
    }));
  });

  const emails = ['nick.iliopoulos@gmail.com', 'nick@ogeemo.com'];
  for (const email of emails) {
    const usersSnap = await db.collection('users').where('email', '==', email).get();
    for (const d of usersSnap.docs) {
      const data = d.data();
      console.log(`=== user profile ${email} ===`);
      console.log(JSON.stringify({ uid: d.id, orgId: data.orgId ?? null, accessLevel: data.accessLevel ?? null }));
      const { getAdminAuth } = await import('../src/core/firebase-admin');
      const authUser = await getAdminAuth()?.getUserByEmail(email).catch(() => null);
      if (authUser) {
        console.log(JSON.stringify({ customClaims: authUser.customClaims ?? {} }));
      }
    }
  }

  const sessions = await db.collection('userAssistantChatSessions').get();
  console.log(`=== chat sessions (${sessions.size}) ===`);
  for (const d of sessions.docs) {
    const data = d.data();
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const flat = JSON.stringify(messages);
    if (flat.includes('John Test')) {
      console.log(`userId: ${d.id} — thread containing 'John Test'`);
      fs.writeFileSync('tmp/john-test-thread.json', JSON.stringify(messages, null, 2));
      console.log('full thread written to tmp/john-test-thread.json');
      console.log('roles:', messages.map((m: any) => m.role[0]).join(''));
    }
  }
}

main().catch((error) => {
  console.error('DIAG FAILED:', error);
  process.exit(1);
});