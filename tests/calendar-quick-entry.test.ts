import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_QUICK_TITLE,
  buildQuickEntry,
  cleanQuickTitle,
  droppedTimes,
  isAllDaySpan,
  isOverdue,
} from '../src/lib/calendar-quick-entry';

const at = (h: number, m = 0) => new Date(2026, 10, 6, h, m, 0, 0);

test('a quick title is one tidy line', () => {
  assert.equal(cleanQuickTitle('  Call   Dave\n re  MTG  '), 'Call Dave re MTG');
  assert.equal(cleanQuickTitle('   '), '');
  assert.equal(cleanQuickTitle(undefined as unknown as string), '');
  assert.equal(cleanQuickTitle('x'.repeat(500)).length, MAX_QUICK_TITLE);
});

test('a quick entry is a scheduled to-do with no logged time', () => {
  const entry = buildQuickEntry({ title: ' Call Dave re MTG ', start: at(14), end: at(14, 5), userId: 'u1' });
  assert.ok(entry);
  assert.equal(entry?.title, 'Call Dave re MTG');
  assert.equal(entry?.status, 'todo');
  assert.equal(entry?.isScheduled, true);
  assert.equal(entry?.isTodoItem, true);
  assert.equal(entry?.activityType, 'task');
  assert.equal(entry?.duration, 0, 'planned time only, never worked or billable time');
  assert.equal(entry?.projectId, undefined);
  assert.equal(entry?.start?.getTime(), at(14).getTime());
  assert.equal(entry?.end?.getTime(), at(14, 5).getTime());
});

test('nothing is saved for an empty title, a missing user or a bad time range', () => {
  assert.equal(buildQuickEntry({ title: '  ', start: at(9), end: at(10), userId: 'u1' }), null);
  assert.equal(buildQuickEntry({ title: 'x', start: at(9), end: at(10), userId: '' }), null);
  assert.equal(buildQuickEntry({ title: 'x', start: at(10), end: at(9), userId: 'u1' }), null);
  assert.equal(buildQuickEntry({ title: 'x', start: at(9), end: at(9), userId: 'u1' }), null);
  assert.equal(buildQuickEntry({ title: 'x', start: new Date('nope'), end: at(9), userId: 'u1' }), null);
});

test('all-day items are recognised by their length', () => {
  const dayStart = new Date(2026, 10, 6, 0, 0, 0, 0);
  const dayEnd = new Date(2026, 10, 6, 23, 59, 59, 999);
  assert.equal(isAllDaySpan(dayStart, dayEnd), true);
  assert.equal(isAllDaySpan(at(9), at(17)), false);
  assert.equal(isAllDaySpan(undefined, dayEnd), false);
});

test('a timed item keeps its length when dropped on a slot', () => {
  const result = droppedTimes({ start: at(9), end: at(10, 30) }, at(14), 5);
  assert.equal(result.start.getTime(), at(14).getTime());
  assert.equal(result.end.getTime(), at(15, 30).getTime());
});

test('an all-day item dropped on a slot takes the slot length, not 24 hours', () => {
  const allDay = { start: new Date(2026, 10, 6, 0, 0), end: new Date(2026, 10, 6, 23, 59, 59, 999) };
  const result = droppedTimes(allDay, at(14), 15);
  assert.equal(result.end.getTime() - result.start.getTime(), 15 * 60_000);
});

test('an item with no usable length takes the slot length', () => {
  assert.equal(droppedTimes({}, at(9), 5).end.getTime(), at(9, 5).getTime());
  assert.equal(droppedTimes({ start: at(9), end: at(9) }, at(9), 60).end.getTime(), at(10).getTime());
  assert.equal(droppedTimes({}, at(9), 0).end.getTime(), at(9, 30).getTime(), 'a missing slot length falls back to 30 minutes');
});

test('an unfinished to-do whose time has passed is overdue', () => {
  const now = at(15);
  assert.equal(isOverdue({ status: 'todo', end: at(14) }, now), true);
  assert.equal(isOverdue({ status: 'inProgress', end: at(14) }, now), true);
  assert.equal(isOverdue({ status: 'todo', end: at(16) }, now), false, 'still to come');
  assert.equal(isOverdue({ status: 'done', end: at(14) }, now), false, 'completed');
  assert.equal(isOverdue({ status: 'todo' }, now), false, 'no end time');
});

test('appointments and planning rituals are never flagged overdue', () => {
  const now = at(15);
  assert.equal(isOverdue({ status: 'todo', end: at(14), activityType: 'appointment' }, now), false);
  assert.equal(isOverdue({ status: 'todo', end: at(14), ritualType: 'daily' }, now), false);
  assert.equal(isOverdue({ status: 'todo', end: at(14), activityType: 'task' }, now), true);
});
