process.env.TZ = 'America/Toronto';

import assert from 'node:assert/strict';
import test from 'node:test';

import { isBusinessEntry, ledgerAmountsFromGross, sumCents, summarizeSalesTax } from '../src/lib/ledger-totals';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

test('tax-inclusive entries split into cents-exact net and tax that add back to the total', () => {
  assert.deepEqual(ledgerAmountsFromGross(1, 113, 13), { gross: 113, net: 100, tax: 13 });
  assert.deepEqual(ledgerAmountsFromGross(1, 100, 0), { gross: 100, net: 100, tax: 0 });
  assert.deepEqual(ledgerAmountsFromGross(3, 19.99, 13), { gross: 59.97, net: 53.07, tax: 6.9 });
});

test('net plus tax always equals the gross, for awkward amounts and rates', () => {
  for (const price of [0.01, 0.99, 7.77, 19.99, 113.5, 1234.56, 99999.99]) {
    for (const rate of [0, 5, 7, 13, 14.975, 15]) {
      const { gross, net, tax } = ledgerAmountsFromGross(1, price, rate);
      assert.equal(Math.round((net + tax) * 100), Math.round(gross * 100), `${price} @ ${rate}%`);
      for (const value of [gross, net, tax]) assert.equal(Math.round(value * 100) / 100, value, 'whole cents');
    }
  }
});

test('the old dialog arithmetic produced fractions of a cent; the new amounts are whole cents', () => {
  const gross = 19.99;
  const oldTax = gross - gross / 1.13;
  assert.notEqual(Math.round(oldTax * 100) / 100, oldTax, 'sanity: the old tax was not whole cents');
  assert.equal(ledgerAmountsFromGross(1, gross, 13).tax, 2.3);
});

test('text prices with commas, blanks and junk never produce NaN', () => {
  assert.deepEqual(ledgerAmountsFromGross(1, '1,234.56', 13), ledgerAmountsFromGross(1, 1234.56, 13));
  assert.deepEqual(ledgerAmountsFromGross('', '', 13), { gross: 0, net: 0, tax: 0 });
  assert.deepEqual(ledgerAmountsFromGross(2, 'abc', 13), { gross: 0, net: 0, tax: 0 });
  assert.deepEqual(ledgerAmountsFromGross(1, 50, 'x'), { gross: 50, net: 50, tax: 0 });
});

test('only entries marked personal are excluded; older entries with no type count as business', () => {
  assert.equal(isBusinessEntry({ type: 'business' }), true);
  assert.equal(isBusinessEntry({}), true);
  assert.equal(isBusinessEntry({ type: null }), true);
  assert.equal(isBusinessEntry({ type: 'personal' }), false);
});

test('sumCents stays exact over many small amounts', () => {
  assert.equal(sumCents(Array(10).fill(0.1)), 1);
  assert.equal(sumCents([0.1, 0.2]), 0.3);
  assert.equal(sumCents([undefined, null, 5, NaN]), 5);
  assert.equal(sumCents([]), 0);
});

test('sales tax: collected, paid and net for the period, cents exact', () => {
  const income = [
    { date: '2026-10-01', taxAmount: 13 },
    { date: '2026-11-15', taxAmount: 6.5 },
    { date: '2026-09-30', taxAmount: 100 },
  ];
  const expenses = [
    { date: '2026-12-31', taxAmount: 2.3 },
    { date: '2027-01-01', taxAmount: 50 },
  ];
  const result = summarizeSalesTax(income, expenses, { from: d(2026, 10, 1), to: d(2026, 12, 31) });
  assert.deepEqual(result, { collected: 19.5, paid: 2.3, net: 17.2 });
});

test('sales tax: an entry on the first or last day of the quarter is counted in that quarter in Toronto time', () => {
  const entries = [{ date: '2026-10-01', taxAmount: 1 }, { date: '2026-12-31', taxAmount: 2 }];
  assert.equal(summarizeSalesTax(entries, [], { from: d(2026, 10, 1), to: d(2026, 12, 31) }).collected, 3);
  assert.equal(summarizeSalesTax(entries, [], { from: d(2026, 7, 1), to: d(2026, 9, 30) }).collected, 0);
});

test('sales tax: personal entries are left out of both sides', () => {
  const income = [{ date: '2026-11-01', taxAmount: 13, type: 'business' }, { date: '2026-11-02', taxAmount: 99, type: 'personal' }];
  const expenses = [{ date: '2026-11-03', taxAmount: 5, type: 'personal' }, { date: '2026-11-04', taxAmount: 2 }];
  assert.deepEqual(summarizeSalesTax(income, expenses, { from: d(2026, 11, 1), to: d(2026, 11, 30) }), { collected: 13, paid: 2, net: 11 });
});

test('sales tax: carried-forward credit or balance adjusts the net, and a refund shows as negative', () => {
  const income = [{ date: '2026-11-01', taxAmount: 10 }];
  const expenses = [{ date: '2026-11-02', taxAmount: 30 }];
  const period = { from: d(2026, 11, 1), to: d(2026, 11, 30) };
  assert.equal(summarizeSalesTax(income, expenses, period).net, -20, 'more tax paid than collected = refund position');
  assert.equal(summarizeSalesTax(income, expenses, period, 12.5).net, -7.5);
  assert.equal(summarizeSalesTax(income, expenses, period, NaN as any).net, -20);
});

test('sales tax: entries without a tax amount or with an unreadable date do not break the totals', () => {
  const income = [{ date: '2026-11-01' }, { date: 'garbage', taxAmount: 50 }, { date: '2026-11-02', taxAmount: undefined }, { date: '2026-11-03', taxAmount: 4 }];
  assert.deepEqual(summarizeSalesTax(income, [], { from: d(2026, 11, 1), to: d(2026, 11, 30) }), { collected: 4, paid: 0, net: 4 });
});
