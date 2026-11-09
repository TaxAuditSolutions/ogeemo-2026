/**
 * Which contacts are still in use, and why a delete is refused (pure; see tests/contact-links.test.ts).
 *
 * A contact is not just an address-book entry. Tasks, projects, quotes, invoices, work orders, time
 * logs, leave requests and inventory items all store the contact's id. Deleting the contact leaves
 * every one of them pointing at nothing: an invoice with no client record, a time log nobody can be
 * billed for, a task assigned to a person who no longer exists. So a contact that is linked to any
 * of them cannot be deleted. The way out is to merge it into another contact (which re-points
 * everything) or to deal with the linked records first.
 *
 * Payroll runs are not counted: each one stores the worker's name beside the id as a permanent
 * snapshot of what was paid, so history stays readable after the worker is gone.
 */
import { summarizeReassignments } from '@/lib/contact-merge';

/** One record that names a contact. `docId` makes a record that names the same contact twice count once. */
export interface LinkHit {
  contactId: string;
  collection: string;
  docId: string;
}

/** Linked records per collection, for one contact. */
export type LinkCounts = Record<string, number>;

/** Counts distinct records per contact and collection. Contacts with no links are absent from the result. */
export function tallyLinks(hits: readonly LinkHit[]): Record<string, LinkCounts> {
  const seen = new Map<string, Map<string, Set<string>>>();
  for (const hit of hits) {
    if (!hit.contactId) continue;
    const byCollection = seen.get(hit.contactId) ?? new Map<string, Set<string>>();
    const docs = byCollection.get(hit.collection) ?? new Set<string>();
    docs.add(hit.docId);
    byCollection.set(hit.collection, docs);
    seen.set(hit.contactId, byCollection);
  }
  const result: Record<string, LinkCounts> = {};
  for (const [contactId, byCollection] of seen) {
    const counts: LinkCounts = {};
    for (const [collection, docs] of byCollection) counts[collection] = docs.size;
    result[contactId] = counts;
  }
  return result;
}

export const totalLinks = (counts: LinkCounts | undefined): number =>
  Object.values(counts ?? {}).reduce((sum, count) => sum + count, 0);

export interface BlockedContact {
  id: string;
  name: string;
  counts: LinkCounts;
  /** "3 tasks, 1 invoice" */
  summary: string;
}

export interface DeletePlan {
  /** Contacts with nothing linked: safe to delete. */
  deletable: string[];
  /** Contacts that are in use, with what they are used by. */
  blocked: BlockedContact[];
}

/** Splits the chosen contacts into those that can be deleted and those that are in use. */
export function planContactDelete(
  contacts: readonly { id: string; name?: string }[],
  links: Readonly<Record<string, LinkCounts>>
): DeletePlan {
  const plan: DeletePlan = { deletable: [], blocked: [] };
  for (const contact of contacts) {
    const counts = links[contact.id];
    if (totalLinks(counts) > 0) {
      plan.blocked.push({ id: contact.id, name: contact.name || 'Unnamed contact', counts, summary: summarizeReassignments(counts) });
    } else {
      plan.deletable.push(contact.id);
    }
  }
  return plan;
}

/** The explanation shown when a delete is refused, with the way out. */
export function deleteBlockedMessage(blocked: readonly BlockedContact[]): string {
  if (blocked.length === 0) return '';
  if (blocked.length === 1) {
    const only = blocked[0];
    return `"${only.name}" is still in use by ${only.summary}, so it cannot be deleted without leaving that work pointing at nothing. Merge it into another contact (that moves the work across), or remove or reassign the linked records first.`;
  }
  const names = blocked.slice(0, 3).map((b) => `"${b.name}" (${b.summary})`).join(', ');
  const more = blocked.length > 3 ? ` and ${blocked.length - 3} more` : '';
  return `${blocked.length} of these contacts are still in use: ${names}${more}. Merge them into another contact, or remove or reassign their linked records first.`;
}

/** Thrown by deleteContacts when something is linked, so a screen can explain it instead of showing a bare error. */
export class ContactInUseError extends Error {
  readonly blocked: BlockedContact[];
  constructor(blocked: BlockedContact[]) {
    super(deleteBlockedMessage(blocked));
    this.name = 'ContactInUseError';
    this.blocked = blocked;
  }
}
