/**
 * Contact merge rules (pure; see tests/contact-merge.test.ts).
 *
 * Merging a duplicate contact into a master must never orphan work. Every
 * record that points at the duplicate is re-pointed at the master first; the
 * duplicate is deleted only after that succeeds.
 */
import type { Contact } from '@/data/contacts';

export interface ContactReference {
  /** Firestore collection holding records that point at a contact. */
  collection: string;
  /** Field on those records that holds a contact id. */
  field: string;
}

/**
 * Every place a contact id is stored. Contacts double as clients, suppliers
 * and workers, so one contact can appear under several field names. Keep this
 * list in step with the services (tests/contact-merge.test.ts checks that each
 * collection exists in firestore.rules).
 */
export const CONTACT_REFERENCES: readonly ContactReference[] = [
  { collection: 'tasks', field: 'contactId' },
  { collection: 'tasks', field: 'workerId' },
  { collection: 'projects', field: 'contactId' },
  { collection: 'projects', field: 'clientId' },
  { collection: 'projects', field: 'projectManagerId' },
  { collection: 'quotes', field: 'contactId' },
  { collection: 'quotes', field: 'supplierId' },
  { collection: 'invoices', field: 'contactId' },
  { collection: 'invoices', field: 'supplierId' },
  { collection: 'workOrders', field: 'contactId' },
  { collection: 'workOrders', field: 'supplierId' },
  { collection: 'timeLogs', field: 'contactId' },
  { collection: 'timeLogs', field: 'workerId' },
  { collection: 'leaveRequests', field: 'workerId' },
  { collection: 'inventoryItems', field: 'supplierId' },
];

/** Firestore allows 500 writes per batch; stay well under it. */
export const MERGE_BATCH_SIZE = 400;

type ContactLike = Partial<Record<keyof Contact, unknown>> & { name?: string };

/** Plain details copied to the master only when the master has none of its own. */
const FILL_IF_BLANK_FIELDS = [
  'email',
  'website',
  'businessName',
  'industryCode',
  'craProgramAccountNumber',
  'businessPhone',
  'cellPhone',
  'homePhone',
  'faxNumber',
  'birthDate',
] as const;

/** Treated as one block so a master never ends up with a mixed-up address. */
const ADDRESS_FIELDS = ['streetAddress', 'city', 'provinceState', 'postalCode', 'country'] as const;

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/**
 * The fields to add to the master contact from the duplicate. Never overwrites
 * anything the master already has, and never copies identity, folder, payroll
 * or other confidential HR data.
 */
export function buildMergePatch(master: ContactLike, source: ContactLike): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  for (const field of FILL_IF_BLANK_FIELDS) {
    if (isBlank(master[field]) && !isBlank(source[field])) patch[field] = source[field];
  }

  if (ADDRESS_FIELDS.every((field) => isBlank(master[field]))) {
    for (const field of ADDRESS_FIELDS) {
      if (!isBlank(source[field])) patch[field] = source[field];
    }
  }

  const sourceNotes = typeof source.notes === 'string' ? source.notes.trim() : '';
  if (sourceNotes) {
    const masterNotes = typeof master.notes === 'string' ? master.notes.trim() : '';
    if (!masterNotes) {
      patch.notes = sourceNotes;
    } else if (!masterNotes.includes(sourceNotes)) {
      patch.notes = `${masterNotes}\n\n[Merged from ${source.name || 'duplicate contact'}] ${sourceNotes}`;
    }
  }

  return patch;
}

export function chunkItems<T>(items: readonly T[], size: number = MERGE_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export interface PendingReassignment {
  /** Firestore document path of the record to update. */
  path: string;
  collection: string;
  /** Fields on that record to point at the master. */
  fields: string[];
}

/**
 * Collapses (record, field) hits into one update per record, so a task that
 * names the duplicate as both client and worker is written once.
 */
export function groupReassignments(
  hits: ReadonlyArray<{ path: string; collection: string; field: string }>,
): PendingReassignment[] {
  const byPath = new Map<string, PendingReassignment>();
  for (const hit of hits) {
    const existing = byPath.get(hit.path);
    if (!existing) {
      byPath.set(hit.path, { path: hit.path, collection: hit.collection, fields: [hit.field] });
    } else if (!existing.fields.includes(hit.field)) {
      existing.fields.push(hit.field);
    }
  }
  return [...byPath.values()];
}

/** "3 tasks, 1 invoice" style summary for the confirmation toast. */
export function summarizeReassignments(counts: Readonly<Record<string, number>>): string {
  const labels: Record<string, [string, string]> = {
    tasks: ['task', 'tasks'],
    projects: ['project', 'projects'],
    quotes: ['quote', 'quotes'],
    invoices: ['invoice', 'invoices'],
    workOrders: ['work order', 'work orders'],
    timeLogs: ['time log', 'time logs'],
    leaveRequests: ['leave request', 'leave requests'],
    inventoryItems: ['inventory item', 'inventory items'],
  };
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([collection, count]) => {
      const [one, many] = labels[collection] ?? [collection, collection];
      return `${count} ${count === 1 ? one : many}`;
    });
  return parts.length > 0 ? parts.join(', ') : 'no linked records';
}
