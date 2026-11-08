process.env.TZ = 'America/Toronto';

import assert from 'node:assert/strict';
import test from 'node:test';
import { format } from 'date-fns';

import { daysPastDue, displayDay, isDuplicateRemittance, isPastDue, summarizeRemittances, validateRemittance } from '../src/lib/payables';

const now = new Date(2026, 10, 8, 15, 30);

test('a due date shows as the same day, not the day before (the old UTC reading)', () => {
  assert.equal(format(new Date('2026-11-01'), 'PP'), 'Oct 31, 2026', 'sanity: the old way was a day early in Toronto');
  assert.equal(displayDay('2026-11-01', (d) => format(d, 'PP')), 'Nov 1, 2026');
  assert.equal(displayDay('garbage', (d) => format(d, 'PP')), 'garbage');
  assert.equal(displayDay(undefined, (d) => format(d, 'PP')), '');
});

test('overdue starts the day after the due date', () => {
  assert.equal(isPastDue('2026-11-08', now), false, 'due today');
  assert.equal(isPastDue('2026-11-07', now), true);
  assert.equal(isPastDue('2026-11-09', now), false);
  assert.equal(daysPastDue('2026-10-09', now), 30);
  assert.equal(daysPastDue('2026-11-20', now), 0);
  assert.equal(daysPastDue('garbage', now), 0);
});

test('year-to-date remitted counts only payments made this year, by the day they were paid', () => {
  const items = [
    { amount: 100, status: 'Paid' as const, dueDate: '2026-02-15', paidDate: '2026-02-10' },
    { amount: 50.5, status: 'Paid' as const, dueDate: '2026-03-15', paidDate: '2026-03-14' },
    { amount: 999, status: 'Paid' as const, dueDate: '2025-12-15', paidDate: '2025-12-31' },
    { amount: 25, status: 'Paid' as const, dueDate: '2026-12-15', paidDate: '2027-01-01' },
    { amount: 77, status: 'Paid' as const, dueDate: '2026-01-15' },
  ];
  assert.equal(summarizeRemittances(items, now).remittedThisYear, 150.5);
});

test('1 January belongs to the new year for a payment, in Toronto time', () => {
  const items = [{ amount: 40, status: 'Paid' as const, dueDate: '2027-01-15', paidDate: '2027-01-01' }];
  assert.equal(summarizeRemittances(items, new Date(2027, 5, 1)).remittedThisYear, 40);
  assert.equal(summarizeRemittances(items, new Date(2026, 5, 1)).remittedThisYear, 0);
});

test('amount due is everything unpaid, and the overdue part is shown separately', () => {
  const items = [
    { amount: 200, status: 'Due' as const, dueDate: '2026-10-15' },
    { amount: 300.25, status: 'Due' as const, dueDate: '2026-11-15' },
    { amount: 90, status: 'Due' as const, dueDate: '2026-11-08' },
    { amount: 10, status: 'Paid' as const, dueDate: '2026-09-15', paidDate: '2026-09-14' },
  ];
  assert.deepEqual(summarizeRemittances(items, now), { remittedThisYear: 10, amountDue: 590.25, overdueAmount: 200, overdueCount: 1 });
});

test('totals stay exact to the cent', () => {
  const items = Array.from({ length: 10 }, () => ({ amount: 0.1, status: 'Due' as const, dueDate: '2026-12-01' }));
  assert.equal(summarizeRemittances(items, now).amountDue, 1);
});

test('remittance form: dates in order, amount above zero, amount rounded to the cent', () => {
  const ok = validateRemittance({ payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31', dueDate: '2026-11-15', amount: '1,234.567' });
  assert.deepEqual(ok, { amount: 1234.57, error: null });
  assert.match((validateRemittance({ payPeriodStart: '', payPeriodEnd: '2026-10-31', dueDate: '2026-11-15', amount: '5' }) as any).error, /Choose the pay period/);
  assert.match((validateRemittance({ payPeriodStart: '2026-10-31', payPeriodEnd: '2026-10-01', dueDate: '2026-11-15', amount: '5' }) as any).error, /end cannot be before/);
  assert.match((validateRemittance({ payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31', dueDate: '2026-09-15', amount: '5' }) as any).error, /due date cannot be before/);
  for (const amount of ['0', '-5', 'abc', '', NaN]) {
    assert.match((validateRemittance({ payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31', dueDate: '2026-11-15', amount: amount as any }) as any).error, /greater than zero/, String(amount));
  }
});

test('a remittance with the same period and amount is flagged as a likely double entry', () => {
  const existing = [{ payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31', dueDate: '2026-11-15', amount: 500 }];
  assert.equal(isDuplicateRemittance(existing, { payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31', amount: 500 }), true);
  assert.equal(isDuplicateRemittance(existing, { payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31', amount: 500.01 }), false);
  assert.equal(isDuplicateRemittance(existing, { payPeriodStart: '2026-11-01', payPeriodEnd: '2026-11-30', amount: 500 }), false);
});
