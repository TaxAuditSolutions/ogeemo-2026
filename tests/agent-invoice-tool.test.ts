import assert from 'node:assert/strict';
import test from 'node:test';

import { getInvoicesHandler } from '../src/ai/agent-invoice-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

// Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC).
const NOW = new Date('2026-11-11T15:00:00Z');
const d = (iso: string) => new Date(iso);

const seed = () => ({
  users: { u1: {}, uBlocked: { sidebarAccess: { mode: 'blocklist', hiddenMenuItems: ['/accounting/accounts-receivable'] } }, uAllow: { sidebarAccess: { mode: 'allowlist', allowedMenuItems: ['/contacts'] } } },
  contacts: { cDana: { orgId: 'orgA', name: 'Dana Whitfield' }, cOther: { orgId: 'orgB', name: 'Elsewhere' } },
  invoices: {
    i1: { orgId: 'orgA', invoiceNumber: 'INV-1', companyName: 'Dana Co', contactId: 'cDana', originalAmount: 1000, amountPaid: 0, status: 'outstanding', invoiceDate: d('2026-10-01T16:00:00Z'), dueDate: d('2026-10-31T16:00:00Z'), notes: 'SECRET NOTE', businessNumber: '123456789RT0001' },
    i2: { orgId: 'orgA', invoiceNumber: 'INV-2', companyName: 'Acme', contactId: 'cAcme', originalAmount: 500, amountPaid: 200, status: 'partially_paid', invoiceDate: d('2026-11-05T16:00:00Z'), dueDate: d('2026-12-15T16:00:00Z') },
    i3: { orgId: 'orgA', invoiceNumber: 'INV-3', companyName: 'Dana Co', contactId: 'cDana', originalAmount: 300, amountPaid: 300, status: 'paid', invoiceDate: d('2026-09-15T16:00:00Z'), dueDate: d('2026-10-15T16:00:00Z') },
    i4: { orgId: 'orgA', invoiceNumber: 'INV-4', companyName: 'Dana Co', contactId: 'cDana', originalAmount: 99, amountPaid: 0, status: 'draft', invoiceDate: d('2026-11-01T16:00:00Z'), dueDate: d('2026-11-15T16:00:00Z') },
    iX: { orgId: 'orgB', invoiceNumber: 'INV-X', companyName: 'Elsewhere', contactId: 'cOther', originalAmount: 9999, amountPaid: 0, status: 'outstanding', invoiceDate: d('2026-10-01T16:00:00Z'), dueDate: d('2026-10-02T16:00:00Z') },
  },
});

const ctx = (userId: string, accessLevel?: string) => readToolContext({ userId, orgId: 'orgA', accessLevel, timeZone: 'America/Toronto' });
const editor = ctx('u1', 'editor');

test('the default answer is what is still owed in this workspace, with totals and the overdue part', async () => {
  const result = await getInvoicesHandler(fakeDb(seed()), editor, {}, NOW);
  assert.equal(result.success, true);
  assert.deepEqual(result.invoices.map((i) => i.number), ['INV-1', 'INV-2'], 'oldest due first; paid, draft and orgB left out');
  assert.equal(result.totals?.balance, 1300);
  assert.equal(result.totals?.overdueCount, 1);
  assert.match(result.message, /2 invoices \(outstanding invoices\): balance due \$1,300\.00 of \$1,500\.00 invoiced\. 1 overdue, \$1,000\.00\./);
  assert.equal(result.invoices[0].status, 'overdue');
  assert.equal(result.invoices[0].daysOverdue, 11);
});

test('no notes, business numbers or other private fields leave the tool', async () => {
  const result = await getInvoicesHandler(fakeDb(seed()), editor, { status: 'all' }, NOW);
  const text = JSON.stringify(result);
  assert.ok(!text.includes('SECRET NOTE') && !text.includes('123456789RT0001'));
  assert.deepEqual(Object.keys(result.invoices[0]).sort(), ['balance', 'client', 'contactId', 'daysOverdue', 'dueDay', 'invoiceDay', 'number', 'paid', 'status', 'total']);
});

test('another workspace is never read', async () => {
  const result = await getInvoicesHandler(fakeDb(seed()), editor, { status: 'all' }, NOW);
  assert.ok(!result.invoices.some((i) => i.number === 'INV-X'));
  assert.equal(result.totals?.count, 3);
});

test('status, client, number and invoice-date filters work, and drafts are only listed when asked', async () => {
  const db = fakeDb(seed());
  assert.deepEqual((await getInvoicesHandler(db, editor, { status: 'overdue' }, NOW)).invoices.map((i) => i.number), ['INV-1']);
  assert.deepEqual((await getInvoicesHandler(db, editor, { status: 'paid' }, NOW)).invoices.map((i) => i.number), ['INV-3']);
  assert.deepEqual((await getInvoicesHandler(db, editor, { status: 'draft' }, NOW)).invoices.map((i) => i.number), ['INV-4']);
  const dana = await getInvoicesHandler(db, editor, { status: 'all', contactId: 'cDana' }, NOW);
  assert.deepEqual(dana.invoices.map((i) => i.number).sort(), ['INV-1', 'INV-3']);
  assert.match(dana.message, /for Dana Whitfield/);
  assert.deepEqual((await getInvoicesHandler(db, editor, { status: 'all', number: 'inv-2' }, NOW)).invoices.map((i) => i.number), ['INV-2']);
  const october = await getInvoicesHandler(db, editor, { status: 'all', from: '2026-10-01', to: '2026-10-31' }, NOW);
  assert.deepEqual(october.invoices.map((i) => i.number), ['INV-1']);
});

test('nothing matching gives a plain sentence, not zeros dressed as figures', async () => {
  const result = await getInvoicesHandler(fakeDb(seed()), editor, { status: 'overdue', contactId: 'cDana', from: '2026-11-01' }, NOW);
  assert.equal(result.success, true);
  assert.deepEqual(result.invoices, []);
  assert.match(result.message, /There are no overdue invoices for Dana Whitfield matching that\./);
});

test('a long list is cut to 15 with a note, while the totals still cover them all', async () => {
  const many: Record<string, any> = {};
  for (let i = 0; i < 20; i += 1) {
    many[`m${i}`] = { orgId: 'orgA', invoiceNumber: `INV-${100 + i}`, companyName: 'Bulk', contactId: 'cB', originalAmount: 10, amountPaid: 0, status: 'outstanding', invoiceDate: d('2026-11-01T16:00:00Z'), dueDate: d('2026-12-01T16:00:00Z') };
  }
  const result = await getInvoicesHandler(fakeDb({ users: {}, contacts: {}, invoices: many }), editor, {}, NOW);
  assert.equal(result.invoices.length, 15);
  assert.equal(result.totals?.count, 20);
  assert.equal(result.totals?.balance, 200);
  assert.match(result.message, /Showing the first 15/);
});

test('a viewer, a guest and a missing workspace are refused, and nothing is read', async () => {
  const db = fakeDb(seed());
  const viewer = await getInvoicesHandler(db, ctx('u1', 'viewer'), {}, NOW);
  assert.equal(viewer.success, false);
  assert.match(viewer.message, /view this workspace but not its invoices/);
  assert.equal(viewer.totals, null);
  assert.equal((await getInvoicesHandler(db, ctx('u1'), {}, NOW)).success, false);
  for (const c of [readToolContext(undefined), readToolContext({ userId: 'u1', accessLevel: 'editor' })]) {
    assert.match((await getInvoicesHandler(db, c, {}, NOW)).message, /not authenticated/);
  }
});

test('a person whose menu hides Accounts Receivable is refused, even as an editor or administrator', async () => {
  const db = fakeDb(seed());
  for (const [user, level] of [['uBlocked', 'editor'], ['uAllow', 'org_admin']] as const) {
    const result = await getInvoicesHandler(db, ctx(user, level), {}, NOW);
    assert.equal(result.success, false, user);
    assert.match(result.message, /menu access does not include Accounts Receivable/);
    assert.deepEqual(result.invoices, []);
  }
});

test('if the profile cannot be read, nothing is shown', async () => {
  const db = fakeDb(seed()) as any;
  const original = db.collection.bind(db);
  db.collection = (name: string) => {
    if (name === 'users') throw new Error('profile unavailable');
    return original(name);
  };
  const result = await getInvoicesHandler(db, editor, {}, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /could not be checked/);
});

test('a client must be a contact of this workspace; bad statuses and dates are refused', async () => {
  const db = fakeDb(seed());
  for (const contactId of ['cOther', 'missing']) assert.match((await getInvoicesHandler(db, editor, { contactId }, NOW)).message, /contact was not found in this workspace/);
  assert.match((await getInvoicesHandler(db, editor, { contactId: '../x' }, NOW)).message, /contact id is not valid/);
  assert.match((await getInvoicesHandler(db, editor, { status: 'bogus' }, NOW)).message, /status must be/);
  assert.match((await getInvoicesHandler(db, editor, { from: 'last month' }, NOW)).message, /YYYY-MM-DD/);
  assert.match((await getInvoicesHandler(db, editor, { from: '2026-11-10', to: '2026-11-01' }, NOW)).message, /must not be before/);
});

test('with no database, or a failing read, it is a failure with no figures', async () => {
  assert.match((await getInvoicesHandler(null, editor, {}, NOW)).message, /not available/);
  const db = fakeDb(seed()) as any;
  const original = db.collection.bind(db);
  db.collection = (name: string) => {
    if (name === 'invoices') throw new Error('read refused');
    return original(name);
  };
  const result = await getInvoicesHandler(db, editor, {}, NOW);
  assert.equal(result.success, false);
  assert.equal(result.totals, null);
  assert.match(result.message, /could not be read/);
});
