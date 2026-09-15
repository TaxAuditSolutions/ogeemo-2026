/**
 * Verification: did the latest co-pilot tests produce saved contacts, and what
 * does the latest thread activity look like?
 * Run: node --env-file=.env.local --import tsx tmp/verify-e2e.ts
 */
import { getAdminDb } from '../src/core/firebase-admin';
import fs from 'fs';

async function main() {
  const db = getAdminDb();
  if (!db) throw new Error('Admin DB not available');

  const contacts = await db.collection('contacts').get();
  console.log(`=== contacts (${contacts.size}) ===`);
  const interesting = contacts.docs.filter((d) => {
    const name = String(d.data().name ?? '');
    return /john|joe|bill|sam|alice|jane|nick/i.test(name);
  });
  if (interesting.length === 0) console.log('no test contacts saved yet');
  interesting.forEach((d) => {
    const data = d.data();
    console.log(JSON.stringify({
      id: d.id,
      name: data.name ?? null,
      email: data.email ?? null,
      orgId: data.orgId ?? null,
      folderId: data.folderId ?? null,
      createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
    }));
  });

  const sessions = await db.collection('userAssistantChatSessions').get();
  for (const d of sessions.docs) {
    const data = d.data();
    const threads = Array.isArray(data.threads) ? data.threads : [];
    console.log(`session ${d.id}: ${threads.length} thread(s)`);
    for (const t of threads) {
      const messages = Array.isArray(t.messages) ? t.messages : [];
      const flat = JSON.stringify(messages);
      if (!flat.includes('John Test') && !flat.includes('Joe Blow')) continue;
      console.log(`  thread "${t.title}" (${t.id}): ${messages.length} messages`);
      const last = messages[messages.length - 1];
      console.log(`    last: [${last.role}] ${String(last.content).substring(0, 80)}`);
      console.log(`    last action: ${last.action ? JSON.stringify(last.action) : 'none'}`);
      const withActions = messages.filter((m: any) => m.action).length;
      console.log(`    messages with actions: ${withActions}`);
      const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
      if (lastUser) console.log(`    last user msg: "${String(lastUser.content).substring(0, 120)}"`);
    }
  }
}

main().catch((error) => {
  console.error('VERIFY FAILED:', error);
  process.exit(1);
});