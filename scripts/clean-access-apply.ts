// Applies the named access clean-up steps, backing up first. Used by scripts/clean-access-data.ts.
import fs from 'node:fs';
import path from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '../src/core/firebase-admin';
import { chunkItems } from '../src/lib/contact-merge';
import type { CleanupPlan } from './clean-access-plan';

export const STEPS = ['revoke-stale-accounts', 'delete-dead-memberships', 'repair-references', 'delete-empty-identities'] as const;
export type Step = (typeof STEPS)[number];

const replacer = (_key: string, value: any) =>
  value && typeof value === 'object' && typeof value.toDate === 'function' ? { __timestamp: value.toDate().toISOString() } : value;

/** Writes everything that is about to change to a file, so any step can be put back by hand. */
function writeBackup(plan: CleanupPlan, steps: Set<Step>, repoRoot: string): string {
  const { g, stale, dead, repairs, identity } = plan;
  const backup: Record<string, unknown[]> = {};
  if (steps.has('revoke-stale-accounts')) backup.revokedAccounts = stale.map((a) => ({ uid: a.uid, claims: g.accounts.find((x) => x.uid === a.uid)?.claims }));
  if (steps.has('delete-dead-memberships')) backup.deletedMemberships = dead.map((m) => ({ path: `users/${m.uid}/orgMemberships/${m.orgId}`, data: m.data }));
  if (steps.has('repair-references')) backup.repairedReferences = repairs;
  if (steps.has('delete-empty-identities')) {
    backup.deletedProfiles = identity.deleteProfiles.map((p) => ({ id: p.uid, data: g.profiles.get(p.uid) }));
    backup.deletedOrganizations = identity.deleteOrgs.map((o) => ({ id: o.id, data: g.orgs.get(o.id) }));
  }
  const file = path.join(repoRoot, 'scratch', `access-cleanup-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ steps: [...steps], backup }, replacer, 2));
  return file;
}

export async function applyPlan(plan: CleanupPlan, requested: Step[], repoRoot: string): Promise<void> {
  const auth = getAdminAuth()!;
  const db = getAdminDb()!;
  const steps = new Set(requested);
  const { g, stale, dead, repairs, identity } = plan;
  console.log(`\nBackup written: ${writeBackup(plan, steps, repoRoot)}`);

  if (steps.has('revoke-stale-accounts')) {
    for (const a of stale) {
      const claims = { ...(g.accounts.find((x) => x.uid === a.uid)?.claims ?? {}) };
      delete claims.orgId; delete claims.accessLevel; delete claims.isMasterTenant;
      await auth.setCustomUserClaims(a.uid, claims);
      await auth.revokeRefreshTokens(a.uid);
    }
    console.log(`revoke-stale-accounts: cleared ${stale.length} account(s)`);
  }
  if (steps.has('delete-dead-memberships')) {
    for (const chunk of chunkItems(dead)) {
      const batch = db.batch();
      chunk.forEach((m) => batch.delete(db.collection('users').doc(m.uid).collection('orgMemberships').doc(m.orgId)));
      await batch.commit();
    }
    console.log(`delete-dead-memberships: deleted ${dead.length}`);
  }
  if (steps.has('repair-references')) {
    for (const chunk of chunkItems(repairs)) {
      const batch = db.batch();
      chunk.forEach((r) => batch.update(db.collection(r.collection).doc(r.docId), { [r.field]: r.to === null ? FieldValue.delete() : r.to }));
      await batch.commit();
    }
    console.log(`repair-references: repaired ${repairs.length}`);
  }
  if (steps.has('delete-empty-identities')) {
    for (const p of identity.deleteProfiles) {
      const memberships = await db.collection('users').doc(p.uid).collection('orgMemberships').get();
      const batch = db.batch();
      memberships.forEach((m) => batch.delete(m.ref));
      batch.delete(db.collection('users').doc(p.uid));
      await batch.commit();
    }
    for (const o of identity.deleteOrgs) await db.collection('organizations').doc(o.id).delete();
    console.log(`delete-empty-identities: deleted ${identity.deleteProfiles.length} profile(s) and ${identity.deleteOrgs.length} workspace(s)`);
  }
}
