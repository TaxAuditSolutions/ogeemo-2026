import assert from 'node:assert/strict';
import test from 'node:test';

import { deadMemberships, ownerlessOrgs, planIdentityCleanup, staleAccounts } from '../src/lib/data-cleanup-identity';

const profile = (uid: string, orgId: string, accessLevel: string, hasLogin: boolean) => ({ uid, orgId, accessLevel, hasLogin });

test('accounts that still name a workspace but have no profile are stale; others are not', () => {
  const accounts = [{ uid: 'a', orgId: 'o1' }, { uid: 'b', orgId: 'o1' }, { uid: 'c' }];
  assert.deepEqual(staleAccounts(accounts, new Set(['b'])).map((x) => x.uid), ['a']);
});

test('memberships in a workspace that does not exist are dead', () => {
  const list = [{ uid: 'u', orgId: 'gone' }, { uid: 'u', orgId: 'live' }];
  assert.deepEqual(deadMemberships(list, new Set(['live'])).map((m) => m.orgId), ['gone']);
});

test('a login-less profile goes only when unreferenced and not the only Super Admin who could sign in', () => {
  const profiles = [
    profile('boss', 'o1', 'super_admin', true),
    profile('ghost-super', 'o1', 'super_admin', false),
    profile('ghost-sole', 'o2', 'super_admin', false),
    profile('used', 'o1', 'editor', false),
    profile('ok', 'o1', 'editor', true),
  ];
  const plan = planIdentityCleanup(profiles, [{ id: 'o1', recordCount: 5 }, { id: 'o2', recordCount: 5 }], new Set(['used']));
  assert.deepEqual(plan.deleteProfiles.map((p) => p.uid), ['ghost-super']);
  const reasons = Object.fromEntries(plan.keptProfiles.map((p) => [p.uid, p.reason]));
  assert.match(reasons['ghost-sole'], /only Super Admin/);
  assert.match(reasons['used'], /records still name/);
});

test('an empty workspace goes with its login-less people; one with records or a live user stays', () => {
  const profiles = [profile('ghost', 'empty', 'org_admin', false), profile('live', 'busy', 'super_admin', true), profile('ghost2', 'busy', 'editor', false)];
  const orgs = [
    { id: 'empty', ownerUid: 'ghost', recordCount: 0 },
    { id: 'busy', ownerUid: 'live', recordCount: 0 },
    { id: 'full', ownerUid: 'x', recordCount: 12 },
    { id: 'nobody', ownerUid: 'gone', recordCount: 0 },
  ];
  const plan = planIdentityCleanup(profiles, orgs, new Set());
  assert.deepEqual(plan.deleteOrgs.map((o) => o.id).sort(), ['empty', 'nobody']);
  assert.ok(plan.deleteProfiles.some((p) => p.uid === 'ghost'));
  assert.ok(!plan.deleteOrgs.some((o) => o.id === 'busy'), 'a workspace with a live user must stay');
});

test('a login-less profile that owns a workspace with records is kept, and so is that workspace', () => {
  const plan = planIdentityCleanup([profile('ghost', 'o1', 'org_admin', false)], [{ id: 'o1', ownerUid: 'ghost', recordCount: 3 }], new Set());
  assert.equal(plan.deleteProfiles.length, 0);
  assert.equal(plan.deleteOrgs.length, 0);
  assert.match(plan.keptProfiles[0].reason, /owns a workspace that still has records/);
});

test('ownerless workspaces are listed only when the owner can sign in, and never one that is being deleted', () => {
  const orgs = [
    { id: 'a', ownerUid: 'dan', recordCount: 57 },
    { id: 'b', ownerUid: 'ghost', recordCount: 1 },
    { id: 'c', ownerUid: 'dan', recordCount: 0 },
    { id: 'd', ownerUid: 'dan', recordCount: 3 },
  ];
  const result = ownerlessOrgs(orgs, new Set(['d']), new Set(['dan']), new Set(['c']));
  assert.deepEqual(result, [{ id: 'a', ownerUid: 'dan' }]);
});

test('an empty workspace is kept while a person who can sign in holds a membership in it', () => {
  const orgs = [{ id: 'mine', ownerUid: 'dan', recordCount: 0 }, { id: 'abandoned', ownerUid: 'ghost', recordCount: 0 }];
  const plan = planIdentityCleanup([], orgs, new Set(), new Set(['mine']));
  assert.deepEqual(plan.deleteOrgs.map((o) => o.id), ['abandoned']);
});

test('a login-less sole Super Admin goes together with its own empty, unused workspace, and only then', () => {
  const profiles = [profile('ghost', 'empty', 'super_admin', false), profile('ghost2', 'used', 'super_admin', false)];
  const orgs = [{ id: 'empty', ownerUid: 'ghost', recordCount: 0 }, { id: 'used', ownerUid: 'ghost2', recordCount: 0 }];
  const plan = planIdentityCleanup(profiles, orgs, new Set(), new Set(['used']));
  assert.deepEqual(plan.deleteProfiles.map((p) => p.uid), ['ghost']);
  assert.deepEqual(plan.deleteOrgs.map((o) => o.id), ['empty']);
  assert.match(plan.keptProfiles.find((p) => p.uid === 'ghost2')!.reason, /only Super Admin/);
});
