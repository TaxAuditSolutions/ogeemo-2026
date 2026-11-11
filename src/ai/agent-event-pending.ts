/**
 * The bookkeeping behind changeEvent's two steps (see tests/agent-event-tool.test.ts).
 *
 * A preview is saved as the person's single pending change (collection `aiPendingChanges`, document id = their user
 * id, so a new preview replaces the old one). It only counts as the thing a "yes" confirms when it describes exactly
 * the same change, for the same workspace, and is recent. Also here: the Calendar's own "is this event in use?" check,
 * read on the server.
 */
import { PENDING_MINUTES, type ChangePlan } from '@/lib/ai-event-change';
import { NO_LINKS, workedSecondsOf, type TaskLinks } from '@/lib/task-links';
import type { DbLike } from '@/ai/agent-tools';

export const PENDING_COLLECTION = 'aiPendingChanges';

export interface Pending {
  orgId: string;
  eventId: string;
  action: string;
  fromStart: number;
  fromEnd: number;
  toStart: number | null;
  toEnd: number | null;
  allowDoubleBooking: boolean;
  createdAt: number;
}

export const toPending = (plan: ChangePlan, orgId: string, now: Date): Pending => ({
  orgId,
  eventId: plan.eventId,
  action: plan.action,
  fromStart: plan.from.start.getTime(),
  fromEnd: plan.from.end.getTime(),
  toStart: plan.to ? plan.to.start.getTime() : null,
  toEnd: plan.to ? plan.to.end.getTime() : null,
  allowDoubleBooking: plan.allowDoubleBooking,
  createdAt: now.getTime(),
});

const SAME_FIELDS = ['orgId', 'eventId', 'action', 'fromStart', 'fromEnd', 'toStart', 'toEnd', 'allowDoubleBooking'] as const;

/** True when the saved preview is exactly what this call asks for, for this workspace, and has not gone stale. */
export function matchesPending(saved: Partial<Pending> | undefined, fresh: Pending, now: Date): boolean {
  if (!saved || typeof saved.createdAt !== 'number') return false;
  const age = now.getTime() - saved.createdAt;
  if (age > PENDING_MINUTES * 60_000 || age < -60_000) return false;
  return SAME_FIELDS.every((key) => saved[key] === fresh[key]);
}

/** Everything that still depends on this task, as the Calendar's own delete check reads it (server side). */
export async function linksFor(db: DbLike, orgId: string, taskId: string, data: Record<string, any>): Promise<TaskLinks> {
  const [invoiceLines, quoteLines] = await Promise.all([
    db.collection('invoiceLineItems').where('orgId', '==', orgId).where('sourceEntryId', '==', taskId).get(),
    db.collection('quoteLineItems').where('orgId', '==', orgId).where('sourceEntryId', '==', taskId).get(),
  ]);
  let workOrder: TaskLinks['workOrder'] = null;
  if (typeof data.workOrderId === 'string' && data.workOrderId) {
    const wo = await db.collection('workOrders').doc(data.workOrderId).get();
    if (wo.exists && wo.data()?.orgId === orgId) workOrder = { number: wo.data()?.workOrderNumber, status: String(wo.data()?.status ?? 'pending') };
  }
  return {
    ...NO_LINKS,
    invoiceLines: invoiceLines.docs.length,
    quoteLines: quoteLines.docs.length,
    billed: Boolean(data.billedInvoiceId),
    workOrder,
    workedSeconds: workedSecondsOf(data),
  };
}
