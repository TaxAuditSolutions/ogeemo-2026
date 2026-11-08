import assert from 'node:assert/strict';
import test from 'node:test';
import { format } from 'date-fns';

import { hasScheduledStart, resolveEntryStart } from '../src/lib/time-entry-date';

const at = (day: number, h = 9) => new Date(2026, 10, day, h, 0, 0, 0);

test('a scheduled start is used as before', () => {
  assert.equal(resolveEntryStart({ start: at(6), sessions: [{ startTime: at(8) }], createdAt: at(1) })?.getTime(), at(6).getTime());
  assert.equal(hasScheduledStart({ start: at(6) }), true);
});

test('"No set time" with a worked session is dated by the session, not a crash', () => {
  const resolved = resolveEntryStart({ start: undefined, sessions: [{ startTime: at(8, 14) }], createdAt: at(1) });
  assert.equal(resolved?.getTime(), at(8, 14).getTime());
  assert.equal(hasScheduledStart({ start: undefined }), false);
});

test('the earliest session wins when there are several, in any order', () => {
  const resolved = resolveEntryStart({ sessions: [{ startTime: at(9) }, { startTime: at(7) }, { startTime: at(8) }] });
  assert.equal(resolved?.getTime(), at(7).getTime());
});

test('falls back to the created date, then the updated date, then nothing', () => {
  assert.equal(resolveEntryStart({ sessions: [], createdAt: at(3) })?.getTime(), at(3).getTime());
  assert.equal(resolveEntryStart({ createdAt: undefined, updatedAt: at(4) })?.getTime(), at(4).getTime());
  assert.equal(resolveEntryStart({}), null);
  assert.equal(resolveEntryStart({ start: null, sessions: null }), null);
});

test('invalid dates are skipped instead of returned', () => {
  assert.equal(resolveEntryStart({ start: new Date('nope'), sessions: [{ startTime: 'also nope' }], createdAt: at(5) })?.getTime(), at(5).getTime());
});

test('Firestore-style timestamps and ISO strings are understood', () => {
  const stamp = { toDate: () => at(12) };
  assert.equal(resolveEntryStart({ start: stamp })?.getTime(), at(12).getTime());
  assert.equal(resolveEntryStart({ start: at(13).toISOString() })?.getTime(), at(13).getTime());
});

test('the resolved date is always safe to format (the original crash)', () => {
  // This is what the Time Log Report does for every row.
  assert.throws(() => format(new Date(undefined as unknown as string), 'yyyy-MM-dd'), RangeError);
  const resolved = resolveEntryStart({ start: undefined, sessions: [{ startTime: at(8) }] });
  assert.ok(resolved);
  assert.equal(format(resolved, 'yyyy-MM-dd'), '2026-11-08');
});
