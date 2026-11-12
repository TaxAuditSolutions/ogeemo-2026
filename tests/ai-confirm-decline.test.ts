import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { DECLINED_REPLY, isConfirmingPreview, isDecliningPreview, isUserConfirmation, isUserDecline } from '../src/lib/ai-confirm';

const PREVIEW = { role: 'model', content: 'Ready to cancel "Team call" (Thu, Nov 12, 3:00 pm to 4:00 pm). Nothing has changed yet.\n\nShall I go ahead?' };
const asked = [{ role: 'user', content: 'Cancel my 3pm meeting tomorrow' }, PREVIEW];

test('a plain refusal is a decline, however it is punctuated or capitalised', () => {
  for (const no of ['no', 'No', 'NO!', 'no.', 'Nope', 'nah', 'no thanks', 'No, thank you', 'no, leave it', 'No, leave it.', 'leave it', 'never mind', 'Nevermind', "don't", 'Do not', 'stop', 'forget it', 'not now', 'no please', 'no, leave it please']) {
    assert.equal(isUserDecline(no), true, no);
  }
});

test('anything that adds a request, a time or a condition is NOT a decline: it goes to the assistant', () => {
  for (const other of ['no, make it 5pm', 'no, Friday instead', 'no but move it', 'no leave it, but book another', 'yes', 'yes but make it Friday', 'cancel that', 'why', 'maybe', 'no way', 'no problem', '', '   ', 'nobody', 'north']) {
    assert.equal(isUserDecline(other), false, JSON.stringify(other));
  }
  for (const odd of [undefined, null, 42, {}, [], true]) assert.equal(isUserDecline(odd), false, String(odd));
});

test('a no and a yes can never both be true of the same message', () => {
  for (const text of ['no', 'no, leave it', 'yes', 'yes please', 'go ahead', 'never mind', 'ok']) {
    assert.ok(!(isUserDecline(text) && isUserConfirmation(text)), text);
  }
});

test('a decline only counts when the last Co-Pilot reply was a preview waiting for an answer', () => {
  assert.equal(isDecliningPreview(asked, 'no, leave it'), true);
  assert.equal(isDecliningPreview([...asked, { role: 'user', content: 'no, leave it' }], 'no, leave it'), true, 'history may already hold the message');
  const chat = [{ role: 'user', content: 'hi' }, { role: 'model', content: 'Hello! How can I help?' }];
  assert.equal(isDecliningPreview(chat, 'no'), false, 'a no to an ordinary question is for the assistant');
  assert.equal(isDecliningPreview([], 'no'), false);
  assert.equal(isDecliningPreview(undefined, 'no'), false);
  assert.equal(isDecliningPreview(asked, 'yes'), false);
  assert.equal(isDecliningPreview(asked, 'no, make it 5pm'), false);
});

test('a yes still confirms the same preview, and a no does not', () => {
  assert.equal(isConfirmingPreview(asked, 'yes'), true);
  assert.equal(isConfirmingPreview(asked, 'no, leave it'), false);
});

test('the server\'s own reply never reads like a preview, so it cannot be answered with a yes', () => {
  assert.equal(isConfirmingPreview([...asked, { role: 'model', content: DECLINED_REPLY }], 'yes'), false);
  assert.match(DECLINED_REPLY, /not changed anything/);
});

test('the wiring: a declined preview is handled before the model runs, clears the waiting preview, and calls no tool', () => {
  const flow = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  const decline = flow.indexOf('if (isDecliningPreview(history, message))');
  assert.ok(decline > 0, 'the flow checks for a declined preview');
  assert.ok(decline < flow.indexOf('const generateOnce'), 'before the model is called');
  const block = flow.slice(decline, flow.indexOf('const pageGuidance', decline));
  assert.match(block, /aiPendingChanges'\)\.doc\(runtimeContext\.userId\)\.delete\(\)/);
  assert.match(block, /return \{ reply: DECLINED_REPLY, toolsCalled: \[\] \}/);
});
