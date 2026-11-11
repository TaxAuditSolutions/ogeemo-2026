import assert from 'node:assert/strict';
import test from 'node:test';

import { updateContactHandler } from '../src/ai/agent-contact-update-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { NOW, change, ctx, editor, later, seed } from './contact-fixtures';
import { fakeDb } from './fake-db';

const run = (db: any, input: any, c = editor) => updateContactHandler(db, c, input, { confirmed: false, now: NOW });
const apply = async (db: any, input: any) => {
  await updateContactHandler(db, editor, input, { confirmed: false, now: NOW });
  return updateContactHandler(db, editor, input, { confirmed: true, turnStartedAt: later(0.5), now: later(1) });
};

test("only a contact of YOUR workspace can be changed: another workspace's and a made-up id get the same refusal", async () => {
  for (const contactId of ['cElsewhere', 'nope', '../x', '']) {
    const db = fakeDb(seed());
    const result = await run(db, change({ contactId }));
    assert.equal(result.status, 'refused', contactId);
    assert.match(result.message, /not found in this workspace/, contactId);
    assert.deepEqual(db.store.aiPendingChanges, {}, 'nothing was saved as pending');
  }
  const db = fakeDb(seed());
  assert.equal(db.store.contacts.cElsewhere.cellPhone, undefined);
});

test('a viewer, a guest and a missing workspace are refused, and nothing is read or written', async () => {
  const db = fakeDb(seed());
  const before = JSON.stringify(db.store);
  assert.match((await run(db, change(), ctx('u1', 'viewer'))).message, /view this workspace but not change contacts/);
  assert.equal((await run(db, change(), ctx('u1'))).status, 'refused');
  assert.match((await run(db, change(), readToolContext(undefined))).message, /not authenticated/);
  assert.match((await run(db, change(), readToolContext({ userId: 'u1', accessLevel: 'editor' }))).message, /not authenticated/);
  assert.match((await run(null, change())).message, /not available/);
  assert.equal(JSON.stringify(db.store), before);
});

test('an Employee or Contractor cannot be renamed or moved from chat, but their plain details can change', async () => {
  const refusedRename = await run(fakeDb(seed()), { contactId: 'cWorker', name: 'Samuel Worker' });
  assert.equal(refusedRename.status, 'refused');
  assert.match(refusedRename.message, /Workers page/);
  assert.match((await run(fakeDb(seed()), { contactId: 'cWorker', folder: 'Clients' })).message, /Workers page/);
  assert.match((await run(fakeDb(seed()), { contactId: 'c1', folder: 'Employees' })).message, /Workers page/);
  const db = fakeDb(seed());
  const done = await apply(db, { contactId: 'cWorker', cellPhone: '555-0001' });
  assert.equal(done.status, 'done');
  assert.equal(db.store.contacts.cWorker.documentFolderId, 'doc1', 'their document folder link is untouched');
  assert.equal(db.store.contacts.cWorker.userId, 'u9', 'and so is their sign-in link');
});

test('a clear removes only that detail, and the name and folder can never be cleared', async () => {
  const db = fakeDb(seed());
  const done = await apply(db, { contactId: 'c1', clearFields: ['cellPhone'] });
  assert.equal(done.status, 'done');
  assert.equal(db.store.contacts.c1.cellPhone, '');
  assert.equal(db.store.contacts.c1.name, 'Dana Whitfield');
  assert.match((await run(fakeDb(seed()), { contactId: 'c1', clearFields: ['name'] })).message, /always has a name and a folder/);
});

test('a move to another folder uses a folder of THIS workspace only', async () => {
  const db = fakeDb(seed());
  const done = await apply(db, { contactId: 'c1', folder: 'Miscellaneous' });
  assert.equal(done.status, 'done');
  assert.equal(db.store.contacts.c1.folderId, 'fMisc');
  const wrong = await run(fakeDb(seed()), { contactId: 'c1', folder: 'Other Workspace Folder' });
  assert.equal(wrong.status, 'refused', "another workspace's folder is not offered");
  assert.match(wrong.message, /no folder called/);
});

test('a change that makes the contact match another is held back until the user says so', async () => {
  const dupEmail = await run(fakeDb(seed()), { contactId: 'c1', email: 'DAN@okafor.ca' });
  assert.equal(dupEmail.status, 'refused');
  assert.match(dupEmail.message, /same email address/);
  assert.match(dupEmail.message, /allowDuplicate/);
  const dupName = await run(fakeDb(seed()), { contactId: 'c1', name: 'daniel  okafor' });
  assert.equal(dupName.status, 'refused');
  assert.match(dupName.message, /same name/);
  const forced = await run(fakeDb(seed()), { contactId: 'c1', email: 'dan@okafor.ca', allowDuplicate: true });
  assert.equal(forced.status, 'preview');
  const unchanged = await run(fakeDb(seed()), { contactId: 'c1', cellPhone: '1' });
  assert.equal(unchanged.status, 'preview', 'a change that touches neither name nor email is never checked for duplicates');
  const other = await run(fakeDb(seed()), { contactId: 'c1', email: 'sam@else.com' });
  assert.equal(other.status, 'preview', "another workspace's contacts are not compared");
});

test('a write that fails is reported as a failure, the contact is unchanged, and no success is claimed', async () => {
  const db = fakeDb(seed());
  await run(db, change());
  db.failWrites.value = true;
  const result = await updateContactHandler(db, editor, change(), { confirmed: true, turnStartedAt: later(0.5), now: later(1) });
  assert.equal(result.status, 'refused');
  assert.equal(result.success, false);
  assert.match(result.message, /assume nothing changed/);
  assert.equal(db.store.contacts.c1.cellPhone, '(705) 555-0142');
});
