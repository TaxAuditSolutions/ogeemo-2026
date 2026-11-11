import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { isProjectFormTarget, openActionFor, openedFormNote, projectFormTarget, savedRecord } from '../src/lib/ai-open-record';

const answer = (name: string, output: unknown) => ({ role: 'tool', content: [{ toolResponse: { name, output } }] });
const ask = (name: string) => ({ role: 'model', content: [{ toolRequest: { name, input: {} } }] });

test('a saved contact is read from the tool result, with its id', () => {
  const messages = [ask('createContact'), answer('createContact', { success: true, contactId: 'abc123XYZ', message: 'Added' })];
  assert.deepEqual(savedRecord(messages), { kind: 'contact', id: 'abc123XYZ' });
});

test('a saved project is read from the tool result, with its id', () => {
  const messages = [ask('createProject'), answer('createProject', { success: true, projectId: 'proj_9876', message: 'Created' })];
  assert.deepEqual(savedRecord(messages), { kind: 'project', id: 'proj_9876' });
});

test('a held-back duplicate or a refusal opens nothing (no success, no id)', () => {
  assert.equal(savedRecord([answer('createContact', { success: false, message: 'A similar contact exists' })]), null);
  assert.equal(savedRecord([answer('createProject', { success: false, message: 'already exists' })]), null);
  assert.equal(savedRecord([answer('createContact', { success: true, message: 'no id' })]), null);
});

test('other tools never open a form, even if their result has an id', () => {
  assert.equal(savedRecord([answer('createTask', { success: true, taskId: 'task123456' })]), null);
  assert.equal(savedRecord([answer('updateContact', { success: true, contactId: 'abc123XYZ', status: 'done' })]), null);
  assert.equal(savedRecord([answer('searchContacts', { success: true, contactId: 'abc123XYZ' })]), null);
});

test('text the model wrote is never read as a saved record', () => {
  const model = { role: 'model', content: [{ text: 'Added. contactId: abc123XYZ' }] };
  assert.equal(savedRecord([model]), null);
  assert.equal(savedRecord(undefined), null);
  assert.equal(savedRecord('x'), null);
});

test('an id that is not a plain record id is ignored (no path tricks)', () => {
  for (const id of ['../admin', 'a/b/c/d/e/f', 'x', '', 'abc def ghi', 'abc123?x=1', 'a'.repeat(65)]) {
    assert.equal(savedRecord([answer('createProject', { success: true, projectId: id })]), null, id);
  }
});

test('when two records are saved in one turn the last one is opened', () => {
  const messages = [
    answer('createContact', { success: true, contactId: 'first00001' }),
    answer('createProject', { success: true, projectId: 'second0002' }),
  ];
  assert.deepEqual(savedRecord(messages), { kind: 'project', id: 'second0002' });
});

test('a contact opens through the action every Co-Pilot screen already understands', () => {
  assert.deepEqual(openActionFor({ kind: 'contact', id: 'abc123XYZ' }), { type: 'open_contact', contactId: 'abc123XYZ' });
});

test('a project opens its own form, and the reply keeps an Open Project button', () => {
  const action = openActionFor({ kind: 'project', id: 'proj_9876' });
  assert.deepEqual(action, { type: 'dispatch', target: '/projects/create?projectId=proj_9876', isExternal: false, label: 'Open Project', category: 'Operations' });
  assert.equal(projectFormTarget('proj_9876'), '/projects/create?projectId=proj_9876');
});

test('the reply says why a form is opening, only when one is', () => {
  assert.match(openedFormNote({ kind: 'contact', id: 'abc123XYZ' }), /saved.*form is opening/);
  assert.match(openedFormNote({ kind: 'project', id: 'proj_9876' }), /saves? there updates the same project|updates the same project/);
  assert.equal(openedFormNote(null), '');
  assert.equal(openedFormNote({ kind: 'project', id: '../x' }), '');
});

test('nothing saved means no action', () => {
  assert.equal(openActionFor(null), undefined);
  assert.equal(openActionFor(undefined), undefined);
  assert.equal(openActionFor({ kind: 'project', id: '../x' }), undefined);
});

test('the browser opens by itself only for a saved project form, and nothing else the service sends', () => {
  assert.equal(isProjectFormTarget('/projects/create?projectId=proj_9876'), true);
  for (const t of ['/projects/create', '/projects/create?projectId=', '/projects/create?projectId=a/b', '/projects/create?projectId=abc123&x=1', '/accounting/invoices/create', 'https://evil.example/projects/create?projectId=abc123', '//evil.example', '/contacts?action=new', 42, null, undefined]) {
    assert.equal(isProjectFormTarget(t), false, String(t));
  }
});

test('the wiring: the agent returns the saved record, the API route turns it into an action, the chat opens it once', () => {
  const flow = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  const route = fs.readFileSync('src/app/api/ogeemo-assistant/route.ts', 'utf8');
  const context = fs.readFileSync('src/context/ogeemo-copilot-context.tsx', 'utf8');
  assert.match(flow, /savedRecord\(result\.messages\)/);
  assert.match(route, /openActionFor\(genkitResult\?\.saved\)/);
  assert.equal(context.split('isProjectFormTarget(').length - 1, 1, 'one place opens a saved project');
  const send = context.indexOf('const sendMessage = useCallback');
  assert.ok(context.indexOf('isProjectFormTarget(') > send, 'inside sendMessage, never an effect');
});
