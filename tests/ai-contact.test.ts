import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAiContact, canCreateContacts } from '../src/lib/ai-contact';
import { generateContactKeywords } from '../src/lib/contact-keywords';

const NOW = new Date('2026-11-10T12:00:00Z');
const ctx = { userId: 'u1', orgId: 'orgA', now: NOW };
const folders = [
  { id: 'f-misc', name: 'Miscellaneous', isSystem: true },
  { id: 'f-clients', name: 'Clients' },
  { id: 'f-emp', name: 'Employees', isSystem: true },
  { id: 'f-con', name: 'Contractors', isSystem: true },
];

test('a contact is built with every field the app expects, trimmed, with the default folder and search keywords', () => {
  const built = buildAiContact({ name: '  Jane   Doe ', email: ' Jane@Acme.COM ', businessName: 'Acme', cellPhone: '705-555-0100' }, ctx, folders);
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.equal(built.folderName, 'Miscellaneous');
  assert.deepEqual(built.contact, {
    name: 'Jane Doe',
    email: 'jane@acme.com',
    businessName: 'Acme',
    cellPhone: '705-555-0100',
    folderId: 'f-misc',
    userId: 'u1',
    orgId: 'orgA',
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: NOW,
    updatedAt: NOW,
    keywords: generateContactKeywords({ name: 'Jane Doe', email: 'jane@acme.com', businessName: 'Acme' }),
  });
});

test('the keywords are the ones the Contacts Hub builds, so both find the contact by the same words', () => {
  const keywords = generateContactKeywords({ name: 'Jane Doe', email: 'jane@acme.com' });
  for (const word of ['jane doe', 'jane', 'doe', 'jane@acme.com', 'acme', 'com']) assert.ok(keywords.includes(word), word);
  assert.deepEqual(generateContactKeywords({}), []);
});

test('a folder is found by name or path, and an unknown folder is refused with the list to choose from', () => {
  const ok = buildAiContact({ name: 'Jane Doe', folder: 'clients' }, ctx, folders);
  assert.equal(ok.ok && ok.contact.folderId, 'f-clients');
  const bad = buildAiContact({ name: 'Jane Doe', folder: 'Nope' }, ctx, folders);
  assert.equal(bad.ok, false);
  assert.match(!bad.ok ? bad.error : '', /no folder called "Nope".*Clients/);
});

test('a short name, a bad email and a workspace with no folders are refused', () => {
  assert.equal(buildAiContact({ name: 'J' }, ctx, folders).ok, false);
  assert.equal(buildAiContact({}, ctx, folders).ok, false);
  const email = buildAiContact({ name: 'Jane Doe', email: 'not-an-email' }, ctx, folders);
  assert.match(!email.ok ? email.error : '', /does not look like an email/);
  const none = buildAiContact({ name: 'Jane Doe' }, ctx, []);
  assert.match(!none.ok ? none.error : '', /no contact folders/);
});

test('Employees and Contractors are not created by the assistant, and no SIN, pay or date field is ever copied', () => {
  const worker = buildAiContact({ name: 'Jane Doe', folder: 'Employees' }, ctx, folders);
  assert.match(!worker.ok ? worker.error : '', /Employees and Contractors need pay and document setup/);
  const sneaky = buildAiContact({ name: 'Jane Doe', sin: '046454286', payRate: 99, hireDate: '2026-01-01', orgId: 'evil', userId: 'evil' } as any, ctx, folders);
  assert.equal(sneaky.ok, true);
  if (!sneaky.ok) return;
  for (const key of ['sin', 'payRate', 'hireDate']) assert.ok(!(key in sneaky.contact), `${key} was copied`);
  assert.equal(sneaky.contact.orgId, 'orgA');
  assert.equal(sneaky.contact.userId, 'u1');
});

test('only an editor or above may add a contact', () => {
  for (const level of ['super_admin', 'org_admin', 'editor']) assert.equal(canCreateContacts(level), true, level);
  for (const level of ['viewer', '', undefined, 'none']) assert.equal(canCreateContacts(level), false, String(level));
});
