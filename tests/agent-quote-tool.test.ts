import assert from 'node:assert/strict';
import test from 'node:test';

import { getQuotesHandler } from '../src/ai/agent-quote-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

// Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC).
const NOW = new Date('2026-11-11T15:00:00Z');
const ago = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const ahead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const quote = (over: Record<string, any>) => ({ orgId: 'orgA', companyName: 'Dana Co', contactId: 'cDana', totalAmount: 500, status: 'sent', quoteDate: ago(3), expirationDate: ahead(30), updatedAt: ago(3), notes: 'PRIVATE', ...over });

const seed = () => ({
  users: { u1: {}, uBlocked: { sidebarAccess: { mode: 'blocklist', hiddenMenuItems: ['/accounting/quotes'] } } },
  contacts: { cDana: { orgId: 'orgA', name: 'Dana Whitfield' }, cOther: { orgId: 'orgB', name: 'Elsewhere' } },
  quotes: {
    q1: quote({ quoteNumber: 'QUO-1', status: 'sent', quoteDate: ago(20), updatedAt: ago(20) }),
    q2: quote({ quoteNumber: 'QUO-2', status: 'approved', contactId: 'cAcme', companyName: 'Acme', totalAmount: 1200 }),
    q3: quote({ quoteNumber: 'QUO-3', status: 'invoiced' }),
    q4: quote({ quoteNumber: 'QUO-4', status: 'draft', expirationDate: ahead(60) }),
    qX: quote({ orgId: 'orgB', quoteNumber: 'QUO-X', status: 'sent', totalAmount: 99999, contactId: 'cOther' }),
  },
});

const ctx = (userId: string, accessLevel?: string) => readToolContext({ userId, orgId: 'orgA', accessLevel, timeZone: 'America/Toronto' });
const editor = ctx('u1', 'editor');

test('the default answer is the open quotes of this workspace, newest first, with the number needing attention', async () => {
  const result = await getQuotesHandler(fakeDb(seed()), editor, {}, NOW);
  assert.equal(result.success, true);
  assert.deepEqual(result.quotes.map((q) => q.number), ['QUO-4', 'QUO-2', 'QUO-1']);
  assert.equal(result.totals?.total, 500 + 1200 + 500);
  assert.match(result.message, /3 quotes \(open quotes\), worth \$2,200\.00 in all\. 2 need attention\./);
  assert.ok(!result.quotes.some((q) => q.number === 'QUO-X'), 'another workspace is never read');
});

test('needs-attention quotes say why', async () => {
  const result = await getQuotesHandler(fakeDb(seed()), editor, { needsAttention: true }, NOW);
  assert.deepEqual(result.quotes.map((q) => q.number).sort(), ['QUO-1', 'QUO-2']);
  const reasons = Object.fromEntries(result.quotes.map((q) => [q.number, q.reason]));
  assert.match(reasons['QUO-1'] as string, /sent 20 days ago/);
  assert.match(reasons['QUO-2'] as string, /approved but not yet invoiced/);
  assert.match(result.message, /\(quotes needing attention\)/);
});

test('one status, a client and a number fragment narrow the list', async () => {
  const db = fakeDb(seed());
  assert.deepEqual((await getQuotesHandler(db, editor, { status: 'invoiced' }, NOW)).quotes.map((q) => q.number), ['QUO-3']);
  assert.deepEqual((await getQuotesHandler(db, editor, { status: 'all', contactId: 'cDana' }, NOW)).quotes.map((q) => q.number).sort(), ['QUO-1', 'QUO-3', 'QUO-4']);
  assert.deepEqual((await getQuotesHandler(db, editor, { status: 'all', number: 'quo-2' }, NOW)).quotes.map((q) => q.number), ['QUO-2']);
  assert.match((await getQuotesHandler(db, editor, { contactId: 'cDana' }, NOW)).message, /for Dana Whitfield/);
  assert.match((await getQuotesHandler(db, editor, { status: 'in_progress' }, NOW)).message, /There are no in progress quotes matching that/);
});

test('a viewer, a guest and a missing workspace are refused', async () => {
  const db = fakeDb(seed());
  const viewer = await getQuotesHandler(db, ctx('u1', 'viewer'), {}, NOW);
  assert.equal(viewer.success, false);
  assert.match(viewer.message, /view this workspace but not its quotes/);
  assert.equal((await getQuotesHandler(db, ctx('u1'), {}, NOW)).success, false);
  assert.match((await getQuotesHandler(db, readToolContext(undefined), {}, NOW)).message, /not authenticated/);
  assert.match((await getQuotesHandler(db, readToolContext({ userId: 'u1', accessLevel: 'editor' }), {}, NOW)).message, /not authenticated/);
});

test('a person whose menu hides the Quote Manager is refused', async () => {
  const result = await getQuotesHandler(fakeDb(seed()), ctx('uBlocked', 'org_admin'), {}, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /menu access does not include the Quote Manager/);
});

test('bad input is refused with a message the model can act on, and a client must be in this workspace', async () => {
  const db = fakeDb(seed());
  assert.match((await getQuotesHandler(db, editor, { status: 'bogus' }, NOW)).message, /status must be open, all, or one of/);
  for (const contactId of ['cOther', 'missing']) assert.match((await getQuotesHandler(db, editor, { contactId }, NOW)).message, /contact was not found in this workspace/);
  assert.match((await getQuotesHandler(db, editor, { contactId: '../x' }, NOW)).message, /contact id is not valid/);
});

test('with no database, or a failing read, it is a failure with no figures', async () => {
  assert.match((await getQuotesHandler(null, editor, {}, NOW)).message, /not available/);
  const db = fakeDb(seed()) as any;
  const original = db.collection.bind(db);
  db.collection = (name: string) => {
    if (name === 'quotes') throw new Error('read refused');
    return original(name);
  };
  const result = await getQuotesHandler(db, editor, {}, NOW);
  assert.equal(result.success, false);
  assert.equal(result.totals, null);
  assert.match(result.message, /could not be read/);
});

test('no notes or other private fields leave the tool', async () => {
  const result = await getQuotesHandler(fakeDb(seed()), editor, { status: 'all' }, NOW);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.deepEqual(Object.keys(result.quotes[0]).sort(), ['client', 'contactId', 'daysInSent', 'daysToExpiry', 'expiryDay', 'needsAttention', 'number', 'quoteDay', 'reason', 'status', 'total']);
});
