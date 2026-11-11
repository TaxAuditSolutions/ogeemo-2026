import assert from 'node:assert/strict';
import test from 'node:test';

import { updateContactHandler } from '../src/ai/agent-contact-update-tool';
import { NOW, change, editor, later, seed } from './contact-fixtures';
import { fakeDb } from './fake-db';

const turn = (minutes: number) => ({ confirmed: true, turnStartedAt: later(minutes - 0.5), now: later(minutes) });
const first = { confirmed: false, now: NOW };

test('the first call only previews: nothing is saved to the contact, and the plan is kept as pending', async () => {
  const db = fakeDb(seed());
  const before = JSON.stringify(db.store.contacts);
  const result = await updateContactHandler(db, editor, change(), first);
  assert.equal(result.status, 'preview');
  assert.equal(result.success, false, 'a preview is not a success');
  assert.match(result.message, /Ready to change Dana Whitfield: cell phone from "\(705\) 555-0142" to "555-0199"\. Nothing has changed yet\./);
  assert.equal(JSON.stringify(db.store.contacts), before, 'no contact was touched');
  assert.equal(db.store.aiPendingChanges.u1.kind, 'contact');
});

test('a yes after the preview saves only the planned fields, refreshes the search words, and stamps who changed it', async () => {
  const db = fakeDb(seed());
  await updateContactHandler(db, editor, change({ email: 'Dana@NEW.com' }), first);
  const done = await updateContactHandler(db, editor, change({ email: 'Dana@NEW.com' }), turn(1));
  assert.equal(done.status, 'done');
  assert.equal(done.success, true);
  assert.match(done.message, /Updated Dana Whitfield: email is now "dana@new.com"; cell phone is now "555-0199"/);
  const saved = db.store.contacts.c1;
  assert.equal(saved.cellPhone, '555-0199');
  assert.equal(saved.email, 'dana@new.com');
  assert.equal(saved.updatedBy, 'u1');
  assert.ok(saved.keywords.includes('dana@new.com') && saved.keywords.includes('new'), 'the search words follow the new email');
  assert.ok(!saved.keywords.includes('dana@acme.com'), 'and the old email is no longer a search word');
  assert.equal(db.store.aiPendingChanges.u1, undefined);
});

test('everything the plan did not name is left exactly as it was, including notes and the SIN', async () => {
  const db = fakeDb(seed());
  await updateContactHandler(db, editor, change(), first);
  await updateContactHandler(db, editor, change(), turn(1));
  const saved = db.store.contacts.c1;
  assert.equal(saved.notes, 'KEEP THESE NOTES');
  assert.equal(saved.sin, '046454286');
  assert.equal(saved.businessName, 'Acme');
  assert.equal(saved.folderId, 'fClients');
  assert.equal(saved.orgId, 'orgA');
});

test('THE GATE: with no yes read by the server, a repeated call only previews, and confirmed defaults to no', async () => {
  const db = fakeDb(seed());
  await updateContactHandler(db, editor, change(), first);
  assert.equal((await updateContactHandler(db, editor, change(), { confirmed: false, now: later(1) })).status, 'preview');
  assert.equal((await updateContactHandler(db, editor, change(), { now: later(1) })).status, 'preview');
  assert.equal(db.store.contacts.c1.cellPhone, '(705) 555-0142');
});

test('THE GATE: a yes with no preview first is not enough, and a preview made THIS turn cannot be confirmed this turn', async () => {
  const db = fakeDb(seed());
  const thisTurn = { confirmed: true, turnStartedAt: NOW, now: NOW };
  assert.equal((await updateContactHandler(db, editor, change(), thisTurn)).status, 'preview');
  assert.equal((await updateContactHandler(db, editor, change(), { ...thisTurn, now: later(0.01) })).status, 'preview');
  assert.equal(db.store.contacts.c1.cellPhone, '(705) 555-0142');
  assert.equal((await updateContactHandler(db, editor, change(), turn(2))).status, 'done', 'the next turn applies it');
});

test('THE GATE: a yes only confirms the exact plan shown, never a different value, field or contact', async () => {
  const cases: Array<[any, any]> = [
    [change(), change({ cellPhone: '555-0100' })],
    [change(), change({ contactId: 'c2' })],
    [change(), change({ email: 'x@y.com' })],
    [change(), { contactId: 'c1', clearFields: ['cellPhone'] }],
    [{ contactId: 'c1', clearFields: ['cellPhone'] }, change()],
  ];
  for (const [shown, asked] of cases) {
    const db = fakeDb(seed());
    const before = JSON.stringify(db.store.contacts);
    await updateContactHandler(db, editor, shown, first);
    const result = await updateContactHandler(db, editor, asked, turn(1));
    assert.equal(result.status, 'preview', `${JSON.stringify(shown)} then ${JSON.stringify(asked)}`);
    assert.equal(JSON.stringify(db.store.contacts), before);
  }
});
