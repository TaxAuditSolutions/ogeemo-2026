import assert from 'node:assert/strict';
import test from 'node:test';

import { checkChipLabel, checkCustomLink, chipHref, findDuplicateChip, openModeFor } from '../src/lib/action-links';

test('a label is trimmed to one line and must not be blank or too long', () => {
  assert.deepEqual(checkChipLabel('  My   Invoices '), { ok: true, label: 'My Invoices' });
  assert.equal(checkChipLabel('   ').ok, false);
  assert.equal(checkChipLabel(undefined).ok, false);
  assert.equal(checkChipLabel('x'.repeat(41)).ok, false);
  assert.equal(checkChipLabel('x'.repeat(40)).ok, true);
});

test('a path inside Ogeemo is accepted', () => {
  assert.deepEqual(checkCustomLink('/contacts'), { ok: true, href: '/contacts', kind: 'internal' });
  assert.deepEqual(checkCustomLink(' /accounting/invoices/create?contactId=1 '), { ok: true, href: '/accounting/invoices/create?contactId=1', kind: 'internal' });
});

test('a path that browsers read as another website is refused', () => {
  for (const bad of ['//evil.example', '//evil.example/login', '/\\\\evil.example', '/\\evil.example']) {
    const result = checkCustomLink(bad);
    assert.equal(result.ok, false, bad);
  }
  assert.match((checkCustomLink('//evil.example') as { error: string }).error, /another site/);
});

test('an http or https address with a real site name is accepted and tidied', () => {
  assert.deepEqual(checkCustomLink('https://example.com'), { ok: true, href: 'https://example.com/', kind: 'external' });
  assert.deepEqual(checkCustomLink('http://localhost:9002/x'), { ok: true, href: 'http://localhost:9002/x', kind: 'external' });
  assert.equal((checkCustomLink('HTTPS://Example.COM/Path') as { href: string }).href, 'https://example.com/Path');
});

test('scripts, data links, other schemes and bare words are refused', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://example.com', 'mailto:a@b.com', 'contacts', 'example.com']) {
    assert.equal(checkCustomLink(bad).ok, false, bad);
  }
});

test('https with no site name, a user name or password, spaces and blanks are refused', () => {
  for (const bad of ['https://', 'https:///path', 'https://nodots', 'https://user:pw@example.com', 'https://exa mple.com', '', '   ', undefined, null]) {
    assert.equal(checkCustomLink(bad as any).ok, false, String(bad));
  }
  assert.equal(checkCustomLink('https://example.com/' + 'a'.repeat(2000)).ok, false);
});

test('a stored chip href is read as text, including the old object form', () => {
  assert.equal(chipHref('/contacts'), '/contacts');
  assert.equal(chipHref({ pathname: '/event-manager', query: { startTimer: 'true' } }), '/event-manager?startTimer=true');
  assert.equal(chipHref({ pathname: '/calendar' }), '/calendar');
  assert.equal(chipHref(undefined), '');
});

test('a stored chip opens in the app, in a new tab, or not at all when unsafe', () => {
  assert.deepEqual(openModeFor('/contacts'), { mode: 'internal', target: '/contacts' });
  assert.deepEqual(openModeFor({ pathname: '/event-manager', query: { startTimer: 'true' } }), { mode: 'internal', target: '/event-manager?startTimer=true' });
  assert.deepEqual(openModeFor('https://example.com'), { mode: 'external', target: 'https://example.com/' });
  assert.deepEqual(openModeFor('//evil.example'), { mode: 'none', target: '' });
  assert.deepEqual(openModeFor('javascript:alert(1)'), { mode: 'none', target: '' });
  assert.deepEqual(openModeFor(''), { mode: 'none', target: '' });
});

test('a shortcut to the same page is found, ignoring case and a trailing slash, but not itself', () => {
  const chips = [
    { id: 'a', label: 'Contacts', href: '/contacts' },
    { id: 'b', label: 'Timer', href: { pathname: '/event-manager', query: { startTimer: 'true' } } },
  ];
  assert.equal(findDuplicateChip(chips, '/Contacts/')?.id, 'a');
  assert.equal(findDuplicateChip(chips, '/event-manager?startTimer=true')?.id, 'b');
  assert.equal(findDuplicateChip(chips, '/contacts', 'a'), undefined);
  assert.equal(findDuplicateChip(chips, '/calendar'), undefined);
});
