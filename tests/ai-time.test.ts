import assert from 'node:assert/strict';
import test from 'node:test';

import { describeNow, offsetString, parseWhen, validTimeZone } from '../src/lib/ai-time';

test('a real time zone is kept and a bad or missing one becomes UTC', () => {
  assert.equal(validTimeZone('America/Toronto'), 'America/Toronto');
  assert.equal(validTimeZone('Asia/Kolkata'), 'Asia/Kolkata');
  for (const bad of ['Mars/Olympus', '', '   ', undefined, null, 42, 'x'.repeat(100)]) assert.equal(validTimeZone(bad), 'UTC');
});

test('offsets are written with a sign and two-digit hours and minutes', () => {
  assert.equal(offsetString(-300), '-05:00');
  assert.equal(offsetString(330), '+05:30');
  assert.equal(offsetString(0), '+00:00');
  assert.equal(offsetString(-570), '-09:30');
});

test('the local time carries the right offset in winter and in summer', () => {
  const winter = describeNow('America/Toronto', new Date('2026-01-15T17:00:00Z'));
  assert.equal(winter.iso, '2026-01-15T12:00:00-05:00');
  assert.equal(winter.weekday, 'Thursday');
  assert.equal(winter.offsetMinutes, -300);
  const summer = describeNow('America/Toronto', new Date('2026-07-15T17:00:00Z'));
  assert.equal(summer.iso, '2026-07-15T13:00:00-04:00');
  assert.equal(summer.offsetMinutes, -240);
});

test('the local date can differ from the UTC date, and half-hour zones work', () => {
  const late = describeNow('America/Vancouver', new Date('2026-03-01T03:30:00Z'));
  assert.equal(late.iso, '2026-02-28T19:30:00-08:00');
  assert.equal(late.weekday, 'Saturday');
  const india = describeNow('Asia/Kolkata', new Date('2026-03-01T03:30:00Z'));
  assert.equal(india.iso, '2026-03-01T09:00:00+05:30');
  assert.equal(describeNow('Nowhere/Land', new Date('2026-03-01T03:30:00Z')).timeZone, 'UTC');
});

test('a time with no offset is read in the user zone, and one with an offset keeps it', () => {
  assert.equal(parseWhen('2026-11-10T15:00:00', -300)?.toISOString(), '2026-11-10T20:00:00.000Z');
  assert.equal(parseWhen('2026-11-10 15:00', -300)?.toISOString(), '2026-11-10T20:00:00.000Z');
  assert.equal(parseWhen('2026-11-10T15:00:00-08:00', -300)?.toISOString(), '2026-11-10T23:00:00.000Z');
  assert.equal(parseWhen('2026-11-10T15:00:00Z', -300)?.toISOString(), '2026-11-10T15:00:00.000Z');
  assert.equal(parseWhen('2026-11-10T15:00:00+0530', -300)?.toISOString(), '2026-11-10T09:30:00.000Z');
});

test('a bare date means the start of that day in the user zone', () => {
  assert.equal(parseWhen('2026-11-10', -300)?.toISOString(), '2026-11-10T05:00:00.000Z');
});

test('impossible, odd or out-of-range dates are refused', () => {
  for (const bad of ['2026-02-31', 'tomorrow', '', '10/11/2026', '2026-13-01T10:00:00', '1999-12-31', '2101-01-01', undefined, null, 5, 'x'.repeat(50)]) {
    assert.equal(parseWhen(bad, 0), null, String(bad));
  }
});
