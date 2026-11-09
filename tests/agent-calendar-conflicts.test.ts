import assert from 'node:assert/strict';
import test from 'node:test';

import { createAppointmentHandler } from '../src/ai/agent-calendar-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

// Monday 9 Nov 2026, 12:00 in Toronto.
const NOW = new Date('2026-11-09T17:00:00Z');
const seed = () => ({
  users: { u1: { contactId: 'cMe' } },
  tasks: {
    t1: { orgId: 'orgA', userId: 'u1', title: 'Team call', isScheduled: true, status: 'todo', start: new Date('2026-11-10T20:00:00Z'), end: new Date('2026-11-10T21:00:00Z') },
    t2: { orgId: 'orgA', userId: 'u2', title: 'Someone else busy', isScheduled: true, status: 'todo', start: new Date('2026-11-10T22:00:00Z'), end: new Date('2026-11-10T23:00:00Z') },
    t3: { orgId: 'orgB', userId: 'u1', title: 'Other workspace', isScheduled: true, status: 'todo', start: new Date('2026-11-12T15:00:00Z'), end: new Date('2026-11-12T16:00:00Z') },
    t4: { orgId: 'orgA', userId: 'boss', workerId: 'cMe', title: 'Assigned by contact id', isScheduled: true, status: 'todo', start: new Date('2026-11-11T15:00:00Z'), end: new Date('2026-11-11T16:00:00Z') },
  },
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });
const count = (db: any) => Object.keys(db.store.tasks).length;

test('an overlap with my own event is not booked, names it, and offers the next free time', async () => {
  const db = fakeDb(seed());
  const result = await createAppointmentHandler(db, editor, { title: 'Clash', startTime: '2026-11-10T15:30:00', durationMinutes: 60 }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /overlaps "Team call" \(Tue, Nov 10, 3:00.*4:00.*\)\. Nothing was booked\./);
  assert.match(result.message, /next free time of that length is Tue, Nov 10, 4:00/);
  assert.match(result.message, /allowDoubleBooking/);
  assert.equal(count(db), 4);
});

test("another person's event, another workspace's event and back-to-back times are not conflicts", async () => {
  const db = fakeDb(seed());
  const theirs = await createAppointmentHandler(db, editor, { title: 'During u2 busy slot', startTime: '2026-11-10T17:15:00', durationMinutes: 30 }, NOW);
  assert.equal(theirs.success, true, theirs.message);
  const otherWorkspace = await createAppointmentHandler(db, editor, { title: 'Same time as orgB', startTime: '2026-11-12T10:30:00', durationMinutes: 30 }, NOW);
  assert.equal(otherWorkspace.success, true, otherWorkspace.message);
  const backToBack = await createAppointmentHandler(db, editor, { title: 'Right after the call', startTime: '2026-11-10T16:00:00', durationMinutes: 30 }, NOW);
  assert.equal(backToBack.success, true, backToBack.message);
});

test('an event assigned to me by my contact id counts as mine, so it blocks that time', async () => {
  const db = fakeDb(seed());
  const result = await createAppointmentHandler(db, editor, { title: 'Clash 2', startTime: '2026-11-11T10:15:00', durationMinutes: 30 }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /overlaps "Assigned by contact id"/);
});

test('the user can book over a clash by saying so', async () => {
  const db = fakeDb(seed());
  const result = await createAppointmentHandler(db, editor, { title: 'Double', startTime: '2026-11-10T15:30:00', allowDoubleBooking: true }, NOW);
  assert.equal(result.success, true, result.message);
  assert.equal(count(db), 5);
});
