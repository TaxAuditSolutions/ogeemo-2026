/**
 * Payroll history rules (pure; see tests/payroll-history.test.ts).
 *
 * History is read back from the payroll runs that were saved, never from sample data. Year-to-date
 * on a pay stub is what that worker was really paid by that run in that calendar year, and a pay
 * period that overlaps one already paid to the same worker is refused so nobody is paid twice.
 */
import { roundCents } from '@/lib/document-totals';

export interface RunDetailLike {
  employeeId?: string;
  employeeName: string;
  grossPay: number;
  deductions: number;
  netPay: number;
}

export interface RunLike {
  id: string;
  /** Day keys, YYYY-MM-DD (local days). */
  periodStart: string;
  periodEnd: string;
  payDate: string;
  /** Saved order breaks ties between runs on the same pay date. */
  createdAtMs?: number;
}

type RunWithDetails = RunLike & { details: readonly RunDetailLike[] };
type WorkerRef = { employeeId?: string; employeeName: string };

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const money = (value: unknown) => (finite(value) ? roundCents(value) : 0);

/** Oldest first, so "up to and including this run" is a slice. */
function chronological<T extends RunLike>(runs: readonly T[]): T[] {
  return [...runs].sort(
    (a, b) =>
      a.payDate.localeCompare(b.payDate) ||
      (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0) ||
      a.id.localeCompare(b.id)
  );
}

/** Newest first, for the history list. */
export function newestFirst<T extends RunLike>(runs: readonly T[]): T[] {
  return chronological(runs).reverse();
}

const sameWorker = (detail: RunDetailLike, worker: WorkerRef) =>
  detail.employeeId && worker.employeeId
    ? detail.employeeId === worker.employeeId
    : detail.employeeName.trim().toLowerCase() === worker.employeeName.trim().toLowerCase();

export interface YearToDate {
  grossPay: number;
  deductions: number;
  netPay: number;
  /** Runs counted, this one included. */
  runs: number;
}

/**
 * What a worker had been paid by the end of `run`, in the calendar year of its pay date: this run
 * plus the earlier runs of the same year, in the order they were saved. A run that does not include
 * the worker adds nothing.
 */
export function yearToDate(runs: readonly RunWithDetails[], run: RunLike, worker: WorkerRef): YearToDate {
  const year = run.payDate.slice(0, 4);
  const ordered = chronological(runs);
  const upTo = ordered.findIndex((candidate) => candidate.id === run.id);
  const counted = (upTo < 0 ? ordered : ordered.slice(0, upTo + 1)).filter((candidate) => candidate.payDate.startsWith(year));

  let gross = 0;
  let deductions = 0;
  let net = 0;
  let runsCounted = 0;
  for (const candidate of counted) {
    const mine = candidate.details.filter((detail) => sameWorker(detail, worker));
    if (mine.length === 0) continue;
    runsCounted += 1;
    for (const detail of mine) {
      gross += money(detail.grossPay);
      deductions += money(detail.deductions);
      net += money(detail.netPay);
    }
  }
  return { grossPay: roundCents(gross), deductions: roundCents(deductions), netPay: roundCents(net), runs: runsCounted };
}

/** Do two day-key periods share at least one day? */
export function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export interface PaidClash {
  employeeName: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Workers in the new run who were already paid for an overlapping period. An empty list means the
 * run is safe to save. Running the same period for a different set of workers is fine.
 */
export function alreadyPaid(existing: readonly RunWithDetails[], period: { start: string; end: string }, workers: readonly WorkerRef[]): PaidClash[] {
  const clashes: PaidClash[] = [];
  for (const worker of workers) {
    for (const run of existing) {
      if (!periodsOverlap(period.start, period.end, run.periodStart, run.periodEnd)) continue;
      if (run.details.some((detail) => sameWorker(detail, worker))) {
        clashes.push({ employeeName: worker.employeeName, periodStart: run.periodStart, periodEnd: run.periodEnd });
        break;
      }
    }
  }
  return clashes;
}

/** One sentence naming who was already paid and for which period, for the refusal message. */
export function alreadyPaidMessage(clashes: readonly PaidClash[]): string {
  const shown = clashes.slice(0, 3).map((c) => `${c.employeeName} (${c.periodStart} to ${c.periodEnd})`);
  const more = clashes.length - shown.length;
  return `Already paid for an overlapping period: ${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}. Remove them from this run, or choose a different pay period.`;
}
