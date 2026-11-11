import assert from 'node:assert/strict';
import test from 'node:test';

import { menuAllows } from '../src/lib/ai-menu-access';

const AR = '/accounting/accounts-receivable';

test('with nothing set, or "inherit", the role decides and the screen is allowed', () => {
  for (const access of [undefined, null, {}, { mode: 'inherit' }, { mode: 'something-new' }]) {
    assert.equal(menuAllows(access as any, AR), true, JSON.stringify(access));
  }
});

test('an allowlist allows only the listed screens', () => {
  assert.equal(menuAllows({ mode: 'allowlist', allowedMenuItems: [AR, '/contacts'] }, AR), true);
  assert.equal(menuAllows({ mode: 'allowlist', allowedMenuItems: ['/contacts'] }, AR), false);
  assert.equal(menuAllows({ mode: 'allowlist', allowedMenuItems: [] }, AR), false, 'an empty allowlist hides everything');
  assert.equal(menuAllows({ mode: 'allowlist' }, AR), false, 'an allowlist with no list hides everything');
});

test('a blocklist hides only the listed screens', () => {
  assert.equal(menuAllows({ mode: 'blocklist', hiddenMenuItems: [AR] }, AR), false);
  assert.equal(menuAllows({ mode: 'blocklist', hiddenMenuItems: ['/contacts'] }, AR), true);
  assert.equal(menuAllows({ mode: 'blocklist' }, AR), true);
});

test('odd list contents are ignored rather than trusted', () => {
  assert.equal(menuAllows({ mode: 'allowlist', allowedMenuItems: 'accounts' as any }, AR), false);
  assert.equal(menuAllows({ mode: 'blocklist', hiddenMenuItems: [42, null, AR] as any }, AR), false);
});
