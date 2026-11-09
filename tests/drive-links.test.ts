import assert from 'node:assert/strict';
import test from 'node:test';

import { checkDriveLink, checkOptionalDriveLink, safeDriveHref } from '../src/lib/drive-links';

test('a normal Google Drive address is accepted and tidied', () => {
  const result = checkDriveLink('  https://drive.google.com/drive/folders/abc123  ') as any;
  assert.equal(result.ok, true);
  assert.equal(result.href, 'https://drive.google.com/drive/folders/abc123');
  assert.equal((checkDriveLink('http://example.com') as any).ok, true);
});

test('scripts, data links, other schemes and bare words are refused', () => {
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<b>x</b>', 'file:///C:/secret.txt', 'ftp://example.com/x', 'drive.google.com/x', 'hello']) {
    assert.equal((checkDriveLink(bad) as any).ok, false, bad);
  }
});

test('a link with a user name or password, spaces, line breaks or no site name is refused', () => {
  assert.match((checkDriveLink('https://user:pass@example.com/x') as any).error, /user name or password/);
  assert.match((checkDriveLink('https://example.com/a b') as any).error, /spaces or line breaks/);
  assert.match((checkDriveLink('https://example.com/a\nb') as any).error, /spaces or line breaks/);
  assert.match((checkDriveLink('https://intranet/x') as any).error, /no valid site name/);
  assert.match((checkDriveLink('') as any).error, /Enter a web address/);
  assert.match((checkDriveLink(null) as any).error, /Enter a web address/);
  assert.match((checkDriveLink('https://example.com/' + 'a'.repeat(2000)) as any).error, /too long/);
});

test('a blank optional link means no link, and a bad one is still refused', () => {
  assert.deepEqual(checkOptionalDriveLink('   '), { ok: true, href: null });
  assert.deepEqual(checkOptionalDriveLink(undefined), { ok: true, href: null });
  assert.equal((checkOptionalDriveLink('https://drive.google.com/x') as any).href, 'https://drive.google.com/x');
  assert.equal((checkOptionalDriveLink('javascript:alert(1)') as any).ok, false);
});

test('a stored link is only opened when it is a safe web address', () => {
  assert.equal(safeDriveHref('https://drive.google.com/x'), 'https://drive.google.com/x');
  assert.equal(safeDriveHref('javascript:alert(1)'), null);
  assert.equal(safeDriveHref(undefined), null);
});
