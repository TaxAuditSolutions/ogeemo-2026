import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { getCalendarHandler } from '../src/ai/agent-calendar-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

// Monday 9 Nov 2026, 12:00 in Toronto.
const NOW = new Date('2026-11-09T17:00:00Z');
const seed = () => ({
  users: { u1: { contactId: 'cMe' } },
  tasks: {
    t1: { orgId: 'orgA', userId: 'u1', title: 'Team call', isScheduled: true, status: 'todo', start: new Date('2026-11-10T20:00:00Z'), end: new Date('2026-11-10T21:00:00Z') },
    t2: { orgId: 'orgA', userId: 'u2', title: 'Someone else busy', isScheduled: true, status: 'todo', start: new Date('2026-11-10T22:00:00Z'), end: new Date('2026-11-10T23:00:00Z') },
    t3: { orgId: 'orgB', userId: 'u1', title: 'Other workspace', isScheduled: true, status: 'todo', start: new Date('2026-11-10T15:00:00Z'), end: new Date('2026-11-10T16:00:00Z') },
    t4: { orgId: 'orgA', userId: 'boss', workerId: 'cMe', title: 'Assigned by contact id', isScheduled: true, status: 'todo', start: new Date('2026-11-11T15:00:00Z'), end: new Date('2026-11-11T16:00:00Z') },
  },
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });

test('reading the calendar lists only my events for that day, in my time zone, never another workspace', async () => {
  const result = await getCalendarHandler(fakeDb(seed()), editor, { date: '2026-11-10' }, NOW);
  assert.equal(result.success, true);
  assert.deepEqual(result.events.map((e) => e.title), ['Team call']);
  assert.match(result.events[0].when, /3:00.*4:00/);
  assert.match(result.message, /You have 1 event on 2026-11-10/);
});

test('reading defaults to today, covers several days, includes events assigned by contact id, and says when empty', async () => {
  const db = fakeDb(seed());
  const days = await getCalendarHandler(db, editor, { date: '2026-11-10', days: 3 }, NOW);
  assert.deepEqual(days.events.map((e) => e.title), ['Team call', 'Assigned by contact id']);
  const today = await getCalendarHandler(db, editor, {}, NOW);
  assert.match(today.message, /Nothing is on your calendar on 2026-11-09/);
  assert.deepEqual(today.events, []);
});

test('the day is the local day: an evening event is on its own date, not the next UTC date', async () => {
  const db = fakeDb({
    tasks: { late: { orgId: 'orgA', userId: 'u1', title: 'Late call', isScheduled: true, status: 'todo', start: new Date('2026-11-11T02:00:00Z'), end: new Date('2026-11-11T03:00:00Z') } },
  });
  assert.deepEqual((await getCalendarHandler(db, editor, { date: '2026-11-10' }, NOW)).events.map((e) => e.title), ['Late call']);
  assert.deepEqual((await getCalendarHandler(db, editor, { date: '2026-11-11' }, NOW)).events, []);
});

test('a finished event is listed as done', async () => {
  const db = fakeDb({
    tasks: { d: { orgId: 'orgA', userId: 'u1', title: 'Old', isScheduled: true, status: 'done', start: new Date('2026-11-10T14:00:00Z'), end: new Date('2026-11-10T15:00:00Z') } },
  });
  assert.equal((await getCalendarHandler(db, editor, { date: '2026-11-10' }, NOW)).events[0].status, 'done');
});

test('reading refuses a bad date, a missing identity and a missing database', async () => {
  const db = fakeDb(seed());
  assert.match((await getCalendarHandler(db, editor, { date: 'tomorrow' }, NOW)).message, /YYYY-MM-DD/);
  assert.match((await getCalendarHandler(db, readToolContext(undefined), {}, NOW)).message, /not authenticated/);
  assert.match((await getCalendarHandler(null, editor, {}, NOW)).message, /Database not available/);
});

test('the agent offers both calendar tools and the Co-Pilot is told how to use them', () => {
  const agent = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(agent, /tools: \[[^\]]*createAppointmentTool[^\]]*getCalendarTool[^\]]*\]/);
  assert.ok(agent.includes('createAppointmentHandler(') && agent.includes('getCalendarHandler('));
  assert.match(agent, /\*\*Appointments\*\*/);
});
