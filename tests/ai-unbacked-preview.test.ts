import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { NOTHING_WAITING_NOTE, UNBACKED_PREVIEW_MESSAGE, UNBACKED_PREVIEW_NUDGE, isUnbackedPreview } from '../src/ai/tool-trace';
import { isPreviewReply } from '../src/lib/ai-confirm';

// The reply the user saw on 11 Nov 2026: written by the model after getCalendar, with no changeEvent behind it.
const WRITTEN_BY_MODEL = 'I found "Test Meeting" at 4:00 PM tomorrow. I can move "Test Meeting" from 4:00 PM to 5:00 PM, keeping its 30 minute length. Nothing has been changed yet. Shall I go ahead?';
const FROM_THE_TOOL = 'Ready to move "Test Meeting" from Thu, Nov 12, 4:00 pm to 4:30 pm to Thu, Nov 12, 5:00 pm to 5:30 pm. Nothing has changed yet.';

test('the preview the model wrote itself after only reading the calendar is caught', () => {
  assert.equal(isPreviewReply(WRITTEN_BY_MODEL), true, 'it reads like a preview, so the user would be asked to say yes');
  assert.equal(isUnbackedPreview(WRITTEN_BY_MODEL, ['getCalendar']), true);
  assert.equal(isUnbackedPreview(WRITTEN_BY_MODEL, []), true);
  assert.equal(isUnbackedPreview(WRITTEN_BY_MODEL, ['searchContacts', 'getCalendar']), true);
});

test('a preview the tool made is never flagged, for an event or a contact', () => {
  assert.equal(isUnbackedPreview(FROM_THE_TOOL, ['getCalendar', 'changeEvent']), false);
  assert.equal(isUnbackedPreview(FROM_THE_TOOL, ['changeEvent']), false);
  assert.equal(isUnbackedPreview('Ready to change Dana. Nothing has changed yet.', ['searchContacts', 'updateContact']), false);
});

test('an ordinary reply, or no reply, is never flagged', () => {
  for (const text of ['You have 2 events tomorrow.', 'Moved "Test Meeting" to 5pm.', '', '   ', undefined, null, 42]) {
    assert.equal(isUnbackedPreview(text, ['getCalendar']), false, String(text));
  }
});

test('it is never flagged after a tool that saves something ran, so the retry can never save a thing twice', () => {
  for (const write of ['createTask', 'createProject', 'createContact', 'createAppointment']) {
    assert.equal(isUnbackedPreview(WRITTEN_BY_MODEL, ['getCalendar', write]), false, write);
  }
});

test('the reminder and the two fallback messages say the right things', () => {
  assert.match(UNBACKED_PREVIEW_NUDGE, /changeEvent/);
  assert.match(UNBACKED_PREVIEW_NUDGE, /updateContact/);
  assert.match(UNBACKED_PREVIEW_MESSAGE, /nothing was changed/);
  assert.equal(isPreviewReply(UNBACKED_PREVIEW_MESSAGE), false, 'the fallback must not itself look like a preview, or the user would be asked to say yes to it');
  assert.match(NOTHING_WAITING_NOTE, /Do not call changeEvent or updateContact/);
});

test('the wiring: one retry with the turns so far (no system message) and a reminder, then the safe message, never an unbacked preview', () => {
  const flow = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(flow, /if \(isUnbackedPreview\(reply, called\)\)/);
  assert.match(flow, /filter\(\(m: any\) => m\?\.role !== 'system'\)/, 'Gemini rejects a system message that is not first');
  assert.match(flow, /isUnbackedPreview\(result\.text, called\) \? UNBACKED_PREVIEW_MESSAGE : result\.text/);
  assert.equal(flow.split('UNBACKED_PREVIEW_NUDGE').length - 1, 2, 'imported once, used once');
  assert.match(flow, /if \(!waiting && saved\) waiting = NOTHING_WAITING_NOTE/);
  assert.match(flow, /return \{ reply: reply\.trim\(\)/);
});
