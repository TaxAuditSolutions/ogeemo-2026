/**
 * The bookkeeping behind updateContact's two steps (see tests/agent-contact-update-gate.test.ts).
 *
 * A preview is saved as the person's single pending change in `aiPendingChanges/<userId>`, the same place a pending
 * calendar change lives, so a newer preview of EITHER kind replaces the older one. It is tagged kind 'contact', and a
 * calendar plan has no such tag, so a preview of one kind can never be confirmed as the other.
 */
import { PENDING_MINUTES } from '@/lib/ai-event-change';
import type { ContactUpdatePlan } from '@/lib/ai-contact-update-types';

export { PENDING_COLLECTION } from '@/ai/agent-event-pending';

export interface PendingContactChange {
  kind: 'contact';
  orgId: string;
  contactId: string;
  /** The planned values, as sorted "field=value" lines, so two plans compare equal exactly when they change the same things. */
  patch: string;
  /** What those fields held when the preview was made, in the same shape. The change is refused if they differ at the end. */
  before: string;
  allowDuplicate: boolean;
  createdAt: number;
}

const lines = (values: Record<string, string>) =>
  Object.keys(values)
    .sort()
    .map((key) => `${key}=${values[key]}`)
    .join('\n');

/** The stored values of exactly the fields a plan touches (the folder as folderId). */
export function beforeValues(plan: ContactUpdatePlan, stored: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const change of plan.changes) {
    const value = stored[change.field];
    out[change.field] = typeof value === 'string' ? value.trim() : '';
  }
  return out;
}

export function toPendingContact(plan: ContactUpdatePlan, orgId: string, stored: Record<string, unknown>, now: Date): PendingContactChange {
  return {
    kind: 'contact',
    orgId,
    contactId: plan.contactId,
    patch: lines(plan.patch),
    before: lines(beforeValues(plan, stored)),
    allowDuplicate: plan.allowDuplicate,
    createdAt: now.getTime(),
  };
}

const SAME = ['kind', 'orgId', 'contactId', 'patch', 'allowDuplicate'] as const;

/** True when the saved preview is exactly this change, for this workspace, and has not gone stale. */
export function matchesPendingContact(saved: Partial<PendingContactChange> | undefined, fresh: PendingContactChange, now: Date): boolean {
  if (!saved || saved.kind !== 'contact' || typeof saved.createdAt !== 'number') return false;
  const age = now.getTime() - saved.createdAt;
  if (age > PENDING_MINUTES * 60_000 || age < -60_000) return false;
  return SAME.every((key) => saved[key] === fresh[key]);
}
