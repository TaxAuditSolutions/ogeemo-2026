/**
 * Which date an Activity Manager entry belongs to in the time reports
 * (pure; see tests/time-entry-date.test.ts).
 *
 * An activity saved with "No set time" has no scheduled start, but can still
 * have worked time (a timer session). The reports used `new Date(task.start)`
 * directly, which is an Invalid Date for those entries: formatting it threw and
 * the whole report failed to render (Work Activity showed 1 Jan 1970 instead).
 */

type DateLike = Date | { toDate: () => Date } | string | number | null | undefined;

export interface DatedEntry {
  start?: DateLike;
  sessions?: ReadonlyArray<{ startTime?: DateLike }> | null;
  createdAt?: DateLike;
  updatedAt?: DateLike;
}

function toValidDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' && typeof value.toDate === 'function'
        ? value.toDate()
        : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The date to show and filter an entry by. The scheduled start wins when there
 * is one (existing behaviour); otherwise the day the work was actually done,
 * then the day the entry was created. Null only when nothing is dated.
 */
export function resolveEntryStart(entry: DatedEntry): Date | null {
  const scheduled = toValidDate(entry.start);
  if (scheduled) return scheduled;

  const sessionStarts = (entry.sessions ?? [])
    .map((session) => toValidDate(session.startTime))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (sessionStarts.length > 0) return sessionStarts[0];

  return toValidDate(entry.createdAt) ?? toValidDate(entry.updatedAt);
}

/** True when the date came from the scheduled start rather than a fallback. */
export function hasScheduledStart(entry: DatedEntry): boolean {
  return toValidDate(entry.start) !== null;
}
