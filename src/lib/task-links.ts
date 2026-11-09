/**
 * What else still depends on a task, and why a delete or archive is refused (pure; see tests/task-links.test.ts).
 *
 * Related data is anything that would be left pointing at nothing or lose its meaning:
 *   - an invoice or quote line built from the task's time (the line names the task),
 *   - a work order still open whose calendar entry this task is,
 *   - worked time that is not on an invoice yet (it feeds payroll and the time reports).
 * Worked time is the task's own data, so ARCHIVING keeps it (and Restore brings it back), while DELETING it
 * outright is refused: archive it instead. The first two block both.
 */

export interface TaskLinks {
  /** Invoice lines whose source is this task. */
  invoiceLines: number;
  /** Quote lines whose source is this task. */
  quoteLines: number;
  /** The task carries an invoice stamp (billedInvoiceId). */
  billed: boolean;
  /** The work order this task schedules, when it exists. */
  workOrder: { number?: string; status: string } | null;
  /** Seconds of recorded worked time (sessions). */
  workedSeconds: number;
}

export const NO_LINKS: TaskLinks = { invoiceLines: 0, quoteLines: 0, billed: false, workOrder: null, workedSeconds: 0 };

/** Seconds actually worked: the sessions, never a planned schedule span. */
export function workedSecondsOf(task: { sessions?: readonly { durationSeconds?: number }[] | null; duration?: number | null; durationSource?: string | null }): number {
  const fromSessions = (task.sessions ?? []).reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
  if (fromSessions > 0) return fromSessions;
  return task.durationSource === 'sessions' ? Number(task.duration) || 0 : 0;
}

const isOpen = (status: string) => status !== 'completed' && status !== 'cancelled';

/** Reasons that block BOTH delete and archive. */
export function blockingReasons(links: TaskLinks): string[] {
  const reasons: string[] = [];
  if (links.invoiceLines > 0 || links.billed) {
    reasons.push(links.invoiceLines > 1 ? `${links.invoiceLines} invoice lines` : 'an invoice');
  }
  if (links.quoteLines > 0) reasons.push(links.quoteLines > 1 ? `${links.quoteLines} quote lines` : 'a quote');
  if (links.workOrder && isOpen(links.workOrder.status)) {
    reasons.push(`work order ${links.workOrder.number || ''}`.trim() + ` (${links.workOrder.status.replace('_', ' ')})`);
  }
  return reasons;
}

function hoursText(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

const list = (items: string[]) => (items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);

const REMOVE_FIRST = 'Remove it from there first (delete the invoice or quote, or finish or cancel the work order).';

/** Why this task cannot be deleted outright, or null. */
export function taskDeleteProblem(links: TaskLinks): string | null {
  const blocking = blockingReasons(links);
  if (blocking.length > 0) {
    return `This activity is still in use by ${list(blocking)}, so deleting it would leave that work pointing at nothing. ${REMOVE_FIRST}`;
  }
  if (links.workedSeconds > 0) {
    return `This activity has ${hoursText(links.workedSeconds)} of recorded time, which feeds payroll and the time reports, so it cannot be deleted outright. Archive it instead: the archive keeps the time and can be restored from the File Manager.`;
  }
  return null;
}

/** Why this task cannot be archived, or null. Recorded time is kept by the archive, so it does not block. */
export function taskArchiveProblem(links: TaskLinks): string | null {
  const blocking = blockingReasons(links);
  if (blocking.length === 0) return null;
  return `This activity is still in use by ${list(blocking)}, so it cannot be archived (the work would lose the record it points to). ${REMOVE_FIRST}`;
}
