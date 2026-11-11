import assert from 'node:assert/strict';
import test from 'node:test';

import { canUpdateContacts, describeContactDone, describeContactPlan } from '../src/lib/ai-contact-update';
import { isPreviewReply } from '../src/lib/ai-confirm';
import { plan, refused, worker } from './contact-fixtures';

test('a changed detail becomes a plan that names what it was and what it will be', () => {
  const p = plan({ cellPhone: ' 555-0199 ', email: 'DANA@NEW.COM' });
  assert.deepEqual(p.patch, { cellPhone: '555-0199', email: 'dana@new.com' });
  assert.deepEqual(p.changes.map((c: any) => [c.label, c.from, c.to]), [['email', 'dana@acme.com', 'dana@new.com'], ['cell phone', '(705) 555-0142', '555-0199']]);
});

test('a detail that is already that value is not a change, and nothing to change is refused', () => {
  assert.match(refused({ cellPhone: '(705) 555-0142' }), /nothing needs to change/);
  assert.match(refused({ email: 'Dana@Acme.com' }), /nothing needs to change/, 'case in an email is not a change');
  assert.match(refused({}), /nothing needs to change/);
  const p = plan({ cellPhone: '(705) 555-0142', city: 'Barrie' });
  assert.deepEqual(Object.keys(p.patch), ['city'], 'only the real change is in the plan');
});

test('the name needs two characters, and is tidied the way the Hub tidies it', () => {
  assert.match(refused({ name: 'D' }), /full name/);
  assert.equal(plan({ name: '  Dana   M   Whitfield ' }).patch.name, 'Dana M Whitfield');
});

test('a bad email is refused, and so is an empty one (that is what clearFields is for)', () => {
  assert.match(refused({ email: 'not-an-email' }), /does not look like an email/);
  assert.match(refused({ email: '   ' }), /clearFields/);
  assert.match(refused({ cellPhone: '' }), /clearFields/);
});

test('a detail can be cleared, but the name and the folder never can', () => {
  const p = plan({ clearFields: ['cellPhone', 'email'] });
  assert.deepEqual(p.patch, { cellPhone: '', email: '' });
  assert.match(describeContactDone(p), /cell phone cleared/);
  assert.match(refused({ clearFields: ['name'] }), /always has a name and a folder/);
  assert.match(refused({ clearFields: ['folder'] }), /always has a name and a folder/);
  assert.match(refused({ clearFields: ['notes'] }), /not a detail that can be cleared/);
  assert.match(refused({ clearFields: ['sin'] }), /not a detail that can be cleared/);
  assert.match(refused({ email: 'a@b.co', clearFields: ['email'] }), /both changed and cleared/);
  assert.match(refused({ clearFields: ['city'] }), /nothing needs to change/, 'clearing what is already empty is no change');
});

test('moving to another folder uses a folder of THIS workspace by name, and shows names not ids', () => {
  const p = plan({ folder: 'miscellaneous' });
  assert.equal(p.patch.folderId, 'fMisc');
  assert.deepEqual([p.changes[0].from, p.changes[0].to], ['Clients', 'Miscellaneous']);
  assert.match(refused({ folder: 'Nowhere' }), /no folder called "Nowhere".*The folders are/);
  assert.match(refused({ folder: '' }), /no folder called/);
});

test('Employees and Contractors cannot be renamed or moved in or out of those folders from chat', () => {
  assert.match(refused({ name: 'Samuel Worker' }, worker), /Workers page/);
  assert.match(refused({ folder: 'Clients' }, worker), /Workers page/);
  assert.match(refused({ folder: 'Employees' }), /Workers page/);
  assert.match(refused({ folder: 'Contractors' }, worker), /Workers page/);
  assert.equal(plan({ email: 'sam@new.com' }, worker).patch.email, 'sam@new.com', 'their plain details can change');
  assert.equal(plan({ name: 'Sam Worker', cellPhone: '1' }, worker).patch.cellPhone, '1', 'the same name is not a rename');
});

test('notes, SIN, pay and dates are not fields this accepts, so they cannot reach a plan', () => {
  const p = plan({ cellPhone: '1', notes: 'overwrite me', sin: '046 454 286', payRate: 99, hireDate: '2026-01-01' });
  assert.deepEqual(Object.keys(p.patch), ['cellPhone']);
});

test('a bad id is refused, and values are cut to length', () => {
  assert.match(refused({ contactId: '../x', city: 'a' }), /Say which contact/);
  assert.match(refused({ contactId: '', city: 'a' }), /Say which contact/);
  assert.equal(plan({ city: 'x'.repeat(500) }).patch.city.length, 80);
});

test('the preview keeps the sentence the server looks for, and the done message does not claim a preview', () => {
  const p = plan({ cellPhone: '555-0199', city: 'Barrie' });
  const preview = describeContactPlan(p);
  assert.match(preview, /^Ready to change Dana Whitfield: /);
  assert.match(preview, /cell phone from "\(705\) 555-0142" to "555-0199"; city from \(empty\) to "Barrie"\. Nothing has changed yet\.$/);
  assert.equal(isPreviewReply(preview), true);
  assert.equal(isPreviewReply(describeContactDone(p)), false);
});

test('only an editor or above may change a contact', () => {
  for (const level of ['super_admin', 'org_admin', 'editor']) assert.equal(canUpdateContacts(level), true, level);
  for (const level of ['viewer', '', undefined, 'none']) assert.equal(canUpdateContacts(level), false, String(level));
});
