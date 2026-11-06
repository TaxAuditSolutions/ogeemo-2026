import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMembershipPrice } from '../src/core/organization-service';
import { MEMBERSHIP_FEE } from '../src/lib/constants';

test('membership includes five seats at the current monthly fee', () => {
  assert.equal(MEMBERSHIP_FEE, 35);
  for (const seats of [1, 2, 5]) {
    assert.equal(calculateMembershipPrice(seats), 35);
  }
});

test('each additional seat adds $5 per month', () => {
  assert.equal(calculateMembershipPrice(6), 40);
  assert.equal(calculateMembershipPrice(10), 60);
  assert.equal(calculateMembershipPrice(50), 260);
});
