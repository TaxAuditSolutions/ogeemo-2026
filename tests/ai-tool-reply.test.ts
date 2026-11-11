import assert from 'node:assert/strict';
import test from 'node:test';

import { isPreviewReply } from '../src/lib/ai-confirm';
import { ASK_TO_GO_AHEAD, changedAreas, parseChangedAreas, toolOwnReply } from '../src/lib/ai-tool-reply';

const answer = (name: string, output: unknown) => ({ role: 'tool', content: [{ toolResponse: { name, output } }] });
const PREVIEW_TEXT = 'Ready to move "Team call" from Thu, Nov 12, 3:00 pm to 4:00 pm to Thu, Nov 12, 4:00 pm to 5:00 pm. Nothing has changed yet.';
const DONE_TEXT = 'Moved "Team call" to Thu, Nov 12, 4:00 pm to 5:00 pm. It is on your Calendar at the new time.';

test('a preview is shown as the tool wrote it, then asks to go ahead, with nothing of the tool\'s private note', () => {
  const reply = toolOwnReply([answer('changeEvent', { success: false, status: 'preview', message: `${PREVIEW_TEXT} The user will be shown exactly this...`, userText: PREVIEW_TEXT })]);
  assert.equal(reply, `${PREVIEW_TEXT}\n\n${ASK_TO_GO_AHEAD}`);
  assert.equal(isPreviewReply(reply), true, 'the next yes is checked against "Nothing has changed yet", so it must be there');
  assert.ok(!/Show the user|Do not call|changeEvent/.test(reply as string), 'no instruction to the model reaches the user');
});

test('a finished change is shown as the tool wrote it and never asks "Shall I go ahead?"', () => {
  const reply = toolOwnReply([answer('changeEvent', { success: true, status: 'done', message: DONE_TEXT, userText: DONE_TEXT })]);
  assert.equal(reply, DONE_TEXT);
  assert.ok(!/go ahead/i.test(reply as string));
});

test('a contact preview and a contact change work the same way', () => {
  assert.equal(toolOwnReply([answer('updateContact', { success: false, status: 'preview', message: 'x', userText: 'Ready to change Dana. Nothing has changed yet.' })]), `Ready to change Dana. Nothing has changed yet.\n\n${ASK_TO_GO_AHEAD}`);
  assert.equal(toolOwnReply([answer('updateContact', { success: true, status: 'done', message: 'x', userText: 'Changed Dana.' })]), 'Changed Dana.');
});

test('a refusal, a search, or no tool leaves the model\'s own words in place (null)', () => {
  assert.equal(toolOwnReply([answer('changeEvent', { success: false, status: 'refused', message: 'That overlaps X.', userText: 'ignored' })]), null);
  assert.equal(toolOwnReply([answer('getCalendar', { success: true, events: [] })]), null);
  assert.equal(toolOwnReply([]), null);
  assert.equal(toolOwnReply(undefined), null);
  assert.equal(toolOwnReply([answer('changeEvent', { success: false, status: 'preview', message: 'x' })]), null, 'no userText: fall back to the model');
  assert.equal(toolOwnReply([answer('changeEvent', { success: true, status: 'done', message: 'x', userText: '   ' })]), null);
});

test('only the LAST tool result counts, so a preview followed by a refusal is not shown as a preview', () => {
  const messages = [answer('changeEvent', { success: false, status: 'preview', message: 'x', userText: PREVIEW_TEXT }), answer('changeEvent', { success: false, status: 'refused', message: 'no' })];
  assert.equal(toolOwnReply(messages), null);
});

test('a tool other than the two change tools can never supply the reply', () => {
  assert.equal(toolOwnReply([answer('createContact', { success: true, status: 'done', userText: 'Pwned' })]), null);
  assert.equal(toolOwnReply([answer('searchKnowledge', { success: true, status: 'done', userText: 'Pwned' })]), null);
});

test('the screens that went stale are read from successful saves only', () => {
  assert.deepEqual(changedAreas([answer('changeEvent', { success: true, status: 'done' })]), ['calendar']);
  assert.deepEqual(changedAreas([answer('createAppointment', { success: true })]), ['calendar']);
  assert.deepEqual(changedAreas([answer('createContact', { success: true }), answer('createProject', { success: true })]), ['contacts', 'projects']);
  assert.deepEqual(changedAreas([answer('updateContact', { success: true, status: 'done' })]), ['contacts']);
  assert.deepEqual(changedAreas([answer('changeEvent', { success: false, status: 'preview' })]), [], 'a preview changes nothing');
  assert.deepEqual(changedAreas([answer('createContact', { success: false })]), [], 'a held-back duplicate changes nothing');
  assert.deepEqual(changedAreas([answer('getCalendar', { success: true })]), []);
  assert.deepEqual(changedAreas(undefined), []);
});

test('the browser keeps only the screens it knows', () => {
  assert.deepEqual(parseChangedAreas(['calendar', 'contacts', 'projects']), ['calendar', 'contacts', 'projects']);
  assert.deepEqual(parseChangedAreas(['calendar', 'payroll', 7, null]), ['calendar']);
  assert.deepEqual(parseChangedAreas('calendar'), []);
  assert.deepEqual(parseChangedAreas(undefined), []);
});
