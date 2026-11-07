import assert from 'node:assert/strict';
import test from 'node:test';

import { findNextFreeSlot, formatDurationMinutes, type SlotEvent } from '../src/lib/next-free-slot';

// Friday 6 Nov 2026 (Saturday is the 7th, Monday the 9th).
const at = (h: number, m = 0, day = 6) => new Date(2026, 10, day, h, m, 0, 0);
const busy = (start: Date, end: Date, extra: Partial<SlotEvent> = {}): SlotEvent => ({
  start,
  end,
  isScheduled: true,
  status: 'todo',
  ...extra,
});
const hm = (d: Date | undefined) => (d ? `${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` : 'none');

test('an empty calendar gives the next 5-minute boundary, 30 minutes long', () => {
  const slot = findNextFreeSlot({ events: [], now: at(10, 7) });
  assert.equal(hm(slot?.start), '6 10:10');
  assert.equal(hm(slot?.end), '6 10:40');
});

test('before working hours the slot starts when the day opens', () => {
  const slot = findNextFreeSlot({ events: [], now: at(7, 0) });
  assert.equal(hm(slot?.start), '6 9:00');
});

test('a busy slot pushes the suggestion to the end of that event', () => {
  const slot = findNextFreeSlot({ events: [busy(at(10), at(11))], now: at(10, 7) });
  assert.equal(hm(slot?.start), '6 11:00');
  assert.equal(hm(slot?.end), '6 11:30');
});

test('back-to-back events are skipped together', () => {
  const events = [busy(at(10), at(11)), busy(at(11), at(12))];
  assert.equal(hm(findNextFreeSlot({ events, now: at(10, 7) })?.start), '6 12:00');
});

test('events given out of order and overlapping still work', () => {
  const events = [busy(at(11), at(12)), busy(at(10), at(11, 30))];
  assert.equal(hm(findNextFreeSlot({ events, now: at(10, 7) })?.start), '6 12:00');
});

test('a gap that is long enough before the next event is used', () => {
  const slot = findNextFreeSlot({ events: [busy(at(10, 30), at(11))], now: at(10, 0) });
  assert.equal(hm(slot?.start), '6 10:00');
});

test('a gap that is too short is passed over', () => {
  const slot = findNextFreeSlot({ events: [busy(at(10, 15), at(11))], now: at(10, 0) });
  assert.equal(hm(slot?.start), '6 11:00');
});

test('after closing time the suggestion moves to the next working day', () => {
  const slot = findNextFreeSlot({ events: [], now: at(16, 50) });
  assert.equal(hm(slot?.start), '9 9:00'); // Friday evening -> Monday
});

test('a full day moves on to the next working day', () => {
  const slot = findNextFreeSlot({ events: [busy(at(9), at(17))], now: at(10, 0) });
  assert.equal(hm(slot?.start), '9 9:00');
});

test('today is still offered on a weekend', () => {
  const slot = findNextFreeSlot({ events: [], now: at(10, 7, 7) });
  assert.equal(hm(slot?.start), '7 10:10');
});

test('completed, all-day, unscheduled and untimed items do not block', () => {
  const events = [
    busy(at(10), at(11), { status: 'done' }),
    busy(at(0), at(23, 59)),
    busy(at(10), at(11), { isScheduled: false }),
    { start: at(10), isScheduled: true, status: 'todo' } as SlotEvent,
  ];
  assert.equal(hm(findNextFreeSlot({ events, now: at(10, 7) })?.start), '6 10:10');
});

test('returns null when nothing is free inside the search window', () => {
  const slot = findNextFreeSlot({ events: [busy(at(9), at(17))], now: at(10), maxDaysAhead: 0 });
  assert.equal(slot, null);
});

test('a custom duration and working window are honoured', () => {
  const slot = findNextFreeSlot({ events: [], now: at(8), durationMinutes: 60, workStartHour: 8, workEndHour: 12 });
  assert.equal(hm(slot?.start), '6 8:00');
  assert.equal(hm(slot?.end), '6 9:00');
});

test('formatDurationMinutes reads naturally', () => {
  assert.equal(formatDurationMinutes(30), '30 min');
  assert.equal(formatDurationMinutes(60), '1 hr');
  assert.equal(formatDurationMinutes(90), '1 hr 30 min');
  assert.equal(formatDurationMinutes(-5), '0 min');
});
