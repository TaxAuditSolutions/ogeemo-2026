import assert from 'node:assert/strict';
import test from 'node:test';

import { filterInvoices, rowFromInvoice, summarizeInvoices } from '../src/lib/ai-invoices';

// Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC).
const NOW = new Date('2026-11-11T15:00:00Z');
const TZ = 'America/Toronto';

const inv = (over: Record<string, any> = {}) => ({
  invoiceNumber: 'INV-1', companyName: 'Dana Co', contactId: 'c1', originalAmount: 1000, amountPaid: 0, status: 'outstanding',
  invoiceDate: new Date('2026-10-01T16:00:00Z'), dueDate: new Date('2026-10-31T16:00:00Z'), ...over,
});
const row = (over: Record<string, any> = {}, now = NOW) => rowFromInvoice(inv(over), TZ, now);

test('an unpaid invoice past its due date is overdue by whole days, and the balance is to the cent', () => {
  const r = row();
  assert.equal(r.status, 'overdue');
  assert.equal(r.daysOverdue, 11);
  assert.equal(r.balance, 1000);
  assert.equal(r.dueDay, '2026-10-31');
});

test('due today is not overdue; it becomes overdue the next day, in the USER zone not the server zone', () => {
  assert.equal(row({ dueDate: new Date('2026-11-11T16:00:00Z') }).status, 'outstanding');
  assert.equal(row({ dueDate: new Date('2026-11-10T16:00:00Z') }).status, 'overdue');
  // 23:30 on the 10th in Toronto is already the 11th in UTC. Due on the 10th, asked at 23:30 local on the 10th: not overdue yet.
  const lateEvening = new Date('2026-11-11T04:30:00Z');
  assert.equal(rowFromInvoice(inv({ dueDate: new Date('2026-11-10T16:00:00Z') }), TZ, lateEvening).status, 'outstanding');
  // The next morning it is.
  assert.equal(rowFromInvoice(inv({ dueDate: new Date('2026-11-10T16:00:00Z') }), TZ, new Date('2026-11-11T14:00:00Z')).status, 'overdue');
});

test('paid, part-paid and draft invoices get the right status; a drafts is never overdue', () => {
  assert.equal(row({ amountPaid: 1000, status: 'paid' }).status, 'paid');
  assert.equal(row({ amountPaid: 999.995, status: 'partially_paid' }).status, 'paid', 'within a cent counts as paid in full');
  const part = row({ amountPaid: 400, status: 'partially_paid' });
  assert.equal(part.balance, 600);
  assert.equal(part.status, 'overdue', 'a part-paid invoice can be overdue');
  assert.equal(row({ status: 'draft' }).status, 'draft');
  assert.equal(row({ status: 'draft' }).daysOverdue, 0);
  assert.equal(row({ dueDate: new Date('2026-12-31T16:00:00Z') }).status, 'outstanding');
});

test('missing or odd fields do not break a row', () => {
  const r = rowFromInvoice({ originalAmount: 'x', amountPaid: null }, TZ, NOW);
  assert.equal(r.number, '(no number)');
  assert.equal(r.client, 'Unknown client');
  assert.equal(r.total, 0);
  assert.equal(r.dueDay, null);
  assert.equal(r.status, 'outstanding', 'no amount and no due date: nothing is owed and nothing is late');
  assert.equal(r.balance, 0);
  assert.equal(r.daysOverdue, 0);
});

test('Firestore Timestamps are read as dates', () => {
  const stamp = { toDate: () => new Date('2026-10-31T16:00:00Z') };
  assert.equal(row({ dueDate: stamp }).dueDay, '2026-10-31');
});

const set = () => [
  row({ invoiceNumber: 'INV-1', dueDate: new Date('2026-10-31T16:00:00Z') }),
  row({ invoiceNumber: 'INV-2', contactId: 'c2', companyName: 'Acme', originalAmount: 500, dueDate: new Date('2026-12-15T16:00:00Z'), invoiceDate: new Date('2026-11-05T16:00:00Z') }),
  row({ invoiceNumber: 'INV-3', amountPaid: 1000, status: 'paid', invoiceDate: new Date('2026-09-15T16:00:00Z') }),
  row({ invoiceNumber: 'INV-4', status: 'draft' }),
];

test('outstanding is the default: owed and not draft, oldest due first', () => {
  assert.deepEqual(filterInvoices(set()).map((r) => r.number), ['INV-1', 'INV-2']);
  assert.deepEqual(filterInvoices(set(), { status: 'overdue' }).map((r) => r.number), ['INV-1']);
  assert.deepEqual(filterInvoices(set(), { status: 'paid' }).map((r) => r.number), ['INV-3']);
  assert.deepEqual(filterInvoices(set(), { status: 'draft' }).map((r) => r.number), ['INV-4']);
  assert.deepEqual(filterInvoices(set(), { status: 'all' }).map((r) => r.number).sort(), ['INV-1', 'INV-2', 'INV-3']);
});

test('a client, a number fragment and an invoice-date range narrow the list', () => {
  assert.deepEqual(filterInvoices(set(), { status: 'all', contactId: 'c2' }).map((r) => r.number), ['INV-2']);
  assert.deepEqual(filterInvoices(set(), { status: 'all', number: 'inv-3' }).map((r) => r.number), ['INV-3']);
  assert.deepEqual(filterInvoices(set(), { status: 'all', fromDay: '2026-10-01', toDay: '2026-10-01' }).map((r) => r.number), ['INV-1']);
  assert.deepEqual(filterInvoices(set(), { status: 'all', fromDay: '2026-11-01' }).map((r) => r.number), ['INV-2']);
  assert.deepEqual(filterInvoices(set(), { status: 'all', toDay: '2026-09-30' }).map((r) => r.number), ['INV-3']);
});

test('totals add up balances to the cent and count the overdue ones', () => {
  const totals = summarizeInvoices(filterInvoices(set()));
  assert.equal(totals.count, 2);
  assert.equal(totals.total, 1500);
  assert.equal(totals.balance, 1500);
  assert.equal(totals.overdueCount, 1);
  assert.equal(totals.overdueBalance, 1000);
  const cents = summarizeInvoices([row({ originalAmount: 0.1 }), row({ originalAmount: 0.2 })]);
  assert.equal(cents.total, 0.3, 'no floating-point drift');
});
