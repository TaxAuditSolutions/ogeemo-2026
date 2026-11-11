import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { changeEventHandler } from '../src/ai/agent-event-tool';
import { updateContactHandler } from '../src/ai/agent-contact-update-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';
import { NOW, cancel, editor, move, nextTurn, seed as eventSeed } from './event-fixtures';
import { NOW as CONTACT_NOW, later, seed as contactSeed } from './contact-fixtures';

test('the REAL event tool puts the user-facing text in userText and keeps the model note out of it', async () => {
  const db = fakeDb(eventSeed());
  const preview: any = await changeEventHandler(db, editor, move(), { now: NOW });
  assert.equal(preview.status, 'preview');
  assert.match(preview.userText, /Nothing has changed yet\.$/);
  assert.ok(!/Show the user|Do not call|do not repeat/i.test(preview.userText), 'the user-facing text carries no instruction');
  assert.match(preview.message, /do not repeat it/i, 'the model is told not to retell it');

  const done: any = await changeEventHandler(db, editor, move(), nextTurn(2));
  assert.equal(done.status, 'done');
  assert.equal(done.userText, done.message);
  assert.ok(!/go ahead/i.test(done.userText));

  const refused: any = await changeEventHandler(fakeDb(eventSeed()), editor, cancel('eBilled'));
  assert.equal(refused.status, 'refused');
  assert.equal(refused.userText, undefined, 'a refusal is explained by the model, in context');
});

test('the REAL contact tool does the same', async () => {
  const db = fakeDb(contactSeed());
  const ctx = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });
  const preview: any = await updateContactHandler(db, ctx, { contactId: 'c1', cellPhone: '555-0199' }, { now: CONTACT_NOW });
  assert.equal(preview.status, 'preview');
  assert.match(preview.userText, /Nothing has changed yet/);
  assert.ok(!/Show the user|Do not call/i.test(preview.userText));
  const opts = { confirmed: true, turnStartedAt: new Date(later(2).getTime() - 30_000), now: later(2) };
  const done: any = await updateContactHandler(db, ctx, { contactId: 'c1', cellPhone: '555-0199' }, opts);
  assert.equal(done.status, 'done');
  assert.equal(done.userText, done.message);
});

test('the wiring: the agent uses the tool\'s own text, reports what changed, and open screens reload', () => {
  const flow = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(flow, /const exact = toolOwnReply\(result\.messages\);\s*\n\s*if \(exact\) reply = exact;/);
  assert.match(flow, /changedAreas\(result\.messages\)/);
  assert.equal((flow.match(/userText: z\.string\(\)\.optional\(\)/g) ?? []).length, 2, 'both change tools may return userText');
  assert.match(fs.readFileSync('src/app/api/ogeemo-assistant/route.ts', 'utf8'), /changed: genkitResult\.changed/);
  assert.match(fs.readFileSync('src/context/ogeemo-copilot-context.tsx', 'utf8'), /dispatchCopilotWorkflowEvent\('copilot:data_changed'/);
  for (const file of ['src/components/calendar/calendar-view.tsx', 'src/components/contacts/contacts-view.tsx', 'src/components/tasks/project-list-view.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /subscribeToCopilotWorkflowEvent\('copilot:data_changed'/, file);
  }
});
