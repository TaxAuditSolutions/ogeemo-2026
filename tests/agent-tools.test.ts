import assert from 'node:assert/strict';
import test from 'node:test';

import { searchContactsHandler, searchGlobalHandler, syncReceiptsHandler } from '../src/ai/agent-tools';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

const seed = () => ({
  contacts: {
    c1: { orgId: 'orgA', name: 'Dana Whitfield', email: 'dana@acme.com', businessName: 'Acme', cellPhone: '(705) 555-0142', folderId: 'f1' },
    c2: { orgId: 'orgA', name: 'Daniel Okafor', email: 'dan@okafor.ca' },
    c3: { orgId: 'orgB', name: 'Dana Other-Workspace', email: 'secret@other.com' },
  },
  projects: {
    p1: { orgId: 'orgA', name: 'Website Redesign' },
    p2: { orgId: 'orgB', name: 'Website Redesign (other workspace)' },
  },
});
const ctxA = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });
const pages = [{ label: 'Contacts Hub', href: '/contacts' }, { label: 'Calendar', href: '/calendar' }];

test('the tool context is read from the server context, and odd values become undefined or UTC', () => {
  assert.deepEqual(readToolContext({ userId: ' u1 ', orgId: 'o1', accessLevel: 'viewer', timeZone: 'Asia/Kolkata' }), { userId: 'u1', orgId: 'o1', accessLevel: 'viewer', timeZone: 'Asia/Kolkata' });
  assert.deepEqual(readToolContext(undefined), { userId: undefined, orgId: undefined, accessLevel: undefined, timeZone: 'UTC' });
  assert.equal(readToolContext({ userId: 42, orgId: '  ' }).userId, undefined);
  assert.equal(readToolContext({ userId: 'x' }).orgId, undefined);
});

test('contact search finds people in this workspace only, with their ids, and never another workspace', async () => {
  const result = await searchContactsHandler(fakeDb(seed()), ctxA, { searchTerm: 'dana' });
  assert.equal(result.success, true);
  assert.deepEqual(result.contacts.map((c) => c.id), ['c1']);
  assert.equal(result.contacts[0].email, 'dana@acme.com');
});

test('contact search matches a phone number however it was punctuated, and every word typed', async () => {
  assert.equal((await searchContactsHandler(fakeDb(seed()), ctxA, { searchTerm: '705-555-0142' })).contacts.length, 1);
  assert.equal((await searchContactsHandler(fakeDb(seed()), ctxA, { searchTerm: 'whitfield acme' })).contacts.length, 1);
  assert.equal((await searchContactsHandler(fakeDb(seed()), ctxA, { searchTerm: 'nobody here' })).contacts.length, 0);
});

test('a search with no identity, no workspace, no term or no database says why', async () => {
  const none = readToolContext(undefined);
  assert.match((await searchContactsHandler(fakeDb(seed()), none, { searchTerm: 'a' })).message, /not authenticated/);
  assert.match((await searchContactsHandler(fakeDb(seed()), { ...ctxA, orgId: undefined }, { searchTerm: 'a' })).message, /not authenticated/);
  assert.match((await searchContactsHandler(fakeDb(seed()), ctxA, { searchTerm: '  ' })).message, /Give a name/);
  assert.match((await searchContactsHandler(null, ctxA, { searchTerm: 'a' })).message, /Database not available/);
});

test('a large result list is capped and says so', async () => {
  const contacts: Record<string, any> = {};
  for (let i = 0; i < 45; i++) contacts[`c${i}`] = { orgId: 'orgA', name: `Smith ${i}` };
  const result = await searchContactsHandler(fakeDb({ contacts }), ctxA, { searchTerm: 'smith' });
  assert.equal(result.contacts.length, 20);
  assert.match(result.message, /Found 45 matching contacts; showing the first 20/);
});

test('global search returns pages, this workspace contacts and projects with real ids, and invents nobody', async () => {
  const result = await searchGlobalHandler(fakeDb(seed()), ctxA, pages, { query: 'dan' });
  const labels = result.results.map((r) => r.label);
  assert.deepEqual(labels.sort(), ['Dana Whitfield', 'Daniel Okafor']);
  assert.ok(result.results.every((r) => r.type === 'Contact' && r.id));
  assert.ok(!labels.some((l) => /Administrator|Support/.test(l)));
  const julie = await searchGlobalHandler(fakeDb(seed()), ctxA, pages, { query: 'julie' });
  assert.deepEqual(julie.results, []);
});

test('global search finds pages and projects, and projects from another workspace never appear', async () => {
  const result = await searchGlobalHandler(fakeDb(seed()), ctxA, pages, { query: 'website' });
  assert.deepEqual(result.results.map((r) => [r.type, r.id]), [['Project', 'p1']]);
  assert.equal((result.results[0] as any).href, '/projects/p1/tasks');
  assert.deepEqual((await searchGlobalHandler(fakeDb(seed()), ctxA, pages, { query: 'calendar' })).results.map((r) => r.type), ['Page']);
});

test('without a signed-in workspace only pages are searched, and a failing database is reported not hidden', async () => {
  const guest = await searchGlobalHandler(fakeDb(seed()), readToolContext(undefined), pages, { query: 'dana' });
  assert.deepEqual(guest.results, []);
  const broken = { collection: () => ({ where: () => ({ get: async () => { throw new Error('boom'); } }) }) };
  const result = await searchGlobalHandler(broken as any, ctxA, pages, { query: 'contacts' });
  assert.equal(result.success, true);
  assert.match(result.message, /record search failed/);
  assert.equal(result.results.length, 1);
});

test('the receipt sync refuses a guest, reports an error, and says plainly when Drive is not connected', async () => {
  assert.match((await syncReceiptsHandler(readToolContext(undefined), async () => ({ files: [] }))).message, /not authenticated/);
  assert.equal((await syncReceiptsHandler(ctxA, async () => ({ files: [], error: 'Unauthorized: Session missing.' }))).success, false);
  const empty = await syncReceiptsHandler(ctxA, async () => ({ files: [] }));
  assert.equal(empty.success, true);
  assert.match(empty.message, /not connected yet/);
  const some = await syncReceiptsHandler(ctxA, async () => ({ files: [{ id: 'a', name: 'a.pdf' }] }));
  assert.match(some.message, /Found 1 PDF/);
});
