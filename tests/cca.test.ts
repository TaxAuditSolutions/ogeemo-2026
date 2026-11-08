import assert from 'node:assert/strict';
import test from 'node:test';

import { CCA_RATES, assetBalance, ccaRateFor, checkClaim, claimedInYear, maxClaimForYear, remainingBalance } from '../src/lib/cca';

test('rates cover every class the asset form offers, and unknown classes have none', () => {
  for (const cls of ['1', '8', '10', '10.1', '12', '16', '43', '45', '50', '53']) assert.ok(ccaRateFor(cls) !== null, cls);
  assert.equal(ccaRateFor('8'), 20);
  assert.equal(ccaRateFor('10.1'), 30);
  assert.equal(ccaRateFor('99'), null);
  assert.equal(ccaRateFor(''), null);
  assert.equal(ccaRateFor(undefined), null);
  assert.equal(ccaRateFor('toString'), null, 'object keys are not classes');
  assert.equal(Object.keys(CCA_RATES).length, 10);
});

test('the remaining balance is the opening balance less the claims, to the cent and never negative', () => {
  assert.equal(remainingBalance(1000, [{ date: '2026-12-31', amount: 100 }, { date: '2027-12-31', amount: 180 }]), 720);
  assert.equal(remainingBalance(100.1, [{ date: '2026-01-01', amount: 0.2 }]), 99.9);
  assert.equal(remainingBalance(100, [{ date: '2026-01-01', amount: 150 }]), 0);
  assert.equal(remainingBalance(NaN as any, []), 0);
  assert.equal(remainingBalance(500, []), 500);
});

test('an asset\'s shown balance is its opening balance less its claims, so the register reflects what was claimed', () => {
  assert.equal(assetBalance({ undepreciatedCapitalCost: 1000, depreciationEntries: [{ date: '2026-12-31', amount: 100 }, { date: '2027-12-31', amount: 180 }] }), 720);
  assert.equal(assetBalance({ undepreciatedCapitalCost: 1000 }), 1000, 'an older asset with no claim list');
  assert.equal(assetBalance({ undepreciatedCapitalCost: 50, depreciationEntries: [{ date: '2026-01-01', amount: 80 }] }), 0);
  assert.equal(assetBalance({}), 0);
});

test('claims are totalled by calendar year', () => {
  const claims = [{ date: '2026-03-01', amount: 50 }, { date: '2026-12-31', amount: 25.5 }, { date: '2027-01-01', amount: 10 }];
  assert.equal(claimedInYear(claims, 2026), 75.5);
  assert.equal(claimedInYear(claims, 2027), 10);
  assert.equal(claimedInYear(claims, 2028), 0);
});

test('the yearly maximum is the rate times the balance, halved in the purchase year', () => {
  const base = { assetClass: '8', balanceBeforeClaims: 1000, applyHalfYearRule: true };
  assert.equal(maxClaimForYear({ ...base, year: 2027, purchaseYear: 2026 }), 200);
  assert.equal(maxClaimForYear({ ...base, year: 2026, purchaseYear: 2026 }), 100, 'half-year rule');
  assert.equal(maxClaimForYear({ ...base, year: 2026, purchaseYear: 2026, applyHalfYearRule: false }), 200, 'rule switched off');
  assert.equal(maxClaimForYear({ ...base, assetClass: '12', year: 2027, purchaseYear: 2026 }), 1000);
  assert.equal(maxClaimForYear({ ...base, assetClass: 'unknown', year: 2027, purchaseYear: 2026 }), null);
});

const claim = (over: Partial<Parameters<typeof checkClaim>[0]> = {}) =>
  checkClaim({ amount: 100, date: '2027-12-31', balance: 1000, assetClass: '8', purchaseDate: '2026-05-01', applyHalfYearRule: true, existingClaims: [], openingBalance: 1000, ...over });

test('a claim must be more than zero and no more than the balance left', () => {
  assert.equal(claim({ amount: 0 }).ok, false);
  assert.equal(claim({ amount: -5 }).ok, false);
  assert.equal(claim({ amount: NaN }).ok, false);
  assert.equal(claim({ amount: 1000.01 }).ok, false);
  assert.equal(claim({ amount: 1000 }).ok, true);
});

test('a claim cannot be dated before the year the asset was bought', () => {
  const result = claim({ date: '2025-12-31' });
  assert.equal(result.ok, false);
  assert.match(result.message ?? '', /before the year the asset was bought/);
  assert.equal(claim({ date: '2026-12-31' }).ok, true);
});

test('a claim over the usual class maximum is allowed with a warning, since the amount is the owner\'s choice', () => {
  const within = claim({ amount: 200 });
  assert.deepEqual([within.ok, within.warning], [true, undefined]);
  const over = claim({ amount: 250 });
  assert.equal(over.ok, true);
  assert.match(over.warning ?? '', /above the usual maximum of 200\.00/);
});

test('earlier claims in the same year count toward that year\'s maximum', () => {
  const result = claim({ amount: 150, existingClaims: [{ date: '2027-06-30', amount: 100 }] });
  assert.match(result.warning ?? '', /would total 250\.00, above the usual maximum of 200\.00/);
});

test('the maximum uses the balance at the start of the claim year, not today\'s', () => {
  // 1000 opening, 2026 claim of 100 -> 900 at the start of 2027 -> 20% = 180.
  const result = claim({ amount: 181, balance: 900, existingClaims: [{ date: '2026-12-31', amount: 100 }] });
  assert.match(result.warning ?? '', /usual maximum of 180\.00/);
  assert.equal(claim({ amount: 180, balance: 900, existingClaims: [{ date: '2026-12-31', amount: 100 }] }).warning, undefined);
});

test('the purchase-year half-year limit applies to a purchase-year claim', () => {
  const result = claim({ date: '2026-12-31', amount: 150 });
  assert.match(result.warning ?? '', /usual maximum of 100\.00/);
});

test('an unclassified asset has no maximum, so no warning', () => {
  assert.equal(claim({ assetClass: undefined, amount: 900 }).warning, undefined);
});
