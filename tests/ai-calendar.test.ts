import assert from 'node:assert/strict';
import test from 'node:test';

import { addDaysToDateString, calendarItemsFor, describeSlot, findConflicts, itemsBetween, localDateOf, toDate } from '../src/lib/ai-calendar';

const at = (iso: string) => new Date(iso);
const row = (over: Record<string, any>) => ({
  title: 'Thing',
  isScheduled: true,
  start: at('2026-11-10T20:00:00Z'),
  end: at('2026-11-10T21:00:00Z'),
  status: 'todo',
  userId: 'me',
  ...over,
});

test('dates are read from a Date, a Firestore-style timestamp, a string, and nothing else', () => {
  const d = at('2026-11-10T20:00:00Z');
  assert.equal(toDate(d)?.getTime(), d.getTime());
  assert.equal(toDate({ toDate: () => d })?.getTime(), d.getTime());
  assert.equal(toDate({ _seconds: d.getTime() / 1000, _nanoseconds: 0 })?.getTime(), d.getTime());
  assert.equal(toDate({ seconds: d.getTime() / 1000 })?.getTime(), d.getTime());
  assert.equal(toDate('2026-11-10T20:00:00Z')?.getTime(), d.getTime());
  for (const nothing of [null, undefined, '', 'nonsense', 42, {}, new Date('x')]) assert.equal(toDate(nothing), null);
});

test('the calendar holds only my scheduled, timed events, earliest first', () => {
  const items = calendarItemsFor(
    [
      row({ title: 'Later', start: at('2026-11-11T15:00:00Z'), end: at('2026-11-11T16:00:00Z') }),
      row({ title: 'Mine' }),
      row({ title: 'Unscheduled', isScheduled: false }),
      row({ title: 'No end', end: null }),
      row({ title: 'Ends first', end: at('2026-11-10T19:00:00Z') }),
      row({ title: 'Someone else', userId: 'other' }),
    ],
    { userId: 'me' }
  );
  assert.deepEqual(items.map((i) => i.title), ['Mine', 'Later']);
});

test('an assigned event is mine when assigned to my sign-in id or my contact id, and not mine when assigned to another', () => {
  const rows = [
    row({ title: 'By id', workerId: 'me', userId: 'boss' }),
    row({ title: 'By contact', workerId: 'cMe', userId: 'boss' }),
    row({ title: 'Given away', workerId: 'cOther', userId: 'me' }),
    row({ title: 'Unassigned, made by me', workerId: null }),
    row({ title: 'Unassigned, made by boss', workerId: null, userId: 'boss' }),
  ];
  assert.deepEqual(calendarItemsFor(rows, { userId: 'me', contactId: 'cMe' }).map((i) => i.title).sort(), ['By contact', 'By id', 'Unassigned, made by me']);
  assert.deepEqual(calendarItemsFor(rows, { userId: 'me' }).map((i) => i.title).sort(), ['By id', 'Unassigned, made by me']);
});

test('an all-day event is marked all-day and never blocks a time', () => {
  const items = calendarItemsFor([row({ title: 'Holiday', start: at('2026-11-10T05:00:00Z'), end: at('2026-11-11T04:59:00Z') })], { userId: 'me' });
  assert.equal(items[0].allDay, true);
  assert.deepEqual(findConflicts(items, at('2026-11-10T20:00:00Z'), at('2026-11-10T21:00:00Z')), []);
});

test('an overlap is found, but back-to-back, finished, and distant events are not conflicts', () => {
  const items = calendarItemsFor([row({ title: 'Busy' }), row({ title: 'Done', status: 'done', start: at('2026-11-10T22:00:00Z'), end: at('2026-11-10T23:00:00Z') })], { userId: 'me' });
  assert.deepEqual(findConflicts(items, at('2026-11-10T20:30:00Z'), at('2026-11-10T21:30:00Z')).map((i) => i.title), ['Busy']);
  assert.deepEqual(findConflicts(items, at('2026-11-10T19:00:00Z'), at('2026-11-10T20:00:00Z')), [], 'ends exactly when the other starts');
  assert.deepEqual(findConflicts(items, at('2026-11-10T21:00:00Z'), at('2026-11-10T22:00:00Z')), [], 'starts exactly when the other ends');
  assert.deepEqual(findConflicts(items, at('2026-11-10T22:00:00Z'), at('2026-11-10T23:00:00Z')), [], 'a finished event does not block');
});

test('a window finds the events that touch it, including one that began before it', () => {
  const items = calendarItemsFor([row({ title: 'Overnight', start: at('2026-11-10T23:00:00Z'), end: at('2026-11-11T02:00:00Z') })], { userId: 'me' });
  assert.equal(itemsBetween(items, at('2026-11-11T00:00:00Z'), at('2026-11-12T00:00:00Z')).length, 1);
  assert.equal(itemsBetween(items, at('2026-11-12T00:00:00Z'), at('2026-11-13T00:00:00Z')).length, 0);
});

test('a slot is described in the person zone, not UTC', () => {
  const text = describeSlot(at('2026-11-10T20:00:00Z'), at('2026-11-10T20:30:00Z'), 'America/Toronto');
  assert.match(text, /Tue/);
  assert.match(text, /Nov/);
  assert.match(text, /3:00/);
  assert.match(text, /3:30/);
  assert.match(describeSlot(at('2026-11-10T05:00:00Z'), at('2026-11-11T04:59:00Z'), 'America/Toronto', true), /all day/);
});

test('the local date and whole-day arithmetic follow the calendar, not 24-hour blocks', () => {
  // 03:00 UTC on 10 Nov is still the evening of 9 Nov in Toronto.
  assert.equal(localDateOf(at('2026-11-10T03:00:00Z'), 'America/Toronto'), '2026-11-09');
  assert.equal(localDateOf(at('2026-11-10T03:00:00Z'), 'UTC'), '2026-11-10');
  assert.equal(addDaysToDateString('2026-11-30', 1), '2026-12-01');
  assert.equal(addDaysToDateString('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysToDateString('2026-11-01', 7), '2026-11-08');
});
