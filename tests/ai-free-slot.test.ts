import assert from 'node:assert/strict';
import test from 'node:test';

import { addDaysToDateString, describeSlot, suggestFreeSlot, type CalendarItem } from '../src/lib/ai-calendar';

const at = (iso: string) => new Date(iso);
const item = (start: string, end: string, over: Partial<CalendarItem> = {}): CalendarItem => ({
  title: 'Busy',
  start: at(start),
  end: at(end),
  status: 'todo',
  allDay: false,
  ...over,
});
// Monday 9 Nov 2026, 12:00 in Toronto (UTC-5). Working hours there are 14:00 to 22:00 UTC.
const NOW = at('2026-11-09T17:00:00Z');
const iso = (slot: { start: Date; end: Date } | null) => slot && `${slot.start.toISOString()} ${slot.end.toISOString()}`;

test('working hours are read in the person zone, so 4pm Toronto is still inside the working day on a UTC server', () => {
  const busy = [item('2026-11-10T20:00:00Z', '2026-11-10T21:00:00Z')]; // 3pm to 4pm Toronto
  const slot = suggestFreeSlot(busy, at('2026-11-10T20:30:00Z'), 60, 'America/Toronto', NOW);
  assert.equal(iso(slot), '2026-11-10T21:00:00.000Z 2026-11-10T22:00:00.000Z', '4pm to 5pm Toronto, the same day');
});

test('a free time is found straight away when nothing is in the way, rounded up to the next five minutes', () => {
  const slot = suggestFreeSlot([], at('2026-11-10T20:02:00Z'), 30, 'America/Toronto', NOW);
  assert.equal(iso(slot), '2026-11-10T20:05:00.000Z 2026-11-10T20:35:00.000Z');
});

test('a day that is full moves to 9am the next working day, and a weekend is skipped', () => {
  // Friday 13 Nov, 3pm to 5pm Toronto is taken, so a one-hour slot rolls to Monday 16 Nov at 9am.
  const busy = [item('2026-11-13T20:00:00Z', '2026-11-13T22:00:00Z')];
  const slot = suggestFreeSlot(busy, at('2026-11-13T20:00:00Z'), 60, 'America/Toronto', NOW);
  assert.equal(iso(slot), '2026-11-16T14:00:00.000Z 2026-11-16T15:00:00.000Z');
});

test('finished events and all-day events do not block a time, but unfinished timed ones do', () => {
  const items = [
    item('2026-11-10T20:00:00Z', '2026-11-10T21:00:00Z', { status: 'done' }),
    item('2026-11-10T05:00:00Z', '2026-11-11T04:59:00Z', { allDay: true }),
    item('2026-11-10T21:00:00Z', '2026-11-10T21:30:00Z'),
  ];
  const slot = suggestFreeSlot(items, at('2026-11-10T20:00:00Z'), 30, 'America/Toronto', NOW);
  assert.equal(iso(slot), '2026-11-10T20:00:00.000Z 2026-11-10T20:30:00.000Z');
});

test('nothing free within the search window gives null', () => {
  // Every day for 16 days is booked 9am to 5pm Toronto (14:00 to 22:00 UTC), weekends included.
  const everyDay = Array.from({ length: 16 }, (_, i) => {
    const day = addDaysToDateString('2026-11-10', i);
    return item(`${day}T14:00:00Z`, `${day}T22:00:00Z`);
  });
  assert.equal(suggestFreeSlot(everyDay, at('2026-11-10T14:00:00Z'), 60, 'America/Toronto', NOW, 5), null);
});

test('times are written without the stray full stop that "p.m." leaves before a sentence end', () => {
  const text = describeSlot(at('2026-11-10T21:00:00Z'), at('2026-11-10T22:00:00Z'), 'America/Toronto');
  assert.match(text, /4:00 pm to 5:00 pm$/);
  assert.ok(!text.includes('p.m.'), text);
});
