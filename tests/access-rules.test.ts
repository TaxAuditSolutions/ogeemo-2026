import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canWrite, isAccessLevel, isAdminRole, isPlatformAdmin,
  mayChangeRole, mayEditUser, mayInvite, mayRemove, mayResetPassword, sameWorkspace,
} from '../src/lib/access-rules';

const admin = { uid: 'admin1', orgId: 'orgA', accessLevel: 'org_admin' as const };
const owner = { uid: 'owner1', orgId: 'orgA', accessLevel: 'super_admin' as const };
const editor = { uid: 'ed1', orgId: 'orgA', accessLevel: 'editor' as const };
const platform = { uid: 'plat1', orgId: 'ogeemo', accessLevel: 'super_admin' as const, isMasterTenant: true };
const viewerB = { uid: 'vb', orgId: 'orgB', accessLevel: 'viewer' as const };
const editorA = { uid: 'ea', orgId: 'orgA', accessLevel: 'editor' as const };
const viewerA = { uid: 'va', orgId: 'orgA', accessLevel: 'viewer' as const };
const adminA2 = { uid: 'aa2', orgId: 'orgA', accessLevel: 'org_admin' as const };

const refused = (d: any, pattern: RegExp) => { assert.equal(d.ok, false); assert.match(d.error, pattern); };

test('only real role names are roles; made-up strings and prototype names are not', () => {
  for (const role of ['viewer', 'editor', 'org_admin', 'super_admin']) assert.equal(isAccessLevel(role), true);
  for (const bad of ['admin', 'root', '', 'toString', '__proto__', 'constructor', null, undefined, 3]) assert.equal(isAccessLevel(bad), false, String(bad));
});

test('write and admin roles match what the Firestore rules treat as editor-or-above and admin', () => {
  assert.deepEqual(['viewer', 'editor', 'org_admin', 'super_admin', undefined].map(canWrite), [false, true, true, true, false]);
  assert.deepEqual(['viewer', 'editor', 'org_admin', 'super_admin', undefined].map(isAdminRole), [false, false, true, true, false]);
});

test('only the master tenant super admin acts across workspaces', () => {
  assert.equal(isPlatformAdmin(platform), true);
  assert.equal(isPlatformAdmin({ accessLevel: 'super_admin', isMasterTenant: false }), false);
  assert.equal(isPlatformAdmin({ accessLevel: 'org_admin', isMasterTenant: true }), false);
});

test('a workspace admin cannot touch a user in another workspace, and a user with no workspace is refused', () => {
  refused(sameWorkspace(admin, viewerB), /Cross-workspace/);
  refused(sameWorkspace(admin, { uid: 'x', orgId: null }), /does not belong to a workspace/);
  refused(sameWorkspace({ uid: 'a', accessLevel: 'org_admin' }, viewerA), /Missing custom claims/);
  assert.equal(sameWorkspace(admin, viewerA).ok, true);
  assert.equal(sameWorkspace(platform, viewerB).ok, true);
});

test('editing a profile: yourself always, a lower role yes, an equal or higher role no', () => {
  assert.equal(mayEditUser(editor, { uid: 'ed1', orgId: 'orgA', accessLevel: 'editor' }).ok, true);
  assert.equal(mayEditUser(admin, editorA).ok, true);
  refused(mayEditUser(admin, adminA2), /cannot manage a org_admin/);
  refused(mayEditUser(admin, { uid: 'o', orgId: 'orgA', accessLevel: 'super_admin' }), /cannot manage a super_admin/);
  assert.equal(mayEditUser(editor, viewerA).ok, true); // an editor outranks a viewer
  assert.equal(mayEditUser(owner, adminA2).ok, true);
});

test('changing a role needs a lower current role, a lower new role, a valid name, and never your own or the owner', () => {
  assert.equal(mayChangeRole(admin, viewerA, 'editor').ok, true);
  assert.equal(mayChangeRole(admin, editorA, 'none').ok, true);
  refused(mayChangeRole(admin, viewerA, 'org_admin'), /cannot assign the org_admin role/);
  refused(mayChangeRole(admin, viewerA, 'super_admin'), /cannot assign the super_admin role/);
  refused(mayChangeRole(admin, adminA2, 'viewer'), /cannot manage a org_admin/);
  refused(mayChangeRole(admin, { uid: 'admin1', orgId: 'orgA', accessLevel: 'org_admin' }, 'viewer'), /your own role/);
  refused(mayChangeRole(owner, { uid: 'o2', orgId: 'orgA', accessLevel: 'super_admin' }, 'viewer'), /cannot be changed/);
  refused(mayChangeRole(admin, viewerA, 'god' as any), /not a valid role/);
  refused(mayChangeRole(admin, viewerB, 'editor'), /Cross-workspace/);
});

test('inviting: own workspace only, a valid role, and only a role below your own', () => {
  assert.equal(mayInvite(admin, 'orgA', 'editor').ok, true);
  refused(mayInvite(admin, 'orgB', 'editor'), /Cross-workspace/);
  refused(mayInvite(admin, 'orgA', 'org_admin'), /cannot assign the org_admin role/);
  refused(mayInvite(admin, 'orgA', 'owner'), /not a valid role/);
  assert.equal(mayInvite(editor, 'orgA', 'viewer').ok, true); // an editor may invite a viewer
  refused(mayInvite(editor, 'orgA', 'editor'), /cannot assign the editor role/);
});

test('removing: not yourself, not another workspace, not an equal or higher role', () => {
  assert.equal(mayRemove(admin, editorA).ok, true);
  refused(mayRemove(admin, { uid: 'admin1', orgId: 'orgA', accessLevel: 'org_admin' }), /your own account/);
  refused(mayRemove(admin, viewerB), /Cross-workspace/);
  refused(mayRemove(admin, adminA2), /cannot remove a org_admin/);
  refused(mayRemove(admin, { uid: 'o', orgId: 'orgA', accessLevel: 'super_admin' }), /cannot remove a super_admin/);
});

test('resetting a password: yourself, or an admin of the SAME workspace for a lower role, never another workspace', () => {
  assert.equal(mayResetPassword(viewerA, { uid: 'va', orgId: 'orgA', accessLevel: 'viewer' }).ok, true);
  assert.equal(mayResetPassword(admin, editorA).ok, true);
  refused(mayResetPassword(admin, viewerB), /Cross-workspace/);
  refused(mayResetPassword(editor, viewerA), /not allowed to change this password/);
  refused(mayResetPassword(admin, adminA2), /cannot manage a org_admin/);
  assert.equal(mayResetPassword(platform, viewerB).ok, true);
});
