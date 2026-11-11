import assert from 'node:assert/strict';
import test from 'node:test';

import { changeEventHandler } from '../src/ai/agent-event-tool';
import { NOW, cancel, editor, later, move, seed } from './event-fixtures';
import { fakeDb } from './fake-db';

const run = (db: any, input: any) => changeEventHandler(db, editor, input, { confirmed: false, now: NOW });

test("an invoiced event, one with recorded time, and one with an open work order cannot be cancelled (the Calendar's own rule)", async () => {
  const cases: Array<[string, RegExp]> = [['eBilled', /on an invoice/], ['eWorked', /recorded time/], ['eWo', /work order/]];
  for (const [eventId, words] of cases) {
    const db = fakeDb(seed());
    const result = await run(db, cancel(eventId));
    assert.equal(result.status, 'refused', eventId);
    assert.match(result.message, words, eventId);
    assert.match(result.message, /Nothing was cancelled/);
    assert.deepEqual(db.store.aiPendingChanges, {}, 'no preview is offered for the impossible');
  }
});

test('an event on an invoice line cannot be cancelled either', async () => {
  const db = fakeDb(seed());
  db.store.invoiceLineItems.l1 = { orgId: 'orgA', sourceEntryId: 'e1' };
  const result = await run(db, cancel('e1'));
  assert.equal(result.status, 'refused');
  assert.match(result.message, /still in use/);
});

test("moving follows the Calendar's own rule: the planned slot of an invoiced or worked event may move, because billing uses the recorded time and not the slot", async () => {
  // The app locks an invoiced entry's duration, sessions, billable flag, rate and client, but not its start and end,
  // and the Calendar lets you drag it. The Co-Pilot is not stricter than the app.
  const billed = await run(fakeDb(seed()), move({ eventId: 'eBilled', startTime: '2026-11-13T08:00:00-05:00' }));
  assert.equal(billed.status, 'preview');
  const worked = await run(fakeDb(seed()), move({ eventId: 'eWorked', startTime: '2026-11-13T15:00:00-05:00' }));
  assert.equal(worked.status, 'preview');
  const db = fakeDb(seed());
  const input = move({ eventId: 'eBilled', startTime: '2026-11-13T08:00:00-05:00' });
  await changeEventHandler(db, editor, input, { confirmed: false, now: NOW });
  await changeEventHandler(db, editor, input, { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  const saved = db.store.tasks.eBilled;
  assert.equal(saved.billedInvoiceId, 'inv1', 'the invoice link is untouched');
  assert.equal(saved.duration, 3600, 'the billed time is untouched');
});

test('a move onto another of your events is held back with a free time, until you say to go ahead', async () => {
  const db = fakeDb(seed());
  const clash = await run(db, move({ startTime: '2026-11-12T17:30:00-05:00' }));
  assert.equal(clash.status, 'refused');
  assert.match(clash.message, /overlaps "Dentist"/);
  assert.match(clash.message, /next free time/);
  assert.deepEqual(db.store.aiPendingChanges, {});
  const forced = await run(fakeDb(seed()), move({ startTime: '2026-11-12T17:30:00-05:00', allowDoubleBooking: true }));
  assert.equal(forced.status, 'preview');
  const ownSlot = await run(fakeDb(seed()), move({ startTime: '2026-11-12T15:30:00-05:00' }));
  assert.equal(ownSlot.status, 'preview', 'an event never clashes with itself');
});

test('cancelling a task that is a project step also takes the step out of the project, and keeps the others', async () => {
  const db = fakeDb(seed());
  await changeEventHandler(db, editor, cancel('eStep'), { confirmed: false, now: NOW });
  const done = await changeEventHandler(db, editor, cancel('eStep'), { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.equal(done.status, 'done');
  assert.deepEqual(db.store.projects.p1.steps.map((s: any) => s.id), ['other']);
});

test('a write that fails is reported as a failure, the event is still there, and no success is claimed', async () => {
  const db = fakeDb(seed());
  await changeEventHandler(db, editor, cancel(), { confirmed: false, now: NOW });
  db.failWrites.value = true;
  const result = await changeEventHandler(db, editor, cancel(), { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.equal(result.status, 'refused');
  assert.equal(result.success, false);
  assert.match(result.message, /assume nothing changed/);
  assert.ok(db.store.tasks.e1);
});
