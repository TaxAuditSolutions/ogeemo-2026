import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { createContactHandler } from '../src/ai/agent-contact-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

const NOW = new Date('2026-11-10T12:00:00Z');
const seed = () => ({
  contactFolders: {
    fMisc: { orgId: 'orgA', name: 'Miscellaneous', isSystem: true },
    fClients: { orgId: 'orgA', name: 'Clients' },
    fEmp: { orgId: 'orgA', name: 'Employees', isSystem: true },
    fOther: { orgId: 'orgB', name: 'Other Workspace Folder' },
  },
  contacts: {
    c1: { orgId: 'orgA', name: 'Dana Whitfield', email: 'dana@acme.com' },
    c2: { orgId: 'orgB', name: 'Sam Elsewhere', email: 'sam@else.com' },
  },
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });

test('the tool saves the contact in the signed-in workspace, in that workspace folder, and says so', async () => {
  const db = fakeDb(seed());
  const result = await createContactHandler(db, editor, { name: 'Jane Doe', email: 'jane@acme.com', folder: 'Clients' }, NOW);
  assert.equal(result.success, true);
  assert.match(result.message, /Added "Jane Doe" to the Clients folder/);
  const saved = db.store.contacts[(result as any).contactId];
  assert.equal(saved.orgId, 'orgA');
  assert.equal(saved.folderId, 'fClients');
  assert.equal(saved.createdBy, 'u1');
  assert.equal(saved.email, 'jane@acme.com');
  assert.ok(saved.keywords.includes('jane'));
});

test('with no folder named the default folder of THIS workspace is used', async () => {
  const db = fakeDb(seed());
  const result = await createContactHandler(db, editor, { name: 'Jane Doe' }, NOW);
  assert.equal(db.store.contacts[(result as any).contactId].folderId, 'fMisc');
});

test('a folder from another workspace is never found', async () => {
  const db = fakeDb(seed());
  const result = await createContactHandler(db, editor, { name: 'Jane Doe', folder: 'Other Workspace Folder' }, NOW);
  assert.equal(result.success, false);
  assert.equal(Object.keys(db.store.contacts).length, 2);
});

test('a viewer, a missing identity and a missing database are refused and nothing is written', async () => {
  const db = fakeDb(seed());
  const viewer = readToolContext({ userId: 'u2', orgId: 'orgA', accessLevel: 'viewer' });
  assert.match((await createContactHandler(db, viewer, { name: 'Jane Doe' }, NOW)).message, /view this workspace but not add contacts/);
  assert.match((await createContactHandler(db, readToolContext(undefined), { name: 'Jane Doe' }, NOW)).message, /not authenticated/);
  assert.match((await createContactHandler(db, { ...editor, orgId: undefined }, { name: 'Jane Doe' }, NOW)).message, /not authenticated/);
  assert.match((await createContactHandler(null, editor, { name: 'Jane Doe' }, NOW)).message, /NOT added/);
  assert.equal(Object.keys(db.store.contacts).length, 2);
});

test('a likely duplicate in this workspace is not added until the user says so; another workspace never counts', async () => {
  const db = fakeDb(seed());
  const byEmail = await createContactHandler(db, editor, { name: 'Someone New', email: 'DANA@acme.com' }, NOW);
  assert.equal(byEmail.success, false);
  assert.match(byEmail.message, /same email address.*Nothing was added.*allowDuplicate/);
  const byName = await createContactHandler(db, editor, { name: '  dana   whitfield ' }, NOW);
  assert.equal(byName.success, false);
  assert.equal(Object.keys(db.store.contacts).length, 2);

  const elsewhere = await createContactHandler(db, editor, { name: 'Sam Elsewhere', email: 'sam@else.com' }, NOW);
  assert.equal(elsewhere.success, true, 'a contact in another workspace is not a duplicate');

  const forced = await createContactHandler(db, editor, { name: 'Dana Whitfield', allowDuplicate: true }, NOW);
  assert.equal(forced.success, true);
});

test('a failed save says the contact was not saved', async () => {
  const db = fakeDb(seed());
  db.failWrites.value = true;
  const result = await createContactHandler(db, editor, { name: 'Jane Doe' }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /could not be saved/);
});

test('the agent offers the tool, the Contacts Hub shares the keyword builder, and the route has no draft detour', () => {
  const agent = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(agent, /tools: \[[^\]]*createContactTool[^\]]*\]/);
  assert.ok(agent.includes('createContactHandler('));
  const service = fs.readFileSync('src/services/contact-service.ts', 'utf8');
  assert.ok(service.includes("from '@/lib/contact-keywords'"));
  assert.ok(!service.includes('const addValue = (value: any)'), 'the Contacts Hub has its own copy of the keyword builder again');
  const route = fs.readFileSync('src/app/api/ogeemo-assistant/route.ts', 'utf8');
  assert.ok(!route.includes('isImperativeContactRequest'));
});
