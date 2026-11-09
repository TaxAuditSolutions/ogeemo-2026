import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  billedDeleteProblem,
  billedUpdateProblem,
  checkBillableRate,
  isBilledEntry,
  lockedFieldChanges,
  projectDeleteProblem,
  timeLogProblem,
  withoutLockedActivityFields,
} from '../src/lib/time-entry-lock';

const billedLog = {
  billedInvoiceId: 'inv1',
  durationSeconds: 3600,
  startTime: new Date('2026-10-01T09:00:00'),
  endTime: new Date('2026-10-01T10:00:00'),
  isBillable: true,
  billableRate: 100,
  contactId: 'c1',
  workerId: 'w1',
  notes: 'old',
};

test('an entry with an invoice id is billed, others are not', () => {
  assert.equal(isBilledEntry(billedLog), true);
  assert.equal(isBilledEntry({ billedInvoiceId: null }), false);
  assert.equal(isBilledEntry({}), false);
  assert.equal(isBilledEntry(undefined), false);
});

test('an entry that is not invoiced can be changed and deleted freely', () => {
  const free = { ...billedLog, billedInvoiceId: null };
  assert.equal(billedUpdateProblem(free, { durationSeconds: 7200 }, 'time log'), null);
  assert.equal(billedDeleteProblem(free, 'time log'), null);
});

test('an invoiced time log cannot be deleted, and the message says how to release it', () => {
  const message = billedDeleteProblem(billedLog, 'time log')!;
  assert.match(message, /on an invoice, so it cannot be deleted/);
  assert.match(message, /Delete the invoice/);
});

test('changing hours, rate or client of an invoiced time log is refused and names what changed', () => {
  const message = billedUpdateProblem(billedLog, { durationSeconds: 7200, billableRate: 150, contactId: 'c2' }, 'time log')!;
  assert.match(message, /time, rate, client cannot be changed/);
});

test('notes and a subject can still be edited on an invoiced entry, and saving the same values is not a change', () => {
  assert.equal(billedUpdateProblem(billedLog, { notes: 'new', subject: 'x' }, 'time log'), null);
  assert.equal(billedUpdateProblem(billedLog, { durationSeconds: 3600, billableRate: 100, contactId: 'c1' }, 'time log'), null);
  assert.equal(
    billedUpdateProblem(billedLog, { startTime: new Date('2026-10-01T09:00:00'), endTime: new Date('2026-10-01T10:00:00') }, 'time log'),
    null
  );
});

test('moving the start of an invoiced time log is refused', () => {
  assert.deepEqual(lockedFieldChanges(billedLog, { startTime: new Date('2026-10-02T09:00:00') }, 'time log'), ['start time']);
});

test('Firestore timestamps compare by the moment they hold', () => {
  const stamp = (d: Date) => ({ toDate: () => d });
  const current = { ...billedLog, startTime: stamp(new Date('2026-10-01T09:00:00')) };
  assert.deepEqual(lockedFieldChanges(current, { startTime: new Date('2026-10-01T09:00:00') }, 'time log'), []);
});

const billedActivity = {
  billedInvoiceId: 'inv1',
  duration: 5400,
  sessions: [{ id: 's1', durationSeconds: 5400 }],
  isBillable: true,
  billableRate: 80,
  contactId: 'c1',
  title: 'Site visit',
};

test('an invoiced activity keeps its time, sessions, rate and client, but its title and status can change', () => {
  assert.equal(billedUpdateProblem(billedActivity, { title: 'Renamed', status: 'done' }, 'activity'), null);
  assert.match(billedUpdateProblem(billedActivity, { duration: 9000 }, 'activity')!, /time cannot be changed/);
  assert.match(billedUpdateProblem(billedActivity, { sessions: [{ id: 's1', durationSeconds: 9000 }] }, 'activity')!, /time sessions/);
  assert.match(billedUpdateProblem(billedActivity, { isBillable: false }, 'activity')!, /billable setting/);
  assert.match(billedUpdateProblem(billedActivity, { contactId: null }, 'activity')!, /client/);
});

test('the billing fields are removed from a save of an invoiced activity', () => {
  const save = { title: 'x', duration: 1, durationSource: 'sessions', sessions: [], isBillable: false, billableRate: 0, contactId: 'z', status: 'done' };
  assert.deepEqual(withoutLockedActivityFields(save), { title: 'x', status: 'done' });
});

test('a project with invoiced activities cannot be deleted, and the message counts them', () => {
  assert.equal(projectDeleteProblem([{ billedInvoiceId: null }, {}]), null);
  assert.match(projectDeleteProblem([{ billedInvoiceId: 'a' }, {}])!, /1 activity in this project is on invoices/);
  assert.match(projectDeleteProblem([{ billedInvoiceId: 'a' }, { billedInvoiceId: 'b' }])!, /2 activities in this project are on invoices/);
});

test('a billable rate is blank (0), zero or more, and to the cent', () => {
  assert.deepEqual(checkBillableRate(''), { ok: true, rate: 0 });
  assert.deepEqual(checkBillableRate(undefined), { ok: true, rate: 0 });
  assert.deepEqual(checkBillableRate('95.555'), { ok: true, rate: 95.56 });
  assert.deepEqual(checkBillableRate(0), { ok: true, rate: 0 });
  assert.equal(checkBillableRate(-5).ok, false);
  assert.equal(checkBillableRate('abc').ok, false);
  assert.equal(checkBillableRate(1_000_000).ok, false);
});

const nine = new Date('2026-10-01T09:00:00');
const ten = new Date('2026-10-01T10:00:00');

test('a time log needs an end after its start', () => {
  assert.equal(timeLogProblem({ startTime: nine, endTime: ten, durationSeconds: 3600 }), null);
  assert.match(timeLogProblem({ startTime: ten, endTime: nine, durationSeconds: 60 })!, /end time must be after/);
  assert.match(timeLogProblem({ startTime: nine, endTime: nine, durationSeconds: 60 })!, /end time must be after/);
  assert.match(timeLogProblem({ durationSeconds: 60 })!, /needs a start and an end/);
});

test('the recorded length may be shorter than the clock span (a break) but never longer', () => {
  assert.equal(timeLogProblem({ startTime: nine, endTime: ten, durationSeconds: 3000 }), null);
  assert.equal(timeLogProblem({ startTime: nine, endTime: ten, durationSeconds: 3601 }), null);
  assert.match(timeLogProblem({ startTime: nine, endTime: ten, durationSeconds: 7200 })!, /longer than the time between/);
  assert.match(timeLogProblem({ startTime: nine, endTime: ten, durationSeconds: 0 })!, /more than zero/);
  assert.match(timeLogProblem({ startTime: nine, endTime: ten, durationSeconds: -5 })!, /more than zero/);
});

test('a partial update is checked against the stored times, and a bad rate is refused', () => {
  const stored = { startTime: nine, endTime: ten, durationSeconds: 3600 };
  assert.equal(timeLogProblem({ notes: 'only notes' }, stored), null);
  assert.match(timeLogProblem({ durationSeconds: 9000 }, stored)!, /longer than the time between/);
  assert.match(timeLogProblem({ endTime: nine }, stored)!, /end time must be after/);
  assert.match(timeLogProblem({ billableRate: -1 }, stored)!, /cannot be negative/);
  assert.equal(timeLogProblem({ endTime: { toDate: () => ten } }, { ...stored, endTime: ten }), null);
});
test('every path that deletes or changes an activity or time log goes through the lock', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  const body = (source: string, name: string) => source.slice(source.indexOf(`export async function ${name}(`)).split(/\r?\n}/)[0];
  const projects = read('src/services/project-service.ts');
  assert.match(body(projects, 'deleteTask'), /billedDeleteProblem\(/);
  assert.match(body(projects, 'deleteTodos'), /billedDeleteProblem\(/);
  assert.match(body(projects, 'updateTask'), /billedUpdateProblem\(/);
  assert.match(body(projects, 'deleteProject'), /projectDeleteProblem\(/);
  assert.match(body(projects, 'deleteProjects'), /projectDeleteProblem\(/);
  const logs = read('src/services/timelog-service.ts');
  assert.match(body(logs, 'deleteTimeLog'), /billedDeleteProblem\(/);
  assert.match(body(logs, 'updateTimeLog'), /billedUpdateProblem\(/);
  assert.match(body(logs, 'updateTimeLog'), /timeLogProblem\(/);
  assert.match(body(logs, 'addTimeLog'), /timeLogProblem\(/);
});

test('the ritual delete only touches the signed-in user, and bulk deletes are batched', () => {
  const projects = fs.readFileSync('src/services/project-service.ts', 'utf8');
  const body = (name: string) => projects.slice(projects.indexOf(`export async function ${name}(`)).split(/\r?\n}/)[0];
  assert.match(body('deleteRitualTasks'), /where\("userId", "==", userId\)/);
  for (const name of ['deleteRitualTasks', 'deleteTodos', 'deleteProjects', 'deleteProject']) {
    assert.match(body(name), /chunkItems\(/, `${name} must write in batches`);
  }
});