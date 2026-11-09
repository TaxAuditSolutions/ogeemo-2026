import assert from 'node:assert/strict';
import test from 'node:test';

import { liveAccess } from '../src/lib/session-rules';

test('a current, matching profile gives the access the token says', () => {
  const result = liveAccess({ orgId: 'orgA', accessLevel: 'editor' }, { orgId: 'orgA', accessLevel: 'editor' });
  assert.deepEqual(result, { orgId: 'orgA', accessLevel: 'editor', isMasterTenant: false });
});

test('a demoted user gets the NEW role immediately, whatever the old token still says', () => {
  const result = liveAccess({ orgId: 'orgA', accessLevel: 'org_admin' }, { orgId: 'orgA', accessLevel: 'viewer' });
  assert.equal(result.accessLevel, 'viewer');
  assert.equal(result.revoked, undefined);
});

test('a removed user (no profile) gets no access even though the token is still valid', () => {
  const result = liveAccess({ orgId: 'orgA', accessLevel: 'org_admin' }, null);
  assert.equal(result.accessLevel, undefined);
  assert.equal(result.orgId, undefined);
  assert.match(result.revoked!, /removed/);
  assert.equal(liveAccess({ orgId: 'orgA', accessLevel: 'editor' }, undefined).orgId, undefined);
});

test('a user whose role was revoked (profile has no role) gets no access', () => {
  const result = liveAccess({ orgId: 'orgA', accessLevel: 'editor' }, { orgId: 'orgA' });
  assert.equal(result.accessLevel, undefined);
  assert.match(result.revoked!, /removed/);
  assert.match(liveAccess({ orgId: 'orgA', accessLevel: 'editor' }, { orgId: 'orgA', accessLevel: 'god' }).revoked!, /removed/);
});

test('a token for one workspace is refused when the profile has moved to another', () => {
  const result = liveAccess({ orgId: 'orgA', accessLevel: 'editor' }, { orgId: 'orgB', accessLevel: 'editor' });
  assert.equal(result.orgId, undefined);
  assert.match(result.revoked!, /workspace changed/);
});

test('a profile with no workspace written yet does not lock the person out', () => {
  const result = liveAccess({ orgId: 'orgA', accessLevel: 'editor' }, { accessLevel: 'editor' });
  assert.equal(result.orgId, 'orgA');
  assert.equal(result.accessLevel, 'editor');
});

test('the master-tenant flag survives only while the live role is still super_admin', () => {
  assert.equal(liveAccess({ orgId: 'ogeemo', accessLevel: 'super_admin', isMasterTenant: true }, { orgId: 'ogeemo', accessLevel: 'super_admin' }).isMasterTenant, true);
  assert.equal(liveAccess({ orgId: 'ogeemo', accessLevel: 'super_admin', isMasterTenant: true }, { orgId: 'ogeemo', accessLevel: 'org_admin' }).isMasterTenant, false);
  assert.equal(liveAccess({ orgId: 'orgA', accessLevel: 'super_admin' }, { orgId: 'orgA', accessLevel: 'super_admin' }).isMasterTenant, false);
});

test('a token with no workspace is not an error: the person simply has no workspace yet', () => {
  assert.deepEqual(liveAccess({}, null), { isMasterTenant: false });
  assert.deepEqual(liveAccess({ orgId: '  ' }, { orgId: 'orgA', accessLevel: 'editor' }), { isMasterTenant: false });
});

test('working in another workspace: a real membership there decides the role, with no membership there is no access', () => {
  const claims = { orgId: 'orgB', accessLevel: 'org_admin' };
  const profile = { orgId: 'orgA', accessLevel: 'editor' };
  assert.deepEqual(liveAccess(claims, profile, { accessLevel: 'viewer' }), { orgId: 'orgB', accessLevel: 'viewer', isMasterTenant: false });
  assert.match(liveAccess(claims, profile, null).revoked!, /workspace changed/);
  assert.match(liveAccess(claims, profile, { accessLevel: 'god' }).revoked!, /workspace changed/);
  assert.match(liveAccess(claims, profile).revoked!, /workspace changed/);
});

test('the master-tenant flag in another workspace needs the membership to carry it too', () => {
  const profile = { orgId: 'orgA', accessLevel: 'super_admin' };
  assert.equal(liveAccess({ orgId: 'ogeemo', accessLevel: 'super_admin', isMasterTenant: true }, profile, { accessLevel: 'super_admin', isMasterTenant: true }).isMasterTenant, true);
  assert.equal(liveAccess({ orgId: 'ogeemo', accessLevel: 'super_admin', isMasterTenant: true }, profile, { accessLevel: 'super_admin' }).isMasterTenant, false);
});
