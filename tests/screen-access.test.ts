import assert from 'node:assert/strict';
import test from 'node:test';

import { canOpenScreen, menuItemFor } from '../src/lib/screen-access';
import { allMenuItems } from '../src/lib/menu-items';

const editor = { accessLevel: 'editor', profileAccessLevel: 'editor', isMasterTenant: false };
const admin = { accessLevel: 'org_admin', profileAccessLevel: 'org_admin', isMasterTenant: false };
const superAdmin = { accessLevel: 'super_admin', profileAccessLevel: 'super_admin', isMasterTenant: false };
const owner = { accessLevel: 'org_admin', profileAccessLevel: 'org_admin', isMasterTenant: true };

test('an administrator-only screen is closed to an editor and open to an administrator', () => {
  for (const href of ['/user-manager', '/inquiries']) {
    const denied = canOpenScreen(href, editor);
    assert.equal(denied.ok, false, href);
    assert.equal(denied.ok === false && denied.reason, 'admin');
    assert.match(denied.ok === false ? denied.message : '', /for administrators/);
    assert.equal(canOpenScreen(href, admin).ok, true, href);
    assert.equal(canOpenScreen(href, superAdmin).ok, true, href);
  }
});

test('the role in the saved profile counts when the sign-in token has none (the menu does the same)', () => {
  assert.equal(canOpenScreen('/user-manager', { accessLevel: null, profileAccessLevel: 'org_admin' }).ok, true);
  assert.equal(canOpenScreen('/user-manager', { accessLevel: null, profileAccessLevel: 'editor' }).ok, false);
  assert.equal(canOpenScreen('/user-manager', {}).ok, false, 'no role at all is not an administrator');
});

test('the owner screens are for the master tenant or a super administrator only', () => {
  for (const href of ['/owner', '/tenant-manager']) {
    assert.equal(canOpenScreen(href, editor).ok, false, href);
    assert.equal(canOpenScreen(href, admin).ok, false, `${href} is not for an ordinary administrator`);
    assert.equal(canOpenScreen(href, owner).ok, true, href);
    assert.equal(canOpenScreen(href, superAdmin).ok, true, href);
  }
  const denied = canOpenScreen('/owner', editor);
  assert.equal(denied.ok === false && denied.reason, 'owner');
});

test('an allow list opens only the screens on it, and a block list closes the ones on it', () => {
  const allow = { ...editor, sidebarAccess: { mode: 'allowlist', allowedMenuItems: ['/contacts', '/calendar'] } };
  assert.equal(canOpenScreen('/contacts', allow).ok, true);
  assert.equal(canOpenScreen('/calendar', allow).ok, true);
  const hidden = canOpenScreen('/accounting', allow);
  assert.equal(hidden.ok, false);
  assert.equal(hidden.ok === false && hidden.reason, 'hidden');
  const block = { ...editor, sidebarAccess: { mode: 'blocklist', hiddenMenuItems: ['/backup', '/settings'] } };
  assert.equal(canOpenScreen('/backup', block).ok, false);
  assert.equal(canOpenScreen('/settings', block).ok, false);
  assert.equal(canOpenScreen('/contacts', block).ok, true);
  assert.equal(canOpenScreen('/backup', { ...editor, sidebarAccess: { mode: 'inherit' } }).ok, true);
  assert.equal(canOpenScreen('/backup', { ...editor, sidebarAccess: null }).ok, true);
});

test('a query on the link does not get around the rules, and a ledger tab is its own screen', () => {
  assert.equal(canOpenScreen('/user-manager?tab=roles', editor).ok, false);
  assert.equal(canOpenScreen('/owner#top', editor).ok, false);
  const block = { ...editor, sidebarAccess: { mode: 'blocklist', hiddenMenuItems: ['/accounting/ledgers?tab=income'] } };
  assert.equal(canOpenScreen('/accounting/ledgers?tab=income', block).ok, false, 'Manage Income is hidden');
  assert.equal(canOpenScreen('/accounting/ledgers?tab=expenses', block).ok, true, 'Manage Expenses is a different entry');
});

test('the menu entry for a path is found with or without a query', () => {
  assert.equal(menuItemFor('/contacts')?.label, 'Contacts Hub');
  assert.equal(menuItemFor('/contacts?action=new')?.label, 'Contacts Hub');
  assert.equal(menuItemFor('/nowhere'), undefined);
});

test('every gated menu screen is closed to a person with no role, so a new gated entry is covered automatically', () => {
  const gated = allMenuItems.filter((item) => item.adminOnly || item.masterTenantOnly);
  assert.ok(gated.length >= 4, 'the menu has gated entries');
  for (const item of gated) assert.equal(canOpenScreen(item.href, {}).ok, false, item.label);
  for (const item of allMenuItems.filter((i) => !i.adminOnly && !i.masterTenantOnly)) assert.equal(canOpenScreen(item.href, editor).ok, true, item.label);
});
