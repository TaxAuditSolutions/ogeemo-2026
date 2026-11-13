import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { canOpenScreen } from '../src/lib/screen-access';

const editor = { accessLevel: 'editor', profileAccessLevel: 'editor', isMasterTenant: false };
const superAdmin = { accessLevel: 'super_admin', profileAccessLevel: 'super_admin', isMasterTenant: false };

test('a screen reached from a menu screen follows that menu screen, so hiding Settings also closes Planning Rituals', () => {
  const block = { ...editor, sidebarAccess: { mode: 'blocklist', hiddenMenuItems: ['/settings', '/calendar'] } };
  assert.equal(canOpenScreen('/settings/rituals', block).ok, false);
  assert.equal(canOpenScreen('/settings/site-images', block).ok, false);
  assert.equal(canOpenScreen('/calendar/reminders', block).ok, false);
  assert.equal(canOpenScreen('/settings/rituals', editor).ok, true);
  assert.equal(canOpenScreen('/change-password', block).ok, true, 'everyone may change their own password');
  assert.equal(canOpenScreen('/help', { ...editor, sidebarAccess: { mode: 'allowlist', allowedMenuItems: [] } }).ok, true, 'help is open to everyone');
});

test('anything the rules do not name is not decided here: an outside link, an odd path, a bad value', () => {
  assert.equal(canOpenScreen('https://example.com/user-manager', editor).ok, true);
  assert.equal(canOpenScreen('//evil.example/owner', editor).ok, true);
  assert.equal(canOpenScreen('/some/page/nobody/listed', editor).ok, true);
  assert.equal(canOpenScreen(undefined as unknown as string, editor).ok, true);
  assert.equal(canOpenScreen('', editor).ok, true);
});

test('typing the name of a closed screen is caught: the typed command resolves, and the rule then refuses it', () => {
  for (const phrase of ['open user manager', 'open users', 'open tenant manager', 'open the owner', 'open inquiries']) {
    const command = processCommand(phrase);
    assert.ok(command.target, `${phrase} resolves to a screen`);
    assert.equal(canOpenScreen(command.target as string, editor).ok, false, phrase);
    assert.equal(canOpenScreen(command.target as string, superAdmin).ok, true, phrase);
  }
  assert.equal(canOpenScreen(processCommand('open settings').target as string, editor).ok, true);
});

test('the wiring: the Co-Pilot checks before it opens or even offers a screen, and so does the search box', () => {
  const context = fs.readFileSync('src/context/ogeemo-copilot-context.tsx', 'utf8');
  assert.match(context, /canOpenScreen\(gated, \{ accessLevel, profileAccessLevel, isMasterTenant, sidebarAccess \}\)/);
  assert.match(context, /\(command\.accessScreen \?\? command\.target\)/, 'a Google app is judged by the Google Apps entry');
  const check = context.indexOf('const screenCheck');
  assert.ok(check > 0 && check < context.indexOf('dispatchReply = describeDispatch(command'), 'checked before the reply and the button are made');
  assert.match(context, /if \(!screenCheck\.ok\) \{\s*\r?\n\s*assistantContent = screenCheck\.message;/);
  assert.match(context, /setSidebarAccess\(profile\?\.sidebarAccess \?\? undefined\)/);
  const search = fs.readFileSync('src/components/layout/global-search.tsx', 'utf8');
  assert.match(search, /canOpenScreen\(gate, \{ accessLevel, profileAccessLevel, isMasterTenant, sidebarAccess \}\)/);
  assert.match(search, /command\.accessScreen \?\? command\.target/);
});
