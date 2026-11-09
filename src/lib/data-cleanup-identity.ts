/**
 * Which stale accounts, memberships, profiles and workspaces are safe to clean up (pure; see
 * tests/data-cleanup-identity.test.ts). Used by scripts/clean-access-data.ts.
 */

export interface AccountInfo {
  uid: string;
  orgId?: string;
  accessLevel?: string;
}

/** Accounts whose sign-in still names a workspace although their profile is gone (people who were removed). */
export function staleAccounts(accounts: readonly AccountInfo[], profileIds: ReadonlySet<string>): AccountInfo[] {
  return accounts.filter((account) => account.orgId && !profileIds.has(account.uid));
}

export interface MembershipInfo {
  uid: string;
  orgId: string;
}

/** Memberships in a workspace that does not exist can never be used. */
export function deadMemberships(memberships: readonly MembershipInfo[], liveOrgIds: ReadonlySet<string>): MembershipInfo[] {
  return memberships.filter((membership) => !liveOrgIds.has(membership.orgId));
}

export interface ProfileInfo {
  uid: string;
  orgId?: string | null;
  accessLevel?: string | null;
  hasLogin: boolean;
}

export interface OrgInfo {
  id: string;
  ownerUid?: string | null;
  /** Records in the workspace across every collection that carries an orgId. */
  recordCount: number;
}

export interface IdentityPlan {
  deleteProfiles: { uid: string; reason: string }[];
  deleteOrgs: { id: string; reason: string }[];
  keptProfiles: { uid: string; reason: string }[];
}

/**
 * Profiles with no login account and workspaces that are completely empty.
 * A profile goes only when nothing references it, it is not the only Super Admin of its workspace who could be
 * replaced by someone who can sign in, and every workspace it owns is itself empty and going.
 * A workspace goes only when it has no records at all, nobody who can sign in holds a membership in it, and every
 * person with a profile in it is going too.
 */
export function planIdentityCleanup(
  profiles: readonly ProfileInfo[],
  orgs: readonly OrgInfo[],
  referencedUids: ReadonlySet<string>,
  /** Workspaces where someone who can sign in holds a MEMBERSHIP (not just a profile). Those are in use. */
  orgsWithLiveMembers: ReadonlySet<string> = new Set()
): IdentityPlan {
  const kept = new Map<string, string>();
  const candidates = new Set<string>();
  for (const profile of profiles) {
    if (profile.hasLogin) continue;
    if (referencedUids.has(profile.uid)) { kept.set(profile.uid, 'records still name this person'); continue; }
    const otherSupers = profiles.filter((o) => o.uid !== profile.uid && o.hasLogin && o.orgId === profile.orgId && o.accessLevel === 'super_admin').length;
    if (profile.accessLevel === 'super_admin' && otherSupers === 0) { kept.set(profile.uid, 'the only Super Admin of its workspace; decide by hand'); continue; }
    candidates.add(profile.uid);
  }

  // A profile that owns a workspace goes only if that workspace goes too; settle that by repeating until stable.
  let goingProfiles = new Set(candidates);
  let goingOrgs = new Set<string>();
  for (let pass = 0; pass < 5; pass++) {
    goingOrgs = new Set(
      orgs
        .filter((org) => org.recordCount === 0)
        .filter((org) => !orgsWithLiveMembers.has(org.id))
        .filter((org) => profiles.filter((p) => p.orgId === org.id).every((p) => goingProfiles.has(p.uid)))
        .map((org) => org.id)
    );
    const next = new Set([...candidates].filter((uid) => orgs.filter((org) => org.ownerUid === uid).every((org) => goingOrgs.has(org.id))));
    const stable = next.size === goingProfiles.size;
    goingProfiles = next;
    if (stable) break;
  }

  for (const uid of candidates) if (!goingProfiles.has(uid)) kept.set(uid, 'it owns a workspace that still has records');
  return {
    deleteProfiles: [...goingProfiles].map((uid) => ({ uid, reason: 'no login account, nothing refers to it' })),
    deleteOrgs: [...goingOrgs].map((id) => ({ id, reason: 'no records and nobody who can sign in' })),
    keptProfiles: [...kept].map(([uid, reason]) => ({ uid, reason })),
  };
}

export interface OwnerlessOrg {
  id: string;
  ownerUid: string;
}

/** Workspaces nobody can administer whose recorded owner can sign in (an opt-in repair, never automatic). */
export function ownerlessOrgs(
  orgs: readonly OrgInfo[],
  superAdminOrgIds: ReadonlySet<string>,
  ownersWithLogin: ReadonlySet<string>,
  goingOrgIds: ReadonlySet<string>
): OwnerlessOrg[] {
  return orgs
    .filter((org) => !superAdminOrgIds.has(org.id) && !goingOrgIds.has(org.id) && org.ownerUid && ownersWithLogin.has(org.ownerUid))
    .map((org) => ({ id: org.id, ownerUid: org.ownerUid as string }));
}
