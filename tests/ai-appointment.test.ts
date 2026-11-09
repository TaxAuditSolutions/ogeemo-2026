import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAiAppointment, canCreateAppointments } from '../src/lib/ai-appointment';

// Monday 9 Nov 2026, 12:00 in Toronto (17:00 UTC).
const NOW = new Date('2026-11-09T17:00:00Z');
const ctx = { userId: 'u1', orgId: 'orgA', timeZone: 'America/Toronto', now: NOW };
const ok = (input: any) => {
  const built = buildAiAppointment(input, ctx);
  assert.equal(built.ok, true, JSON.stringify(built));
  return built as Extract<ReturnType<typeof buildAiAppointment>, { ok: true }>;
};
const bad = (input: any) => {
  const built = buildAiAppointment(input, ctx);
  assert.equal(built.ok, false, 'expected a refusal');
  return (built as { ok: false; error: string }).error;
};

test('an appointment carries the workspace, the author, the appointment type and the fields the Calendar lists by', () => {
  const { appointment, start, end, minutes } = ok({ title: '  Dentist ', startTime: '2026-11-10T15:00:00' });
  assert.equal(appointment.title, 'Dentist');
  assert.equal(appointment.activityType, 'appointment');
  assert.equal(appointment.isScheduled, true);
  assert.equal(appointment.isTodoItem, false);
  assert.equal(appointment.status, 'todo');
  assert.equal(appointment.orgId, 'orgA');
  assert.equal(appointment.userId, 'u1');
  assert.equal(appointment.createdBy, 'u1');
  assert.equal(appointment.projectId, null);
  assert.equal(appointment.contactId, null);
  assert.equal(appointment.duration, 0, 'planned time is never worked or billable time');
  assert.ok(!('workerId' in appointment), 'no assignee: the app reads that as the person who made it');
  assert.equal(start.toISOString(), '2026-11-10T20:00:00.000Z', '3pm in Toronto in November is 20:00 UTC');
  assert.equal(minutes, 60);
  assert.equal(end.getTime() - start.getTime(), 60 * 60_000);
});

test('the length comes from an end time, or a number of minutes, or defaults to an hour', () => {
  assert.equal(ok({ title: 'x', startTime: '2026-11-10T15:00:00', durationMinutes: 30 }).minutes, 30);
  assert.equal(ok({ title: 'x', startTime: '2026-11-10T15:00:00', endTime: '2026-11-10T16:45:00' }).minutes, 105);
  assert.equal(ok({ title: 'x', startTime: '2026-11-10T15:00:00' }).minutes, 60);
});

test('a time sent with an offset keeps it; one without is read in the user zone, including across daylight saving', () => {
  assert.equal(ok({ title: 'x', startTime: '2026-11-10T15:00:00-08:00' }).start.toISOString(), '2026-11-10T23:00:00.000Z');
  // 15 July is daylight time in Toronto (UTC-4), although "now" is in November.
  assert.equal(ok({ title: 'x', startTime: '2027-07-15T15:00:00' }).start.toISOString(), '2027-07-15T19:00:00.000Z');
});

test('a missing title, day, or time of day is refused with a question to ask', () => {
  assert.match(bad({ title: '  ', startTime: '2026-11-10T15:00:00' }), /needs a title/);
  assert.match(bad({ title: 'x' }), /needs a day and a time/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10' }), /no time of day/);
  assert.match(bad({ title: 'x', startTime: 'tomorrow at 3' }), /not a date and time/);
});

test('a time that has already passed, an end before the start, and an absurd length are refused', () => {
  assert.match(bad({ title: 'x', startTime: '2026-11-09T09:00:00' }), /already passed/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10T15:00:00', endTime: '2026-11-10T14:00:00' }), /after the start/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10T15:00:00', endTime: '2026-11-10T15:00:00' }), /after the start/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10T15:00:00', durationMinutes: 2 }), /between 5 minutes and 12 hours/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10T15:00:00', durationMinutes: 5000 }), /between 5 minutes and 12 hours/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10T08:00:00', endTime: '2026-11-11T08:00:00' }), /at most 12 hours/);
  assert.match(bad({ title: 'x', startTime: '2026-11-10T15:00:00', endTime: 'later' }), /not an end time/);
});

test('a start a minute or two in the past is allowed (the user just said "now"), but not an hour', () => {
  assert.equal(ok({ title: 'x', startTime: '2026-11-09T11:58:00' }).appointment.isScheduled, true);
  assert.match(bad({ title: 'x', startTime: '2026-11-09T11:00:00' }), /already passed/);
});

test('location and notes go in the description, and an invalid contact id is refused', () => {
  const { appointment } = ok({ title: 'x', startTime: '2026-11-10T15:00:00', location: ' Tim Hortons, King St ', notes: ' bring the file ' });
  assert.equal(appointment.description, 'Location: Tim Hortons, King St\nbring the file');
  assert.equal(ok({ title: 'x', startTime: '2026-11-10T15:00:00', contactId: 'abc123' }).appointment.contactId, 'abc123');
  assert.match(bad({ title: 'x', startTime: '2026-11-10T15:00:00', contactId: '../other/doc' }), /contact id is not valid/);
});

test('input that tries to set the workspace, author or assignee is ignored', () => {
  const { appointment } = ok({ title: 'x', startTime: '2026-11-10T15:00:00', orgId: 'evil', userId: 'evil', workerId: 'evil', billedInvoiceId: 'inv1', isBillable: true } as any);
  assert.equal(appointment.orgId, 'orgA');
  assert.equal(appointment.userId, 'u1');
  for (const key of ['workerId', 'billedInvoiceId', 'isBillable']) assert.ok(!(key in appointment), key);
});

test('only an editor or above may book an appointment', () => {
  for (const level of ['super_admin', 'org_admin', 'editor']) assert.equal(canCreateAppointments(level), true, level);
  for (const level of ['viewer', '', undefined, 'none']) assert.equal(canCreateAppointments(level), false, String(level));
});
