/**
 * Summing worked and billable time for the AI assistant (pure; see tests/ai-time-summary.test.ts).
 *
 * Time lives in two collections: `timeLogs` (manual and field-app logs) and `tasks` (Activity Manager sessions). The
 * Time Log Report merges them; this does the same and sorts every entry into the buckets the billing rules define
 * (src/lib/billing-eligibility.ts), so the assistant can never disagree with the screen:
 *   - unbilled: billable, worked, has a client, not yet on an invoice (what "Create Invoice" would offer);
 *   - invoiced: the same, but already on an invoice;
 *   - scheduled-only: a planned span nobody has worked yet (never counted as worked or billable);
 *   - billable with no client: worked and billable but cannot be invoiced until a client is set.
 *
 * "Mine" follows the calendar rule: an entry belongs to the person it is assigned to (`workerId`, which holds either a
 * sign-in id or the person's contact id), or to the person who made it when nobody is assigned.
 */
import { isEligibleForBilling, isInvoiced } from '@/lib/billing-eligibility';
import { isScheduledPlaceholder } from '@/lib/duration-source';
import { resolveEntryStart } from '@/lib/time-entry-date';
import { toDate } from '@/lib/ai-calendar';

/** Roles that may see the whole workspace's time and the money on it. */
const ADMIN_LEVELS = new Set(['super_admin', 'org_admin']);

export function canSeeWorkspaceTime(accessLevel: unknown): boolean {
  return typeof accessLevel === 'string' && ADMIN_LEVELS.has(accessLevel);
}

export interface TimeEntry {
  source: 'log' | 'event';
  /** Who the entry is assigned to (a sign-in id or a contact id), or null. */
  workerId: string | null;
  /** Who created it, the owner when nobody is assigned. */
  userId: string | null;
  contactId: string | null;
  start: Date | null;
  durationSeconds: number;
  isBillable: boolean;
  billableRate: number;
  scheduledOnly: boolean;
  billedInvoiceId: string | null;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** A `timeLogs` record as an entry. */
export function entryFromTimeLog(row: Record<string, any>): TimeEntry {
  return {
    source: 'log',
    workerId: text(row.workerId),
    userId: text(row.userId),
    contactId: text(row.contactId),
    start: toDate(row.startTime),
    durationSeconds: count(row.durationSeconds),
    isBillable: row.isBillable === true,
    billableRate: count(row.billableRate),
    scheduledOnly: false,
    billedInvoiceId: text(row.billedInvoiceId),
  };
}

/** A `tasks` record (Activity Manager) as an entry. Its date is the one the Time Log Report shows. */
export function entryFromTask(row: Record<string, any>): TimeEntry {
  const sessions = Array.isArray(row.sessions)
    ? row.sessions.map((session: any) => ({ ...session, startTime: toDate(session?.startTime) }))
    : [];
  return {
    source: 'event',
    workerId: text(row.workerId),
    userId: text(row.userId),
    contactId: text(row.contactId),
    start: resolveEntryStart({ start: toDate(row.start), sessions, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) }),
    durationSeconds: count(row.duration),
    isBillable: row.isBillable === true,
    billableRate: count(row.billableRate),
    scheduledOnly: isScheduledPlaceholder({ durationSource: row.durationSource, isScheduled: row.isScheduled === true, sessions }),
    billedInvoiceId: text(row.billedInvoiceId),
  };
}

export interface TimeOwner {
  userId: string;
  contactId?: string | null;
}

export function isMine(entry: TimeEntry, owner: TimeOwner): boolean {
  const own = new Set<string>([owner.userId]);
  if (owner.contactId) own.add(owner.contactId);
  return entry.workerId ? own.has(entry.workerId) : entry.userId === owner.userId;
}


export interface TimeFilter {
  /** Entries starting at or after this moment. */
  from?: Date | null;
  /** Entries starting before this moment. */
  to?: Date | null;
  /** Only this client's time. */
  contactId?: string | null;
}

export interface ClientTotal {
  contactId: string;
  hours: number;
  amount: number;
}

export interface TimeTotals {
  /** Worked time, billable or not, scheduled-only excluded. */
  workedHours: number;
  billableHours: number;
  unbilledHours: number;
  unbilledAmount: number;
  invoicedHours: number;
  scheduledOnlyHours: number;
  billableNoClientHours: number;
  unbilledByClient: ClientTotal[];
  entryCount: number;
}

const hours = (seconds: number): number => Math.round(seconds / 36) / 100;
const money = (amount: number): number => Math.round(amount * 100) / 100;

export function summarizeTime(entries: readonly TimeEntry[], filter: TimeFilter = {}): TimeTotals {
  let worked = 0;
  let billable = 0;
  let unbilled = 0;
  let unbilledAmount = 0;
  let invoiced = 0;
  let scheduled = 0;
  let noClient = 0;
  let counted = 0;
  const byClient = new Map<string, { seconds: number; amount: number }>();

  for (const entry of entries) {
    if (entry.durationSeconds <= 0) continue;
    if (filter.contactId && entry.contactId !== filter.contactId) continue;
    if (filter.from || filter.to) {
      if (!entry.start) continue;
      if (filter.from && entry.start.getTime() < filter.from.getTime()) continue;
      if (filter.to && entry.start.getTime() >= filter.to.getTime()) continue;
    }
    counted += 1;

    if (entry.scheduledOnly) {
      scheduled += entry.durationSeconds;
      continue;
    }
    worked += entry.durationSeconds;
    if (!entry.isBillable) continue;
    billable += entry.durationSeconds;

    const amount = (entry.durationSeconds / 3600) * entry.billableRate;
    if (isEligibleForBilling(entry)) {
      unbilled += entry.durationSeconds;
      unbilledAmount += amount;
      const row = byClient.get(entry.contactId as string) ?? { seconds: 0, amount: 0 };
      row.seconds += entry.durationSeconds;
      row.amount += amount;
      byClient.set(entry.contactId as string, row);
    } else if (isInvoiced(entry)) {
      invoiced += entry.durationSeconds;
    } else if (!entry.contactId && !entry.billedInvoiceId) {
      noClient += entry.durationSeconds;
    }
  }

  return {
    workedHours: hours(worked),
    billableHours: hours(billable),
    unbilledHours: hours(unbilled),
    unbilledAmount: money(unbilledAmount),
    invoicedHours: hours(invoiced),
    scheduledOnlyHours: hours(scheduled),
    billableNoClientHours: hours(noClient),
    unbilledByClient: [...byClient.entries()]
      .map(([contactId, row]) => ({ contactId, hours: hours(row.seconds), amount: money(row.amount) }))
      .sort((a, b) => b.hours - a.hours || a.contactId.localeCompare(b.contactId)),
    entryCount: counted,
  };
}
