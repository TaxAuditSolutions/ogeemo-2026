import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { CHAT_OPENED_NOTE, NOTHING_OPENED_MESSAGE, looksLikeOpeningClaim, markChatOpenings, withoutFalseOpening } from '../src/lib/capability-claims';
import { describeDispatch } from '../src/lib/copilot-dispatch';
import { processCommand } from '../src/lib/command-processor';

/** The chat's own opening replies are recognised, whatever screen or app they name. */
test('every opening reply the chat itself writes is recognised as one', () => {
  const replies = [
    describeDispatch(processCommand('open google maps'), { openedNewTab: true }).content,
    describeDispatch(processCommand('open google maps'), { openedNewTab: false }).content,
    describeDispatch(processCommand('open calendar')).content,
    describeDispatch(processCommand('open contacts hub')).content,
    describeDispatch(processCommand('open google gemini'), { openedNewTab: true }).content,
  ];
  for (const reply of replies) assert.equal(looksLikeOpeningClaim(reply), true, reply);
});

test('ordinary assistant replies are never mistaken for one', () => {
  for (const reply of [
    'I cannot directly open external applications for you.', 'Opened tickets are in the Quote Manager.', 'You have 2 events tomorrow.',
    'Ready to move "Test Meeting" from 3pm to 4pm. Nothing has changed yet.', 'Moved "Test Meeting" to 5pm.', 'Added Jon Smith to your Contacts Hub.',
    'To open the Calendar, click Calendar in the sidebar.', '', 'Opening balances are set on the ledger screen. If it does not look right, check the date.',
  ]) assert.equal(looksLikeOpeningClaim(reply), false, reply);
  for (const odd of [undefined, null, 42, {}, []]) assert.equal(looksLikeOpeningClaim(odd), false);
});

test('the history the assistant reads marks the chat\'s own opening replies, and touches nothing else', () => {
  const history = [
    { role: 'user', content: 'open google maps' },
    { role: 'model', content: "Opening Google Maps in a new tab. If it does not open, click 'Google Maps' below." },
    { role: 'user', content: 'what is on my calendar' },
    { role: 'model', content: 'You have 2 events tomorrow.' },
    { role: 'user', content: "Opening Google Maps in a new tab. If it does not open, click 'Google Maps' below." },
  ];
  const marked = markChatOpenings(history);
  assert.equal(marked[1].content, `${history[1].content}\n${CHAT_OPENED_NOTE}`);
  assert.equal(marked[3].content, history[3].content, 'an ordinary reply is unchanged');
  assert.equal(marked[0].content, history[0].content);
  assert.equal(marked[4].content, history[4].content, 'a USER message is never rewritten, even if it looks like one');
  assert.equal(history[1].content.includes('written by the Ogeemo chat'), false, 'the original array is not changed');
});

test('a reply the assistant writes that claims to open something is replaced with the honest one', () => {
  assert.equal(withoutFalseOpening("Opening Google Gemini in a new tab. If it does not open, click 'Google Gemini' below."), NOTHING_OPENED_MESSAGE);
  assert.equal(withoutFalseOpening("Google Docs is ready. Click 'Google Docs' below to open it."), NOTHING_OPENED_MESSAGE);
  assert.equal(withoutFalseOpening('I cannot directly open external applications.'), 'I cannot directly open external applications.');
  assert.equal(withoutFalseOpening('You have 2 events tomorrow.'), 'You have 2 events tomorrow.');
  assert.match(NOTHING_OPENED_MESSAGE, /did not open anything/);
  assert.equal(looksLikeOpeningClaim(NOTHING_OPENED_MESSAGE), false, 'the honest message is not itself a claim');
});

test('the wiring: the route marks the history, and replaces a false opening on both the main and the fallback answer', () => {
  const route = fs.readFileSync('src/app/api/ogeemo-assistant/route.ts', 'utf8');
  assert.match(route, /const history = markChatOpenings\(limitHistory\(body\?\.history\)\);/);
  assert.match(route, /const honest = withoutFalseOpening\(genkitAnswer\);/);
  assert.match(route, /fallbackAnswer\(withoutFalseOpening\(generalAnswer\), operationalOutcome\)/);
});
