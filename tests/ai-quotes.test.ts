import assert from 'node:assert/strict';
import test from 'node:test';

import { filterQuotes, rowFromQuote, summarizeQuotes } from '../src/lib/ai-quotes';

// Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC).
const NOW = new Date('2026-11-11T15:00:00Z');
const TZ = 'America/Toronto';
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const q = (over: Record<string, any> = {}) => rowFromQuote({
  quoteNumber: 'QUO-1', companyName: 'Dana Co', contactId: 'c1', totalAmount: 500, status: 'sent',
  quoteDate: daysAgo(3), expirationDate: daysAhead(30), updatedAt: daysAgo(3), ...over,
}, TZ, NOW);

test('a quote in Sent for 14 days or more needs attention, and says how long', () => {
  assert.equal(q({ updatedAt: daysAgo(13) }).needsAttention, false);
  const stale = q({ updatedAt: daysAgo(14) });
  assert.equal(stale.needsAttention, true);
  assert.equal(stale.daysInSent, 14);
  assert.match(stale.reason as string, /sent 14 days ago with no change/);
});

test('an approved quote that has not been converted needs attention', () => {
  const r = q({ status: 'approved' });
  assert.equal(r.needsAttention, true);
  assert.match(r.reason as string, /approved but not yet invoiced/);
});

test('a quote not yet approved that expires within 7 days needs attention; later, earlier-than-today and converted ones do not', () => {
  assert.equal(q({ expirationDate: daysAhead(7) }).needsAttention, true);
  assert.match(q({ expirationDate: daysAhead(3) }).reason as string, /expires in 3 days/);
  assert.match(q({ expirationDate: daysAhead(1) }).reason as string, /expires in 1 day$/);
  assert.match(q({ expirationDate: NOW }).reason as string, /expires today/);
  assert.equal(q({ expirationDate: daysAhead(8) }).needsAttention, false);
  assert.equal(q({ expirationDate: daysAgo(2) }).needsAttention, false, 'already expired is not "about to expire"');
  assert.equal(q({ status: 'invoiced', expirationDate: daysAhead(2) }).needsAttention, false);
  assert.equal(q({ status: 'declined', expirationDate: daysAhead(2) }).needsAttention, false);
});

test('missing or odd fields do not break a row', () => {
  const r = rowFromQuote({ totalAmount: 'x' }, TZ, NOW);
  assert.equal(r.number, '(no number)');
  assert.equal(r.client, 'Unknown client');
  assert.equal(r.total, 0);
  assert.equal(r.status, 'draft');
  assert.equal(r.needsAttention, false);
});

const set = () => [
  q({ quoteNumber: 'QUO-1', status: 'sent', quoteDate: daysAgo(20), updatedAt: daysAgo(20) }),
  q({ quoteNumber: 'QUO-2', status: 'approved', contactId: 'c2', companyName: 'Acme', totalAmount: 1200 }),
  q({ quoteNumber: 'QUO-3', status: 'invoiced' }),
  q({ quoteNumber: 'QUO-4', status: 'declined' }),
  q({ quoteNumber: 'QUO-5', status: 'draft', expirationDate: daysAhead(60) }),
];

test('open is the default: requested, draft, sent or approved, newest first', () => {
  assert.deepEqual(filterQuotes(set()).map((r) => r.number), ['QUO-5', 'QUO-2', 'QUO-1']);
  assert.deepEqual(filterQuotes(set(), { status: 'invoiced' }).map((r) => r.number), ['QUO-3']);
  assert.deepEqual(filterQuotes(set(), { status: 'declined' }).map((r) => r.number), ['QUO-4']);
  assert.equal(filterQuotes(set(), { status: 'all' }).length, 5);
});

test('needs attention, a client and a number fragment narrow the list', () => {
  assert.deepEqual(filterQuotes(set(), { needsAttention: true, status: 'all' }).map((r) => r.number).sort(), ['QUO-1', 'QUO-2']);
  assert.deepEqual(filterQuotes(set(), { contactId: 'c2', status: 'all' }).map((r) => r.number), ['QUO-2']);
  assert.deepEqual(filterQuotes(set(), { number: 'quo-4', status: 'all' }).map((r) => r.number), ['QUO-4']);
});

test('totals count per status in lifecycle order and add values to the cent', () => {
  const totals = summarizeQuotes(filterQuotes(set(), { status: 'all' }));
  assert.equal(totals.count, 5);
  assert.equal(totals.total, 500 * 4 + 1200);
  assert.deepEqual(totals.byStatus.map((s) => s.status), ['draft', 'sent', 'approved', 'declined', 'invoiced']);
  assert.equal(totals.byStatus.find((s) => s.status === 'approved')?.total, 1200);
  assert.equal(totals.needsAttention, 2);
});
