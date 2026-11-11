import assert from 'node:assert/strict';
import test from 'node:test';

import { readDayRange, readDayStrings } from '../src/lib/ai-range';

// Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC).
const NOW = new Date('2026-11-11T15:00:00Z');
const TZ = 'America/Toronto';

test('moments: from the start of the first day to the start of the day after the last, in the user zone', () => {
  const range = readDayRange('2026-11-09', '2026-11-10', TZ, NOW) as any;
  assert.equal(range.from.toISOString(), '2026-11-09T05:00:00.000Z');
  assert.equal(range.to.toISOString(), '2026-11-11T05:00:00.000Z');
});

test('moments: to is today when only from is given, and the range is open with neither', () => {
  const range = readDayRange('2026-11-10', '', TZ, NOW) as any;
  assert.equal(range.to.toISOString(), '2026-11-12T05:00:00.000Z');
  assert.deepEqual(readDayRange('', '', TZ, NOW), { from: null, to: null });
  const upTo = readDayRange('', '2026-10-31', TZ, NOW) as any;
  assert.equal(upTo.from, null);
  assert.equal(upTo.to.toISOString(), '2026-11-01T04:00:00.000Z', 'daylight saving ended on 1 Nov: still EDT at midnight of the 1st');
});

test('moments: unusable dates come back as a message', () => {
  for (const [from, to] of [['last week', ''], ['2026-11-10', 'today'], ['11/10/2026', '']]) {
    assert.match(readDayRange(from, to, TZ, NOW) as string, /YYYY-MM-DD/, `${from} ${to}`);
  }
  assert.match(readDayRange('2026-11-10', '2026-11-01', TZ, NOW) as string, /must not be before/);
});

test('days: the same range kept as calendar days; to is today in the user zone when only from is given', () => {
  assert.deepEqual(readDayStrings('2026-11-01', '2026-11-30', TZ, NOW), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(readDayStrings('2026-11-01', '', TZ, NOW), { from: '2026-11-01', to: '2026-11-11' });
  assert.deepEqual(readDayStrings('', '2026-11-30', TZ, NOW), { from: null, to: '2026-11-30' });
  assert.deepEqual(readDayStrings('', '', TZ, NOW), { from: null, to: null });
  const lateEvening = new Date('2026-11-11T04:30:00Z');
  assert.deepEqual(readDayStrings('2026-11-01', '', TZ, lateEvening), { from: '2026-11-01', to: '2026-11-10' }, 'still the 10th in Toronto');
});

test('days: a date that does not exist, or is in the wrong shape, is refused', () => {
  for (const bad of ['2026-02-30', '2026-13-01', 'tomorrow', '2026-1-5', '2026-11-10T09:00:00Z']) {
    assert.match(readDayStrings(bad, '', TZ, NOW) as string, /real date as YYYY-MM-DD/, bad);
  }
  assert.match(readDayStrings('2026-11-10', '2026-11-01', TZ, NOW) as string, /must not be before/);
});
