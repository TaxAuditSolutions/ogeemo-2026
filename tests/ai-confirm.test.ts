import assert from 'node:assert/strict';
import test from 'node:test';

import { isUserConfirmation, readUserConfirmed } from '../src/lib/ai-confirm';

test('a short, unconditional yes is a confirmation, however it is punctuated or capitalised', () => {
  for (const yes of ['yes', 'Yes', 'YES!', 'yes.', 'yes please', 'Yes, please', 'yep', 'yeah', 'yup', 'sure', 'ok', 'OK', 'okay', 'go ahead', 'Go ahead.', 'do it', 'please do', 'confirm', 'confirmed', 'proceed', 'ok do it', 'yes, go ahead', 'yes move it', "that's right", 'that is right', 'correct', 'absolutely', 'yes, cancel it']) {
    assert.equal(isUserConfirmation(yes), true, yes);
  }
});

test('a yes that adds, changes or conditions anything is NOT a plain confirmation', () => {
  for (const other of ['yes but make it 5pm', 'yes, 4pm instead', 'yes at 4', 'ok but not tomorrow', 'yes no wait', "yes, don't", 'sure, unless Dana cancels', 'yes only if it is free', 'actually yes change it to Friday', 'yes but a different day']) {
    assert.equal(isUserConfirmation(other), false, other);
  }
});

test('a refusal, a question or anything else is not a confirmation', () => {
  for (const no of ['no', 'no thanks', 'no, leave it', "don't", 'cancel that', 'stop', 'wait', 'maybe', 'what time is it', 'move it to 4pm', 'book a meeting tomorrow at 3pm', 'i guess so', 'why', '', '   ', '...']) {
    assert.equal(isUserConfirmation(no), false, JSON.stringify(no));
  }
});

test('a long message is never a confirmation, even if it starts with yes', () => {
  assert.equal(isUserConfirmation('yes please go ahead and move it for me now'), false);
  assert.equal(isUserConfirmation('yes please go ahead and do it'), true, 'eight words or fewer');
});

test('odd input is not a confirmation and never throws', () => {
  for (const odd of [undefined, null, 42, {}, [], true]) assert.equal(isUserConfirmation(odd), false, String(odd));
});

test('a word that only STARTS like a yes is not a yes', () => {
  for (const near of ['yesterday', 'okayish maybe', 'surely not', 'sure', 'doing it later', 'confirmation number 5']) {
    assert.equal(isUserConfirmation(near), near === 'sure', near);
  }
});

test('only an explicit true in the server context counts as confirmed', () => {
  assert.equal(readUserConfirmed({ userConfirmed: true }), true);
  for (const bad of [undefined, null, {}, { userConfirmed: false }, { userConfirmed: 'true' }, { userConfirmed: 1 }, 'yes', 7]) assert.equal(readUserConfirmed(bad), false, JSON.stringify(bad));
});
