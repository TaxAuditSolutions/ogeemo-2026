/**
 * Work order rules (pure; see tests/work-orders.test.ts).
 *
 * A work order moves pending -> scheduled -> in progress -> completed, and a completed one is
 * invoiced once. It stays 'completed' after invoicing, so the invoice it produced is recorded on
 * it (invoiceNumber); that is what stops a second invoice for the same job.
 */

export type WorkOrderState = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const NEXT: Record<WorkOrderState, readonly WorkOrderState[]> = {
  pending: ['scheduled', 'in_progress', 'cancelled'],
  scheduled: ['in_progress', 'pending', 'cancelled'],
  in_progress: ['completed', 'scheduled', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
};

/** Whether a status change is allowed. A completed work order is final. */
export function canMoveWorkOrder(from: string, to: string): boolean {
  if (from === to) return false;
  const allowed = NEXT[from as WorkOrderState];
  return !!allowed && allowed.includes(to as WorkOrderState);
}

/** Why a work order cannot become an invoice, or null when it can. */
export function workOrderConversionProblem(status: string, invoiceNumber?: string | null): string | null {
  if (invoiceNumber) return `This work order has already been invoiced (${invoiceNumber}). Open that invoice instead.`;
  if (status === 'cancelled') return 'A cancelled work order cannot be invoiced. Reopen it first.';
  if (status !== 'completed') return 'Mark the work order completed before invoicing it.';
  return null;
}

/** True when the work order has been turned into an invoice. */
export function isInvoiced(workOrder: { invoiceNumber?: string | null }): boolean {
  return !!workOrder.invoiceNumber;
}
