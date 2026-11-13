import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { shouldProcessAsCommand } from '../src/lib/copilot-routing';
import { allApps } from '../src/lib/google-apps';
import { googleAppLabel, matchGoogleApp } from '../src/lib/google-app-names';
import { describeDispatch } from '../src/lib/copilot-dispatch';
import { canOpenScreen } from '../src/lib/screen-access';

const href = (name: string) => allApps.find((a) => a.name === name)?.href;

test('singular and common names work: map, photo, spreadsheet, presentation, mail', () => {
  const cases: Array<[string, string]> = [
    ['open google map', 'Maps'], ['open the map', 'Maps'], ['open photo', 'Photos'], ['open a spreadsheet', 'Sheets'],
    ['open google spreadsheet', 'Sheets'], ['open presentations', 'Slides'], ['open google mail', 'Gmail'],
  ];
  for (const [phrase, app] of cases) assert.equal(processCommand(phrase).target, href(app), phrase);
  assert.equal(matchGoogleApp('google nonsense', true), undefined);
});

test('the Google Apps page itself still opens, and is an Ogeemo screen, not an outside link', () => {
  for (const phrase of ['open google apps', 'open google', 'google apps', 'open the google apps']) {
    assert.equal(processCommand(phrase).target, '/google', phrase);
    assert.notEqual(processCommand(phrase).isExternal, true, phrase);
  }
});

test('questions and requests that mention a Google app are answered, never opened', () => {
  for (const phrase of [
    'what is google drive', 'how do I open google maps?', 'how do I link google drive', 'where is google calendar?',
    'google drive for receipts', 'open google docs for Dana', 'what does google keep do', 'is google meet free',
  ]) {
    const result = processCommand(phrase);
    assert.notEqual(result.isExternal, true, `${phrase} -> ${result.type} ${result.target ?? ''}`);
    assert.equal(result.type, 'unknown', phrase);
  }
});

test('the result is an outside link, shown as a button, never auto-opened, and labelled with the app\'s name', () => {
  const maps = processCommand('open google maps');
  assert.equal(maps.label, 'Google Maps');
  assert.equal(maps.category, 'Google Apps');
  const reply = describeDispatch(maps);
  assert.equal(reply.autoOpen, false, 'a browser blocks a pop-up opened after the chat was busy');
  assert.match(reply.content, /Google Maps is ready\. Click 'Google Maps' below to open it\./);
  assert.equal(processCommand('open gmail').label, 'Gmail');
  assert.equal(processCommand('open google groups').label, 'Google Groups');
  assert.equal(googleAppLabel({ name: 'Notebook LM', href: 'x', icon: undefined as never }), 'Google Notebook LM');
});

test('a Google app follows the Google Apps menu entry: hidden from someone, closed to them', () => {
  const editor = { accessLevel: 'editor', profileAccessLevel: 'editor', isMasterTenant: false };
  const maps = processCommand('open google maps');
  assert.equal(maps.accessScreen, '/google');
  assert.equal(canOpenScreen(maps.accessScreen as string, editor).ok, true);
  const blocked = { ...editor, sidebarAccess: { mode: 'blocklist', hiddenMenuItems: ['/google'] } };
  assert.equal(canOpenScreen(maps.accessScreen as string, blocked).ok, false);
  const allow = { ...editor, sidebarAccess: { mode: 'allowlist', allowedMenuItems: ['/contacts'] } };
  assert.equal(canOpenScreen(maps.accessScreen as string, allow).ok, false);
});

test('the sidebar list is the one source: every app is reachable by "google ...", with nothing hard-coded to 19', () => {
  assert.ok(allApps.length >= 19);
  for (const app of allApps) assert.ok(matchGoogleApp(`google ${app.name.replace(/^google\s+/i, '')}`, true), app.name);
  assert.equal(shouldProcessAsCommand('open google maps', []), true);
});
