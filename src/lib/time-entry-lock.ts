/**
 * Time and activity records that have been invoiced (pure; see tests/time-entry-lock.test.ts).
 *
 * When time is put on an invoice, the entry is stamped with billedInvoiceId and the invoice line points
 * back at it. If that entry is then deleted, the line points at nothing and the audit trail is gone. If
 * its hours, rate or client are changed, the invoice no longer matches the work it was built from, and
 * the entry shows a different amount than the customer was billed. So an invoiced entry is locked: it
 * cannot be deleted, and the fields an invoice depends on cannot be changed. Deleting or editing the
 * invoice releases it (the invoice code clears the stamp), and then it can be changed again.
 */

export type EntryKind = 'time log' | 'activity';

type Raw = Record<string, unknown> | null | undefined;

export function isBilledEntry(entry: Raw): boolean {
  return Boolean(entry && entry.billedInvoiceId);
}

/** Milliseconds for a Date, a Firestore Timestamp, a number or a date string; null when it is none of those. */
function millis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0);
const idOrNull = (value: unknown) => (typeof value === 'string' && value ? value : null);

function sessionsSignature(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((s) => `${(s as { id?: unknown })?.id ?? ''}:${num((s as { durationSeconds?: unknown })?.durationSeconds)}`).join('|');
}

/** The fields an invoice is built from, per kind: [field, human label, how to compare]. */
const LOCKED_FIELDS: Record<EntryKind, ReadonlyArray<[string, string, (a: unknown, b: unknown) => boolean]>> = {
  activity: [
    ['duration', 'time', (a, b) => num(a) === num(b)],
    ['sessions', 'time sessions', (a, b) => sessionsSignature(a) === sessionsSignature(b)],
    ['isBillable', 'billable setting', (a, b) => Boolean(a) === Boolean(b)],
    ['billableRate', 'rate', (a, b) => num(a) === num(b)],
    ['contactId', 'client', (a, b) => idOrNull(a) === idOrNull(b)],
  ],
  'time log': [
    ['durationSeconds', 'time', (a, b) => num(a) === num(b)],
    ['startTime', 'start time', (a, b) => millis(a) === millis(b)],
    ['endTime', 'end time', (a, b) => millis(a) === millis(b)],
    ['isBillable', 'billable setting', (a, b) => Boolean(a) === Boolean(b)],
    ['billableRate', 'rate', (a, b) => num(a) === num(b)],
    ['contactId', 'client', (a, b) => idOrNull(a) === idOrNull(b)],
    ['workerId', 'worker', (a, b) => idOrNull(a) === idOrNull(b)],
  ],
};

/** Labels of the locked fields that `patch` would change. Fields not in the patch are not changes. */
export function lockedFieldChanges(current: Raw, patch: Raw, kind: EntryKind): string[] {
  if (!current || !patch) return [];
  const changed: string[] = [];
  for (const [field, label, same] of LOCKED_FIELDS[kind]) {
    if (field in patch && !same(current[field], patch[field])) changed.push(label);
  }
  return changed;
}

const RELEASE = 'Delete the invoice, or take this line off it, to release it.';

/** Why an update is refused, or null. Only changes to the fields an invoice depends on are refused. */
export function billedUpdateProblem(current: Raw, patch: Raw, kind: EntryKind): string | null {
  if (!isBilledEntry(current)) return null;
  const changed = lockedFieldChanges(current, patch, kind);
  if (changed.length === 0) return null;
  return `This ${kind} is on an invoice, so its ${changed.join(', ')} cannot be changed. ${RELEASE}`;
}

/** Why a delete is refused, or null. */
export function billedDeleteProblem(current: Raw, kind: EntryKind): string | null {
  if (!isBilledEntry(current)) return null;
  return `This ${kind} is on an invoice, so it cannot be deleted. ${RELEASE}`;
}

/** Why a project cannot be deleted: some of its activities are invoiced. */
export function projectDeleteProblem(tasks: readonly Raw[]): string | null {
  const billed = tasks.filter((task) => isBilledEntry(task)).length;
  if (billed === 0) return null;
  return `${billed} ${billed === 1 ? 'activity' : 'activities'} in this project ${billed === 1 ? 'is' : 'are'} on invoices, so the project cannot be deleted. Delete those invoices first, or move the work to another project.`;
}

const BILLING_FIELDS = ['duration', 'durationSource', 'sessions', 'isBillable', 'billableRate', 'contactId'] as const;

/** A copy of an activity save without the fields an invoice depends on, for a record that is invoiced. */
export function withoutLockedActivityFields<T extends Record<string, unknown>>(data: T): T {
  const copy: Record<string, unknown> = { ...data };
  for (const field of BILLING_FIELDS) delete copy[field];
  return copy as T;
}

/** A billable rate in dollars per hour: blank means not set (0), otherwise 0 or more, to the cent. */
export function checkBillableRate(value: unknown): { ok: true; rate: number } | { ok: false; error: string } {
  if (value === '' || value === null || value === undefined) return { ok: true, rate: 0 };
  const rate = Number(value);
  if (!Number.isFinite(rate)) return { ok: false, error: 'The rate must be a number.' };
  if (rate < 0) return { ok: false, error: 'The rate cannot be negative.' };
  if (rate > 100000) return { ok: false, error: 'That hourly rate is too high. Check it.' };
  return { ok: true, rate: Math.round(rate * 100) / 100 };
}

const toMs = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return null;
};

/**
 * What is wrong with a time log, or null. It needs an end after its start. The recorded length may be SHORTER
 * than the span (breaks and pauses are not worked time) but never longer: a length longer than the clock
 * allows is what gets billed and paid. `existing` fills in times a partial update does not mention.
 */
export function timeLogProblem(data: Record<string, unknown>, existing?: Record<string, unknown>): string | null {
  const start = 'startTime' in data ? toMs(data.startTime) : toMs(existing?.startTime);
  const end = 'endTime' in data ? toMs(data.endTime) : toMs(existing?.endTime);
  if (start === null || end === null) return existing ? null : 'A time log needs a start and an end time.';
  if (end <= start) return 'The end time must be after the start time.';
  const spanSeconds = Math.round((end - start) / 1000);
  const length = 'durationSeconds' in data ? data.durationSeconds : existing?.durationSeconds;
  if (typeof length === 'number') {
    if (!Number.isFinite(length) || length <= 0) return 'The recorded length must be more than zero.';
    if (length > spanSeconds + 1) return `The recorded length (${length} seconds) is longer than the time between the start and the end (${spanSeconds} seconds).`;
  }
  if ('billableRate' in data) {
    const rate = checkBillableRate(data.billableRate);
    if (!rate.ok) return rate.error;
  }
  return null;
}