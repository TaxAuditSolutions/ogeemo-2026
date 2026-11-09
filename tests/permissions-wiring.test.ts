import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { buildInvitationEmail } from '../src/core/email-service';

const read = (file: string) => fs.readFileSync(file, 'utf8');
/** The file without comments, so a note describing an old bug does not count as the bug. */
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ACTIONS = ['src/app/actions/user-actions.ts', 'src/app/actions/org-actions.ts'];

test('user-management actions take the caller from the live session, not from claims in the cookie', () => {
  for (const file of ACTIONS) {
    const source = code(file);
    assert.match(source, /requireActor\(\)/, `${file} does not use requireActor`);
    assert.ok(!/decodedToken\.accessLevel/.test(source.replace(/function requireMasterTenantSuperAdmin[\s\S]*?\n\}/, '')), `${file} still reads the role from the token`);
  }
});

test('role decisions come from the shared rules, not copies of them', () => {
  const users = code('src/app/actions/user-actions.ts');
  const orgs = code('src/app/actions/org-actions.ts');
  for (const name of ['mayEditUser', 'mayChangeRole', 'mayInvite']) assert.ok(users.includes(name), `user-actions does not use ${name}`);
  for (const name of ['mayChangeRole', 'mayInvite', 'mayRemove']) assert.ok(orgs.includes(name), `org-actions does not use ${name}`);
  assert.ok(!users.includes('canManageTargetRole') && !orgs.includes('canManageTargetRole'), 'a copy of the hierarchy check is back');
});

test('removing a user also ends their sign-ins and clears their workspace', () => {
  const source = code('src/app/actions/org-actions.ts');
  assert.match(source, /revokeWorkspaceAccess\(/);
  assert.match(source, /collection\('orgMemberships'\)\.doc\(requestingOrgId\)/);
  assert.match(code('src/app/actions/actor.ts'), /revokeRefreshTokens/);
});

test('a role change ends the person\'s open sign-ins', () => {
  assert.match(code('src/app/actions/org-actions.ts'), /refreshSessionsAfterRoleChange\(/);
  assert.match(code('src/app/actions/user-actions.ts'), /refreshSessionsAfterRoleChange\(/);
});

test('the profile edit is checked BEFORE anything is written', () => {
  const source = code('src/app/actions/user-actions.ts');
  const update = source.slice(source.indexOf('export async function updateUserInTenant'), source.indexOf('export async function createUserInTenant'));
  assert.ok(update.indexOf('mayChangeRole(') < update.indexOf('userRef.update('), 'the role is checked after the write');
  assert.ok(update.indexOf('mayEditUser(') < update.indexOf('userRef.update('), 'the edit is checked after the write');
});

test('an invitation link is emailed, never logged', () => {
  const source = read('src/app/actions/org-actions.ts');
  assert.ok(!/console\.log\([^)]*(passwordResetLink|setupLink)/.test(source), 'a setup link is logged');
  assert.ok(!source.includes('[INVITATION LINK GENERATED]') && !source.includes('[TENANT ADMIN INVITE LINK]'), 'a setup-link log line is back');
  assert.match(source, /buildInvitationEmail\(/);
});

test('the invitation email carries the link once, escaped in the HTML, and goes to the invited person only', () => {
  const email = buildInvitationEmail({ to: 'new@example.com', orgName: 'Acme & Sons <Ltd>', setupLink: 'https://example.com/reset?a=1&b=2' });
  assert.deepEqual(email.to, ['new@example.com']);
  assert.match(email.subject, /invited to Acme & Sons <Ltd> on Ogeemo/);
  assert.ok(email.text.includes('https://example.com/reset?a=1&b=2'));
  assert.ok(email.html.includes('https://example.com/reset?a=1&amp;b=2'));
  assert.ok(!email.html.includes('<Ltd>'), 'the organization name is not escaped');
});

test('the Firestore rules: memberships are server-written only and a self-update cannot move the workspace', () => {
  const rules = read('firestore.rules');
  const membership = rules.slice(rules.indexOf('match /users/{userId}/orgMemberships/{membershipId}'), rules.indexOf('Shared Business Collections'));
  assert.match(membership, /allow create, update: if false;/);
  assert.match(membership, /allow delete: if isSignedIn\(\) && request\.auth\.uid == userId;/);
  assert.ok(!/allow write/.test(membership), 'a general membership write rule is back');
  const users = rules.slice(rules.indexOf('match /users/{userId} {'), rules.indexOf('match /users/{userId}/orgMemberships'));
  assert.match(users, /request\.resource\.data\.get\('orgId', null\)/);
  assert.match(users, /request\.resource\.data\.get\('isMasterTenant', null\)/);
});

test('the password Cloud Function checks the target\'s workspace and the live role of the caller', () => {
  const source = read('functions/src/index.ts');
  const body = source.slice(source.indexOf('export const updateUserAuth'), source.indexOf('function sleep'));
  assert.match(body, /mayChangePassword\(/);
  assert.match(body, /collection\("users"\)/);
  assert.ok(!/callerClaims\.accessLevel/.test(body), 'the function reads the caller role from the token again');
});

test('the session context decides the role from the live profile, and a dev mock session never works in production', () => {
  const source = read('src/app/actions.ts');
  assert.match(source, /liveAccess\(/);
  assert.match(source, /NODE_ENV === 'production'/);
  assert.match(source, /verifySessionCookie\(sessionCookie, true\)/);
});

test('the notification actions need a signed-in user and are rate limited, so they cannot be an email relay', () => {
  const source = code('src/app/actions/notification-actions.ts');
  assert.match(source, /getCurrentUserId\(\)/);
  assert.match(source, /notifyLimiter\.check\(/);
  assert.equal((source.match(/const gate = await allowed\(\)/g) ?? []).length, 2, 'both actions must check the gate');
});

test('a receipt email needs a writer role and is rate limited', () => {
  const source = code('src/app/actions/receipt-actions.ts');
  assert.match(source, /canWrite\(session\.accessLevel\)/);
  assert.match(source, /receiptLimiter\.check\(/);
  assert.ok(!source.includes('verifySessionCookie'), 'receipt-actions reads the cookie itself again');
});

test('the master-tenant guard reads the live session, and switching workspace validates the membership and organization', () => {
  for (const file of ['src/app/actions/owner-actions.ts', 'src/app/actions/org-actions.ts']) {
    const source = code(file);
    const guardStart = source.indexOf('async function requireMasterTenantSuperAdmin');
    const guard = source.slice(guardStart, source.indexOf('return session;', guardStart));
    assert.match(guard, /getCurrentSessionContext\(\)/, `${file} guard does not use the live session`);
    assert.ok(!guard.includes('decodedToken'), `${file} guard still reads cookie claims`);
  }
  const orgs = code('src/app/actions/org-actions.ts');
  const sw = orgs.slice(orgs.indexOf('export async function switchActiveOrg'), orgs.indexOf('export async function listCompanies'));
  assert.match(sw, /isAccessLevel\(membership\.accessLevel\)/);
  assert.match(sw, /status === 'suspended'/);
  assert.match(sw, /targetOrg\.data\(\)\?\.isMasterTenant === true/);
});

test('adding an existing account to a new workspace leaves their own workspace and claims alone', () => {
  const orgs = code('src/app/actions/org-actions.ts');
  assert.match(orgs, /const hasHomeWorkspace =/);
  assert.equal((orgs.match(/if \(!hasHomeWorkspace\)/g) ?? []).length, 2, 'both the profile write and the claims write must be conditional');
});

test('the invitation setup link is escaped and the tenant admin setup link is emailed, not logged', () => {
  const source = read('src/app/actions/org-actions.ts');
  assert.ok(!/console\.log\([^)]*InviteLink|console\.log\([^)]*passwordResetLink/.test(source));
  assert.equal((source.match(/buildInvitationEmail\(/g) ?? []).length, 2, 'both invitation paths must email the link');
});
