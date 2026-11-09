// Reads everything the access clean-up needs (read-only). Used by scripts/clean-access-data.ts.
import { getAdminAuth, getAdminDb } from '../src/core/firebase-admin';
import { CONTACT_REFERENCES } from '../src/lib/contact-merge';
import type { RefRow } from '../src/lib/data-cleanup';

export interface Gathered {
  accounts: { uid: string; orgId?: string; accessLevel?: string; isMasterTenant?: boolean; disabled: boolean; claims: Record<string, unknown> }[];
  profiles: Map<string, Record<string, any>>;
  orgs: Map<string, Record<string, any>>;
  memberships: { uid: string; orgId: string; data: Record<string, any> }[];
  contacts: Map<string, { id: string; orgId?: string | null }>;
  refRows: RefRow[];
  /** Every id that any record names in a person or contact field. */
  referencedIds: Set<string>;
  recordCount: (orgId: string) => Promise<number>;
}

const isLocked = (data: Record<string, any>) =>
  Boolean(data.billedInvoiceId || data.invoiceId || data.status === 'paid' || (typeof data.paidAmount === 'number' && data.paidAmount > 0));

export async function gather(): Promise<Gathered> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) throw new Error('Firebase Admin is unavailable. Configure service-account credentials first.');

  const accounts: Gathered['accounts'] = [];
  let token: string | undefined;
  do {
    const page = await auth.listUsers(1000, token);
    for (const u of page.users) {
      const c = (u.customClaims ?? {}) as Record<string, any>;
      accounts.push({ uid: u.uid, orgId: typeof c.orgId === 'string' ? c.orgId : undefined, accessLevel: c.accessLevel, isMasterTenant: c.isMasterTenant === true, disabled: u.disabled, claims: c });
    }
    token = page.pageToken;
  } while (token);

  const [profSnap, orgSnap, contactSnap] = await Promise.all([db.collection('users').get(), db.collection('organizations').get(), db.collection('contacts').get()]);
  const profiles = new Map(profSnap.docs.map((d) => [d.id, d.data() as Record<string, any>]));
  const orgs = new Map(orgSnap.docs.map((d) => [d.id, d.data() as Record<string, any>]));
  const contacts = new Map(contactSnap.docs.map((d) => [d.id, { id: d.id, orgId: (d.data().orgId as string | undefined) ?? null }]));

  const memberships: Gathered['memberships'] = [];
  for (const uid of new Set([...profiles.keys(), ...accounts.map((a) => a.uid)])) {
    const snap = await db.collection('users').doc(uid).collection('orgMemberships').get();
    snap.forEach((d) => memberships.push({ uid, orgId: d.id, data: d.data() as Record<string, any> }));
  }

  const refRows: RefRow[] = [];
  const referencedIds = new Set<string>();
  for (const ref of CONTACT_REFERENCES) {
    const snap = await db.collection(ref.collection).get();
    snap.forEach((d) => {
      const value = d.data()[ref.field];
      if (typeof value !== 'string' || !value) return;
      referencedIds.add(value);
      refRows.push({ collection: ref.collection, docId: d.id, field: ref.field, value, orgId: (d.data().orgId as string | undefined) ?? null, locked: isLocked(d.data()) });
    });
  }

  let collectionNames: string[] | null = null;
  const recordCount = async (orgId: string) => {
    if (!collectionNames) collectionNames = (await db.listCollections()).map((c) => c.id).filter((n) => n !== 'users' && n !== 'organizations');
    let total = 0;
    for (const name of collectionNames) total += (await db.collection(name).where('orgId', '==', orgId).count().get()).data().count;
    return total;
  };

  return { accounts, profiles, orgs, memberships, contacts, refRows, referencedIds, recordCount };
}
