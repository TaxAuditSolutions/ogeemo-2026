import assert from 'node:assert/strict';
import test from 'node:test';

import { createAppointmentHandler } from '../src/ai/agent-calendar-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

// Monday 9 Nov 2026, 12:00 in Toronto.
const NOW = new Date('2026-11-09T17:00:00Z');
const seed = () => ({
  contacts: { c1: { orgId: 'orgA', name: 'Dana Whitfield' }, cOther: { orgId: 'orgB', name: 'Other Person' } },
  users: { u1: { contactId: 'cMe' } },
  tasks: {
    t1: { orgId: 'orgA', userId: 'u1', title: 'Team call', isScheduled: true, status: 'todo', start: new Date('2026-11-10T20:00:00Z'), end: new Date('2026-11-10T21:00:00Z') },
    t2: { orgId: 'orgA', userId: 'u2', title: 'Someone else busy', isScheduled: true, status: 'todo', start: new Date('2026-11-10T22:00:00Z'), end: new Date('2026-11-10T23:00:00Z') },
    t3: { orgId: 'orgB', userId: 'u1', title: 'Other workspace', isScheduled: true, status: 'todo', start: new Date('2026-11-12T15:00:00Z'), end: new Date('2026-11-12T16:00:00Z') },
    t4: { orgId: 'orgA', userId: 'boss', workerId: 'cMe', title: 'Assigned by contact id', isScheduled: true, status: 'todo', start: new Date('2026-11-11T15:00:00Z'), end: new Date('2026-11-11T16:00:00Z') },
  },
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });
const saved = (db: any) => Object.values(db.store.tasks) as any[];

test('booking saves an appointment in the signed-in workspace and says when, in the user zone', async () => {
  const db = fakeDb(seed());
  const result = await createAppointmentHandler(db, editor, { title: 'Dentist', startTime: '2026-11-10T09:00:00', durationMinutes: 30 }, NOW);
  assert.equal(result.success, true, result.message);
  assert.match(result.message, /Booked "Dentist" for Tue, Nov 10, 9:00.*9:30.*\(30 min\)/);
  const row = db.store.tasks[(result as any).appointmentId];
  assert.equal(row.orgId, 'orgA');
  assert.equal(row.userId, 'u1');
  assert.equal(row.activityType, 'appointment');
  assert.equal(row.isScheduled, true);
  assert.equal(row.start.toISOString(), '2026-11-10T14:00:00.000Z');
});

test('a contact is attached and named, and a contact from another workspace is refused', async () => {
  const db = fakeDb(seed());
  const ok = await createAppointmentHandler(db, editor, { title: 'Review', startTime: '2026-11-10T09:00:00', contactId: 'c1' }, NOW);
  assert.match(ok.message, /Booked "Review" with Dana Whitfield/);
  assert.equal(db.store.tasks[(ok as any).appointmentId].contactId, 'c1');
  const before = saved(db).length;
  assert.match((await createAppointmentHandler(db, editor, { title: 'x', startTime: '2026-11-10T09:00:00', contactId: 'cOther' }, NOW)).message, /contact was not found in this workspace/);
  assert.match((await createAppointmentHandler(db, editor, { title: 'x', startTime: '2026-11-10T09:00:00', contactId: 'missing' }, NOW)).message, /contact was not found/);
  assert.equal(saved(db).length, before);
});

test('a viewer, a missing identity and a missing database are refused and nothing is written', async () => {
  const db = fakeDb(seed());
  const viewer = readToolContext({ userId: 'u3', orgId: 'orgA', accessLevel: 'viewer' });
  const input = { title: 'x', startTime: '2026-11-10T09:00:00' };
  assert.match((await createAppointmentHandler(db, viewer, input, NOW)).message, /view this workspace but not book appointments/);
  assert.match((await createAppointmentHandler(db, readToolContext(undefined), input, NOW)).message, /not authenticated/);
  assert.match((await createAppointmentHandler(db, { ...editor, orgId: undefined }, input, NOW)).message, /not authenticated/);
  assert.match((await createAppointmentHandler(null, editor, input, NOW)).message, /NOT booked/);
  assert.equal(saved(db).length, 4);
});

test('a bad request is refused with the reason, and a failed save says the appointment was not saved', async () => {
  const db = fakeDb(seed());
  assert.match((await createAppointmentHandler(db, editor, { title: 'x', startTime: '2026-11-10' }, NOW)).message, /no time of day/);
  assert.match((await createAppointmentHandler(db, editor, { title: 'x', startTime: '2026-11-01T09:00:00' }, NOW)).message, /already passed/);
  db.failWrites.value = true;
  assert.match((await createAppointmentHandler(db, editor, { title: 'x', startTime: '2026-11-12T09:00:00' }, NOW)).message, /could not be saved/);
  assert.equal(saved(db).length, 4);
});
