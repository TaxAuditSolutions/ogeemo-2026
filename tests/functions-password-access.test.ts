import assert from 'node:assert/strict';
import test from 'node:test';

import { asRole, isStrongPassword, mayChangePassword } from '../functions/src/password-access';

const adminA = { uid: 'a1', role: 'org_admin' as const, orgId: 'orgA', isPlatformAdmin: false };
const ownerA = { uid: 'o1', role: 'super_admin' as const, orgId: 'orgA', isPlatformAdmin: false };
const platform = { uid: 'p1', role: 'super_admin' as const, orgId: 'ogeemo', isPlatformAdmin: true };

test('anyone may change their own password', () => {
  assert.equal(mayChangePassword({ uid: 'v1', role: 'viewer', orgId: 'orgA', isPlatformAdmin: false }, { uid: 'v1' }).ok, true);
});

test('an admin of workspace A may change a lower role in workspace A', () => {
  assert.equal(mayChangePassword(adminA, { uid: 'e1', role: 'editor', orgId: 'orgA' }).ok, true);
  assert.equal(mayChangePassword(adminA, { uid: 'v1', role: 'viewer', orgId: 'orgA' }).ok, true);
});

test('an admin of workspace A may NOT change a password in workspace B (the bug)', () => {
  const result = mayChangePassword(adminA, { uid: 'x', role: 'viewer', orgId: 'orgB' }) as any;
  assert.equal(result.ok, false);
  assert.match(result.message, /own workspace/);
  assert.equal(mayChangePassword(ownerA, { uid: 'x', role: 'viewer', orgId: 'orgB' }).ok, false);
});

test('an admin may not change an equal or higher role, even in their own workspace', () => {
  assert.equal(mayChangePassword(adminA, { uid: 'a2', role: 'org_admin', orgId: 'orgA' }).ok, false);
  assert.equal(mayChangePassword(adminA, { uid: 'o1', role: 'super_admin', orgId: 'orgA' }).ok, false);
  assert.equal(mayChangePassword(ownerA, { uid: 'a2', role: 'org_admin', orgId: 'orgA' }).ok, true);
});

test('an editor, a viewer and a caller with no live role may not change anyone else', () => {
  for (const role of ['editor', 'viewer', undefined] as const) {
    const result = mayChangePassword({ uid: 'c', role, orgId: 'orgA', isPlatformAdmin: false }, { uid: 'v1', role: 'viewer', orgId: 'orgA' }) as any;
    assert.equal(result.ok, false);
    assert.match(result.message, /not allowed/);
  }
});

test('a target with no workspace cannot be reached by a workspace admin', () => {
  assert.equal(mayChangePassword(adminA, { uid: 'ghost' }).ok, false);
});

test('the master-tenant super admin may change a password in any workspace', () => {
  assert.equal(mayChangePassword(platform, { uid: 'x', role: 'viewer', orgId: 'orgB' }).ok, true);
});

test('role names are checked against the real list', () => {
  assert.equal(asRole('org_admin'), 'org_admin');
  for (const bad of ['admin', 'toString', '__proto__', '', 3, undefined]) assert.equal(asRole(bad), undefined, String(bad));
});

test('a password needs 8 to 128 characters with upper, lower, a number and a symbol', () => {
  assert.equal(isStrongPassword('Str0ng!pass'), true);
  for (const weak of ['shrt1!A', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumbers!!', 'NoSymbols11A', 'Aa1! ', undefined, 12345678, 'Aa1!'.repeat(40)]) {
    assert.equal(isStrongPassword(weak), false, String(weak));
  }
});
