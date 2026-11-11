import assert from 'node:assert/strict';
import test from 'node:test';

import { isEventChangeRequest, shouldProcessAsCommand } from '../src/lib/copilot-routing';
import { isConfirmingPreview, isPreviewReply } from '../src/lib/ai-confirm';

const preview = [
  { role: 'user' as const, content: 'cancel my 3pm' },
  { role: 'model' as const, content: 'Ready to cancel "Team call" (Thu, Nov 12, 3:00 pm to 4:00 pm). Nothing has changed yet. Shall I go ahead?' },
];

test('requests to move or cancel an event are recognised', () => {
  for (const yes of ['move my 3pm meeting tomorrow to 4pm', 'cancel the appointment with Dana', 'cancel my 2pm', 'reschedule my meeting to Friday at 10', 'push my 3pm back an hour', 'postpone the call with Dana', 'rebook my appointment for Monday', 'Cancel the catch-up on Friday']) {
    assert.equal(isEventChangeRequest(yes), true, yes);
  }
});

test('other requests that use those words are not event changes', () => {
  for (const no of ['cancel', 'move', 'how do I cancel a quote', 'cancel my subscription', 'move the invoice template', 'create a meeting agenda', 'open the calendar', 'push notifications', '']) {
    assert.equal(isEventChangeRequest(no), false, no);
  }
});

test('in the chat these go to the assistant, not the command processor', () => {
  for (const say of ['move my 3pm meeting to 4pm', 'cancel my 2pm', 'reschedule the call with Dana to Friday at 10']) assert.equal(shouldProcessAsCommand(say, []), false, say);
});

test('AFTER A PREVIEW, "go ahead" and "do it" reach the assistant instead of becoming a link (they start with command words)', () => {
  for (const yes of ['yes', 'go ahead', 'Go ahead', 'do it', 'confirm', 'ok', 'yes please', 'ok do it']) {
    assert.equal(shouldProcessAsCommand(yes, preview), false, yes);
    assert.equal(isConfirmingPreview(preview, yes), true, yes);
  }
});

test('the same words with no preview shown are still ordinary commands, so nothing else changed', () => {
  const other = [{ role: 'model' as const, content: 'The ledger is ready. Would you like anything else?' }];
  assert.equal(shouldProcessAsCommand('go ahead', other), true);
  assert.equal(shouldProcessAsCommand('do it', []), true);
  assert.equal(shouldProcessAsCommand('open projects', preview), true, 'a new command after a preview is still a command');
});

test('a yes only confirms when the LAST Co-Pilot reply was the preview, not an older one', () => {
  const moved = [...preview, { role: 'user' as const, content: 'yes' }, { role: 'model' as const, content: 'Cancelled "Team call". It is gone from your Calendar.' }];
  assert.equal(isConfirmingPreview(moved, 'yes'), false);
  assert.equal(shouldProcessAsCommand('go ahead', moved), true);
});

test('a reply that lost the "nothing has changed yet" sentence is not a preview, so it cannot be confirmed', () => {
  assert.equal(isPreviewReply('Ready to cancel "Team call". Shall I go ahead?'), false);
  assert.equal(isPreviewReply('Ready to cancel "Team call". Nothing has changed yet.'), true);
  assert.equal(isPreviewReply('No changes have been made. Shall I?'), true);
  assert.equal(isConfirmingPreview([{ role: 'model', content: 'Ready to cancel it. Shall I go ahead?' }], 'yes'), false);
});

test('a yes that adds anything is not a confirmation, even right after a preview', () => {
  for (const say of ['yes but at 5pm', 'yes, 4pm instead', 'no', 'wait']) assert.equal(isConfirmingPreview(preview, say), false, say);
});
