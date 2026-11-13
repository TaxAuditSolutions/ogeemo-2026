import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { allApps } from '../src/lib/google-apps';

const href = (name: string) => allApps.find((a) => a.name === name)?.href;
const opens = (phrase: string, appName: string) => {
  const result = processCommand(phrase);
  assert.equal(result.type, 'navigation', `${phrase} -> ${result.type}`);
  assert.equal(result.target, href(appName), phrase);
  assert.equal(result.isExternal, true, `${phrase} is an outside link`);
};

test('"Google" in front of the name opens the Google app, for every app on the sidebar list', () => {
  for (const app of allApps) {
    const bare = app.name.replace(/^google\s+/i, '').toLowerCase();
    for (const phrase of [`open google ${bare}`, `google ${bare}`, `go to google ${bare}`, `open the google ${bare}`]) opens(phrase, app.name);
  }
});

test('the names that clash with Ogeemo open GOOGLE\'s app when "Google" is said (they used to open Ogeemo\'s)', () => {
  opens('open google calendar', 'Calendar'); opens('google calendar', 'Calendar'); opens('open google contacts', 'Contacts');
  opens('open google meet', 'Meet'); opens('open google docs', 'Docs'); opens('open google drive', 'Drive');
  opens('open google keep', 'Keep'); opens('open google chat', 'Chat'); opens('open google sites', 'Sites'); opens('open google gemini', 'Gemini');
});

test('the same bare names keep their OGEEMO meaning, so Google never steals a screen people use every day', () => {
  const ogeemo: Array<[string, string]> = [
    ['open calendar', '/calendar'], ['open contacts', '/contacts'], ['open meet', '/meetings'], ['open search', '/reports/search'],
    ['open documents', '/document-manager'], ['calendar', '/calendar'], ['contacts', '/contacts'],
  ];
  for (const [phrase, target] of ogeemo) {
    const result = processCommand(phrase);
    assert.equal(result.target, target, phrase);
    assert.notEqual(result.isExternal, true, `${phrase} must not be a Google link`);
  }
});

test('the apps nothing in Ogeemo shares open by their bare name after a verb', () => {
  opens('open maps', 'Maps'); opens('open drawings', 'Drawings'); opens('open gmail', 'Gmail'); opens('open sheets', 'Sheets');
  opens('open slides', 'Slides'); opens('open photos', 'Photos'); opens('open groups', 'Google Groups'); opens('open notebook lm', 'Notebook LM');
  opens('open text messages', 'Text Messages'); opens('go to maps', 'Maps'); opens('take me to gmail', 'Gmail');
  opens('open the maps app', 'Maps'); opens('open google maps app', 'Maps');
});

test('the apps that clash need "Google": the bare name does not open the Google app', () => {
  for (const phrase of ['open docs', 'open drive', 'open keep', 'open sites', 'open chat', 'open gemini']) {
    assert.notEqual(processCommand(phrase).isExternal, true, `${phrase} must not be a Google link`);
  }
});

test('ordinary words typed bare, with no verb, are not turned into a Google link', () => {
  for (const word of ['maps', 'photos', 'sheets', 'slides', 'groups', 'gmail', 'drawings']) {
    assert.notEqual(processCommand(word).isExternal, true, word);
  }
  opens('google maps', 'Maps');
});
