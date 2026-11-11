import assert from 'node:assert/strict';
import test from 'node:test';

import { updateContactHandler } from '../src/ai/agent-contact-update-tool';
import { NOW, change, ctx, editor, later, seed } from './contact-fixtures';
import { fakeDb } from './fake-db';

const turn = (minutes: number) => ({ confirmed: true, turnStartedAt: later(minutes - 0.5), now: later(minutes) });
const first = { confirmed: false, now: NOW };

test('THE GATE: a preview goes stale after 10 minutes, and a newer preview replaces an older one', async () => {
  const stale = fakeDb(seed());
  await updateContactHandler(stale, editor, change(), first);
  assert.equal((await updateContactHandler(stale, editor, change(), turn(11))).status, 'preview');
  const replaced = fakeDb(seed());
  await updateContactHandler(replaced, editor, change(), first);
  await updateContactHandler(replaced, editor, change({ contactId: 'c2', cellPhone: '1' }), { confirmed: false, now: later(1) });
  assert.equal((await updateContactHandler(replaced, editor, change(), turn(2))).status, 'preview', 'the first plan is no longer pending');
  assert.equal(replaced.store.contacts.c1.cellPhone, '(705) 555-0142');
});

test('THE GATE: if the contact changed after the preview, nothing is applied', async () => {
  const db = fakeDb(seed());
  await updateContactHandler(db, editor, change(), first);
  db.store.contacts.c1.cellPhone = '999-9999';
  const result = await updateContactHandler(db, editor, change(), turn(1));
  assert.notEqual(result.status, 'done');
  assert.equal(db.store.contacts.c1.cellPhone, '999-9999', 'the newer value is not overwritten');
});

test('THE GATE: a pending CALENDAR change cannot be confirmed as a contact change, and the new preview replaces it', async () => {
  const db = fakeDb(seed());
  db.store.aiPendingChanges.u1 = { orgId: 'orgA', eventId: 'e1', action: 'cancel', fromStart: 1, fromEnd: 2, toStart: null, toEnd: null, allowDoubleBooking: false, createdAt: NOW.getTime() };
  const result = await updateContactHandler(db, editor, change(), turn(1));
  assert.equal(result.status, 'preview', 'a calendar plan is not a contact plan');
  assert.equal(db.store.aiPendingChanges.u1.kind, 'contact');
  assert.equal(db.store.contacts.c1.cellPhone, '(705) 555-0142');
});

test("one person's pending change is not another's", async () => {
  const db = fakeDb(seed());
  await updateContactHandler(db, editor, change(), first);
  const other = await updateContactHandler(db, ctx('u2', 'editor'), change(), turn(1));
  assert.equal(other.status, 'preview', 'u2 has no pending change of their own');
  assert.equal(db.store.contacts.c1.cellPhone, '(705) 555-0142');
});
