import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { describeDispatch, externalTabTarget, openExternalTab } from '../src/lib/copilot-dispatch';
import { processCommand } from '../src/lib/command-processor';

/**
 * Found live on 13 Nov 2026: "open google maps" showed a button and did not open Google. A browser only allows a new tab
 * during the person's keypress; the chat opened it after saving the message, so it was blocked. It now opens first.
 */
test('only an https address of another site is opened in a new tab, at the keypress', () => {
  assert.equal(externalTabTarget(processCommand('open google maps')), 'https://maps.google.com/');
  assert.equal(externalTabTarget(processCommand('open google calendar')), 'https://calendar.google.com/');
  assert.equal(externalTabTarget(processCommand('open gmail')), 'https://mail.google.com/');
});

test('an Ogeemo screen, an advice reply, a question, or an odd address never opens a new tab', () => {
  assert.equal(externalTabTarget(processCommand('open calendar')), null, 'an Ogeemo screen opens in this tab');
  assert.equal(externalTabTarget(processCommand('open google apps')), null, 'the Google Apps page is an Ogeemo screen');
  assert.equal(externalTabTarget(processCommand('how do I open google maps?')), null, 'a question');
  assert.equal(externalTabTarget(null), null);
  assert.equal(externalTabTarget(undefined), null);
  assert.equal(externalTabTarget({ isExternal: true, target: 'http://insecure.example' }), null, 'only https');
  assert.equal(externalTabTarget({ isExternal: true, target: 'javascript:alert(1)' }), null);
  assert.equal(externalTabTarget({ isExternal: true, target: '/calendar' }), null);
  assert.equal(externalTabTarget({ isExternal: true, target: '' }), null);
  assert.equal(externalTabTarget({ isExternal: true, assistantMessage: 'advice', target: 'https://x.example/' }), null);
  assert.equal(externalTabTarget({ isExternal: false, target: 'https://x.example/' }), null, 'not marked as another site');
});

test('a tab that opened is cut off from this page, and reported as opened', () => {
  const tab = { opener: 'the chat page' as unknown };
  let called: [string, string] | null = null;
  const ok = openExternalTab('https://maps.google.com/', (url, target) => { called = [url, target]; return tab; });
  assert.equal(ok, true);
  assert.deepEqual(called, ['https://maps.google.com/', '_blank']);
  assert.equal(tab.opener, null, 'the other site cannot reach back into Ogeemo');
});

test('a blocked tab, or an error, is "not opened" and never throws, so the button is kept', () => {
  assert.equal(openExternalTab('https://maps.google.com/', () => null), false);
  assert.equal(openExternalTab('https://maps.google.com/', () => { throw new Error('blocked'); }), false);
  const frozen = Object.freeze({ opener: 'x' as unknown });
  assert.equal(openExternalTab('https://maps.google.com/', () => frozen as { opener: unknown }), true, 'a tab whose opener cannot be set is still open');
});

test('the reply says what really happened: opened in a new tab, or ready with a button', () => {
  const maps = processCommand('open google maps');
  assert.equal(describeDispatch(maps, { openedNewTab: true }).content, "Opening Google Maps in a new tab. If it does not open, click 'Google Maps' below.");
  assert.equal(describeDispatch(maps, { openedNewTab: false }).content, "Google Maps is ready. Click 'Google Maps' below to open it.");
  assert.equal(describeDispatch(maps).content, "Google Maps is ready. Click 'Google Maps' below to open it.", 'default: nothing was opened');
  for (const opened of [true, false]) assert.equal(describeDispatch(maps, { openedNewTab: opened }).autoOpen, false, 'never navigates this tab away');
});

test('an Ogeemo screen is unchanged: it still opens in this tab and says so', () => {
  const calendar = processCommand('open calendar');
  assert.equal(describeDispatch(calendar, { openedNewTab: true }).content, "Opening Calendar. If it does not open, click 'Calendar' below.");
  assert.equal(describeDispatch(calendar).autoOpen, true);
});

test('the wiring: the tab is opened at the keypress, BEFORE the first await, only when allowed, and never from an effect', () => {
  const source = fs.readFileSync('src/context/ogeemo-copilot-context.tsx', 'utf8');
  const start = source.indexOf('const sendMessage = useCallback');
  const open = source.indexOf('openExternalTab(externalUrl', start);
  const firstAwait = source.indexOf('await ', source.indexOf('const messagesWithUserTurn', start));
  assert.ok(open > start, 'the tab is opened inside sendMessage');
  assert.ok(open < firstAwait, 'the tab opens before anything is awaited, while the keypress is still current');
  assert.match(source, /const externalUrl = screenCheck\.ok \? externalTabTarget\(command\) : null;/, 'a person who may not open it gets no tab');
  assert.ok(source.indexOf('const screenCheck') < open, 'the permission check comes first');
  assert.equal(source.split('openExternalTab(').length - 1, 1, 'one place opens an outside tab');
  assert.ok(!/useEffect\([^)]*openExternalTab/.test(source), 'never from an effect, so reopening a chat cannot open a tab');
  assert.match(source, /describeDispatch\(command, \{ openedNewTab \}\)/);
});
