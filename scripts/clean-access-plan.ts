// Builds and prints the access clean-up plan (read-only). Used by scripts/clean-access-data.ts.
import { planReferenceRepairs, type KeptRef, type RepairOp } from '../src/lib/data-cleanup';
import {
  deadMemberships, ownerlessOrgs, planIdentityCleanup, staleAccounts,
  type IdentityPlan, type MembershipInfo, type OrgInfo, type OwnerlessOrg,
} from '../src/lib/data-cleanup-identity';
import type { Gathered } from './clean-access-gather';

export interface CleanupPlan {
  g: Gathered;
  stale: ReturnType<typeof staleAccounts>;
  dead: (MembershipInfo & { data: Record<string, any> })[];
  repairs: RepairOp[];
  kept: KeptRef[];
  identity: IdentityPlan;
  orgInfos: OrgInfo[];
  ownerless: OwnerlessOrg[];
}

export const short = (value: unknown) => String(value ?? '-').slice(0, 8);

export async function buildPlan(g: Gathered): Promise<CleanupPlan> {
  const profileIds = new Set(g.profiles.keys());
  const liveOrgIds = new Set(g.orgs.keys());
  const stale = staleAccounts(g.accounts, profileIds);
  const deadIds = deadMemberships(g.memberships, liveOrgIds);
  const dead = deadIds.map((m) => ({ ...m, data: g.memberships.find((x) => x.uid === m.uid && x.orgId === m.orgId)?.data ?? {} }));

  const people = new Map<string, { uid: string; contactId?: string | null }>();
  g.profiles.forEach((p, uid) => people.set(uid, { uid, contactId: p.contactId ?? null }));
  const { repairs, kept } = planReferenceRepairs(g.refRows, g.contacts, people);

  const loginIds = new Set(g.accounts.map((a) => a.uid));
  const orgInfos: OrgInfo[] = [];
  for (const [id, org] of g.orgs) orgInfos.push({ id, ownerUid: (org.ownerUid as string | undefined) ?? null, recordCount: await g.recordCount(id) });
  const profileInfos = [...g.profiles].map(([uid, p]) => ({ uid, orgId: p.orgId as string | undefined, accessLevel: p.accessLevel as string | undefined, hasLogin: loginIds.has(uid) }));
  const signInIds = new Set(g.accounts.filter((a) => !a.disabled).map((a) => a.uid));
  const orgsWithLiveMembers = new Set(g.memberships.filter((m) => signInIds.has(m.uid) && g.orgs.has(m.orgId)).map((m) => m.orgId));
  const identity = planIdentityCleanup(profileInfos, orgInfos, g.referencedIds, orgsWithLiveMembers);

  const superOrgs = new Set<string>();
  g.profiles.forEach((p) => { if (p.accessLevel === 'super_admin' && p.orgId) superOrgs.add(p.orgId); });
  g.memberships.forEach((m) => { if (m.data.accessLevel === 'super_admin') superOrgs.add(m.orgId); });
  const signIn = new Set(g.accounts.filter((a) => !a.disabled).map((a) => a.uid));
  const ownerless = ownerlessOrgs(orgInfos, superOrgs, signIn, new Set(identity.deleteOrgs.map((o) => o.id)));
  return { g, stale, dead, repairs, kept, identity, orgInfos, ownerless };
}

function tally<T>(items: readonly T[], key: (item: T) => string): [string, number][] {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(key(item), (map.get(key(item)) ?? 0) + 1));
  return [...map];
}

export function printReport(plan: CleanupPlan): void {
  const { g, stale, dead, repairs, kept, identity, orgInfos, ownerless } = plan;
  console.log(`Read ${g.accounts.length} accounts, ${g.profiles.size} profiles, ${g.orgs.size} workspaces, ${g.memberships.length} memberships, ${g.contacts.size} contacts, ${g.refRows.length} contact references.\n`);
  console.log(`1. revoke-stale-accounts: ${stale.length} account(s) keep a workspace role with no profile`);
  stale.forEach((a) => console.log(`     ${short(a.uid)}  workspace ${short(a.orgId)} (${g.orgs.get(a.orgId as string)?.name ?? 'workspace deleted'})  role ${a.accessLevel}`));
  console.log(`2. delete-dead-memberships: ${dead.length} membership(s) in a workspace that does not exist`);
  dead.forEach((m) => console.log(`     user ${short(m.uid)} -> ${short(m.orgId)} (${m.data.companyName}) role ${m.data.accessLevel}`));
  console.log(`3. repair-references: ${repairs.length} repair(s), ${kept.length} dangling reference(s) left alone`);
  tally(repairs, (r) => `${r.collection}.${r.field}: ${r.to ? "point at the person's contact" : 'clear'}`).forEach(([k, n]) => console.log(`     ${k}  x${n}`));
  tally(kept, (k) => k.reason).forEach(([reason, n]) => console.log(`     left alone: ${reason}  x${n}`));
  console.log(`4. delete-empty-identities: ${identity.deleteProfiles.length} profile(s) and ${identity.deleteOrgs.length} workspace(s) can go`);
  identity.deleteProfiles.forEach((p) => console.log(`     profile ${short(p.uid)}: ${p.reason}`));
  identity.deleteOrgs.forEach((o) => console.log(`     workspace ${short(o.id)} (${g.orgs.get(o.id)?.name}): ${o.reason}`));
  identity.keptProfiles.forEach((p) => console.log(`     kept profile ${short(p.uid)}: ${p.reason}`));
  console.log(`\nWorkspaces with data and no Super Admin (listed only; never changed here): ${ownerless.length}`);
  ownerless.forEach((o) => console.log(`     ${short(o.id)} "${g.orgs.get(o.id)?.name}" (${orgInfos.find((x) => x.id === o.id)?.recordCount} records), recorded owner ${short(o.ownerUid)} can sign in`));
}
