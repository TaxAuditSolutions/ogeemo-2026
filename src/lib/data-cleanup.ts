/**
 * Which stale references are safe to repair (pure; see tests/data-cleanup.test.ts).
 *
 * Used by scripts/clean-access-data.ts. Every rule is conservative: it only acts where the answer is unambiguous,
 * never on an invoiced or paid record, never on a record with no workspace, and it lists what it leaves alone and why.
 * Identity clean-up (profiles, workspaces, accounts) is in data-cleanup-identity.ts.
 */

export interface RefRow {
  collection: string;
  docId: string;
  field: string;
  value: string;
  orgId?: string | null;
  /** Invoiced or paid: never touched. */
  locked: boolean;
}

export interface ContactInfo {
  id: string;
  orgId?: string | null;
}

export interface PersonLink {
  uid: string;
  contactId?: string | null;
}

export interface RepairOp {
  collection: string;
  docId: string;
  field: string;
  from: string;
  /** The contact id to point at, or null to clear the field. */
  to: string | null;
  reason: string;
}

export interface KeptRef {
  row: RefRow;
  reason: string;
}

/** Fields that name a PERSON, where a sign-in id was stored instead of the person's contact id. */
const PERSON_FIELDS = new Set(['workerId', 'projectManagerId']);

/**
 * Plans repairs for references that name no contact.
 *  - A person field that holds a sign-in id is pointed at that person's contact, but only when the contact exists
 *    and lives in the SAME workspace as the record.
 *  - A task's client that no longer exists anywhere is cleared (it can only show as "unknown").
 *  - Everything else stays, with the reason.
 */
export function planReferenceRepairs(
  rows: readonly RefRow[],
  contacts: ReadonlyMap<string, ContactInfo>,
  people: ReadonlyMap<string, PersonLink>
): { repairs: RepairOp[]; kept: KeptRef[] } {
  const repairs: RepairOp[] = [];
  const kept: KeptRef[] = [];
  for (const row of rows) {
    if (contacts.has(row.value)) continue; // not dangling
    if (!row.orgId) { kept.push({ row, reason: 'the record has no workspace (the app never loads it)' }); continue; }
    if (row.locked) { kept.push({ row, reason: 'the record is invoiced or paid' }); continue; }

    const person = people.get(row.value);
    if (PERSON_FIELDS.has(row.field) && person) {
      const contact = person.contactId ? contacts.get(person.contactId) : undefined;
      if (contact && contact.orgId === row.orgId) {
        repairs.push({ collection: row.collection, docId: row.docId, field: row.field, from: row.value, to: contact.id, reason: "a sign-in id was stored; pointed at that person's contact" });
      } else {
        kept.push({ row, reason: contact ? "that person's contact is in another workspace" : 'that person has no contact record' });
      }
      continue;
    }
    if (row.collection === 'tasks' && row.field === 'contactId' && !person) {
      repairs.push({ collection: row.collection, docId: row.docId, field: row.field, from: row.value, to: null, reason: 'the client no longer exists anywhere' });
      continue;
    }
    kept.push({ row, reason: person ? 'names a person, not a contact' : 'the person no longer exists, and the history is worth keeping' });
  }
  return { repairs, kept };
}
