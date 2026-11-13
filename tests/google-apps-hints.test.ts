import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { shouldProcessAsCommand } from '../src/lib/copilot-routing';
import { allApps } from '../src/lib/google-apps';
import { googleAppNeedingGoogle, googleHintMessage } from '../src/lib/google-app-names';

/**
 * Found live on 13 Nov 2026: "open gemini", "open drive", "open keep", "open docs", "open sites" and "open chat" went to
 * the AI model, which copied the chat's own "Opening Google Maps in a new tab" replies and claimed to be opening them,
 * with no tab and no button. The server now answers these itself.
 */
const NEED_GOOGLE = ['gemini', 'drive', 'keep', 'docs', 'sites', 'chat'];

test('a Google app whose bare name needs "Google" gets the SERVER\'s hint, with no model call and no link', () => {
  for (const name of NEED_GOOGLE) {
    for (const phrase of [`open ${name}`, `Open ${name}`, `go to ${name}`, `take me to ${name}`, `open the ${name} app`]) {
      const result = processCommand(phrase);
      assert.equal(result.type, 'unknown', phrase);
      assert.ok(result.serverReply, `${phrase} has a server reply`);
      assert.notEqual(result.isExternal, true, `${phrase} must not be a link`);
      assert.equal(result.target, undefined, phrase);
      assert.match(result.serverReply as string, new RegExp(`open google ${name}`, 'i'), phrase);
    }
  }
});

test('the hint says exactly what to type, and is a statement (so a later "yes" is not left waiting on a question)', () => {
  assert.equal(processCommand('open gemini').serverReply, 'Gemini is a Google app. Say "open google gemini" and I will open Google Gemini in a new tab.');
  assert.equal(processCommand('open docs').serverReply, 'Docs is a Google app. Say "open google docs" and I will open Google Docs in a new tab.');
  for (const name of NEED_GOOGLE) assert.ok(!(processCommand(`open ${name}`).serverReply as string).includes('?'), name);
});

test('the hint is only for the apps that need "Google"; the other apps still open, and "Google" still works', () => {
  for (const phrase of ['open maps', 'open gmail', 'open sheets', 'open google gemini', 'open google drive']) {
    const result = processCommand(phrase);
    assert.equal(result.type, 'navigation', phrase);
    assert.equal(result.isExternal, true, phrase);
    assert.equal(result.serverReply, undefined, phrase);
  }
});

test('Ogeemo screens keep their names, so the hint never takes one (it is asked for last)', () => {
  const ogeemo: Array<[string, string]> = [['open calendar', '/calendar'], ['open contacts', '/contacts'], ['open meet', '/meetings'], ['open search', '/reports/search'], ['open documents', '/document-manager']];
  for (const [phrase, target] of ogeemo) {
    const result = processCommand(phrase);
    assert.equal(result.target, target, phrase);
    assert.equal(result.serverReply, undefined, phrase);
  }
});

test('with no verb, or in a question, or inside a longer request, nothing is intercepted', () => {
  for (const phrase of ['gemini', 'drive', 'keep', 'chat', 'how do I open gemini?', 'what is google drive', 'open drive for receipts', 'what does keep do', 'chat with Dana']) {
    assert.equal(processCommand(phrase).serverReply, undefined, phrase);
  }
});

test('every app is either opened by its bare name or hinted: none is left for the model to invent an answer about', () => {
  for (const app of allApps) {
    const bare = app.name.replace(/^google\s+/i, '').toLowerCase();
    const result = processCommand(`open ${bare}`);
    const ogeemoScreen = result.type === 'navigation' && result.isExternal !== true;
    assert.ok(result.isExternal === true || Boolean(result.serverReply) || ogeemoScreen, `open ${bare} -> ${result.type} ${result.target ?? ''}`);
  }
});

test('the helper agrees with the router, and a name that is not an app is not a hint', () => {
  assert.equal(googleAppNeedingGoogle('gemini', true)?.name, 'Gemini');
  assert.equal(googleAppNeedingGoogle('gemini', false), undefined);
  assert.equal(googleAppNeedingGoogle('google gemini', true), undefined);
  assert.equal(googleAppNeedingGoogle('maps', true), undefined, 'maps opens by its bare name');
  assert.equal(googleAppNeedingGoogle('payroll', true), undefined);
  assert.equal(googleHintMessage(allApps.find((a) => a.name === 'Keep')!), 'Keep is a Google app. Say "open google keep" and I will open Google Keep in a new tab.');
  assert.equal(shouldProcessAsCommand('open gemini', []), true);
});

test('the chat shows the hint itself, without calling the assistant', () => {
  const source = fs.readFileSync('src/context/ogeemo-copilot-context.tsx', 'utf8');
  const hint = source.indexOf("command.type === 'unknown' && command.serverReply");
  const call = source.indexOf("fetch('/api/ogeemo-assistant'");
  assert.ok(hint > 0 && call > hint, 'the hint is decided before the assistant is called');
  assert.match(source, /assistantContent = command\.serverReply;/);
});
