import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { autoOpenTarget, describeDispatch } from '../src/lib/copilot-dispatch';

test('a plain screen request says it is opening the screen, keeps the button as a fallback, and does not claim it is open', () => {
  const reply = describeDispatch({ label: 'Contacts Hub' });
  assert.equal(reply.autoOpen, true);
  assert.equal(reply.content, "Opening Contacts Hub. If it does not open, click 'Contacts Hub' below.");
  assert.ok(!/\bis (now )?open\b/i.test(reply.content), 'it must not claim the page is already open');
  assert.ok(reply.content.includes("click 'Contacts Hub'"), 'the fallback button is still pointed at');
});

test('a reply the command processor wrote on purpose is advice, so it is a button only', () => {
  const advice = "You can create a new contact in Contacts Hub. Click 'Contacts Hub' below to open it.";
  const reply = describeDispatch({ label: 'Contacts Hub', assistantMessage: advice });
  assert.equal(reply.content, advice);
  assert.equal(reply.autoOpen, false);
});

test('a link to another site is a button only', () => {
  const reply = describeDispatch({ label: 'Docs', isExternal: true });
  assert.equal(reply.autoOpen, false);
  assert.match(reply.content, /Click 'Docs' below/);
  assert.equal(autoOpenTarget(reply, 'https://example.com', '/calendar'), null);
});

test('a missing label still gives a sensible sentence', () => {
  assert.match(describeDispatch({}).content, /^Opening Requested destination\./);
  assert.match(describeDispatch({ label: '   ' }).content, /^Opening Requested destination\./);
});

test('an internal screen is opened, a path that is not inside Ogeemo never is', () => {
  const reply = describeDispatch({ label: 'Calendar' });
  assert.equal(autoOpenTarget(reply, '/calendar', '/contacts'), '/calendar');
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', 'calendar']) {
    assert.equal(autoOpenTarget(reply, bad, '/contacts'), null, bad);
  }
  assert.equal(autoOpenTarget(reply, undefined as any, '/contacts'), null);
});

test('being on the screen already does nothing, but a request with a query still goes (it asks for something)', () => {
  const reply = describeDispatch({ label: 'Calendar' });
  assert.equal(autoOpenTarget(reply, '/calendar', '/calendar'), null);
  assert.equal(autoOpenTarget(reply, '/calendar', '/calendar/'), null, 'a trailing slash is the same page');
  assert.equal(autoOpenTarget(reply, '/event-manager?startTimer=true', '/event-manager'), '/event-manager?startTimer=true');
  assert.equal(autoOpenTarget(reply, '/projects/create?title=Apollo', '/projects/create'), '/projects/create?title=Apollo');
});

test('a reply that must not auto-open never navigates, whatever the target', () => {
  const advice = describeDispatch({ label: 'Contacts Hub', assistantMessage: 'x' });
  assert.equal(autoOpenTarget(advice, '/contacts', '/calendar'), null);
});

test('the chat opens the screen from sendMessage only, never from an effect, so reloading or reopening a chat cannot navigate again', () => {
  const source = fs.readFileSync('src/context/ogeemo-copilot-context.tsx', 'utf8');
  assert.match(source, /describeDispatch\(command\)/);
  assert.match(source, /autoOpenTarget\(/);
  assert.ok(!/useEffect\([^)]*autoOpenTarget/.test(source), 'auto-open must not run from an effect');
  const sendAt = source.indexOf('const sendMessage = useCallback');
  const callAt = source.indexOf('autoOpenTarget(dispatchReply');
  const nextHookAt = source.indexOf('useCallback', sendAt + 'const sendMessage = useCallback'.length);
  assert.ok(sendAt > 0 && callAt > sendAt, 'auto-open belongs inside sendMessage');
  assert.ok(nextHookAt < 0 || callAt < nextHookAt, 'auto-open must not sit in a later hook');
  assert.equal(source.split('autoOpenTarget(').length - 1, 1, 'there should be exactly one place that opens a screen');
  assert.ok(!/is ready\. Click '\$\{label\}' below to open it/.test(source), 'the old click-only wording is back');
});
