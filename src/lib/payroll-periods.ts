/**
 * Pay-period rules (pure; see tests/payroll-periods.test.ts).
 *
 * The pay period for a payroll run comes from the workspace's pay schedule
 * rather than two freely chosen dates, so successive periods line up end to end
 * with no gaps or overlaps (a gap means unpaid time; an overlap means paying
 * the same time twice).
 */
import { addDays, endOfMonth, format, isValid, startOfDay, startOfMonth } from 'date-fns';

export const PAY_SCHEDULES = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'] as const;
export type PaySchedule = (typeof PAY_SCHEDULES)[number];

export const PAY_SCHEDULE_LABELS: Record<PaySchedule, string> = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly (every 2 weeks)',
  'semi-monthly': 'Semi-monthly (1st-15th and 16th-end of month)',
  monthly: 'Monthly (1st to end of month)',
};

/** 0 = Sunday ... 6 = Saturday. */
export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface PeriodConfig {
  paySchedule: PaySchedule;
  /** First day of a weekly period (0 = Sunday ... 6 = Saturday). Ignored otherwise. */
  periodStartDay: number;
  /**
   * Bi-weekly only: the first day (YYYY-MM-DD) of any one real pay period. Every
   * other period is a multiple of 14 days from it, so they stay in step.
   */
  biweeklyAnchor: string | null;
}

export interface PayPeriod {
  start: Date;
  end: Date;
  /** Human-readable, e.g. "Nov 1 - Nov 14, 2026". */
  label: string;
}

/** Parses YYYY-MM-DD as a local date; null when missing or not a real date. */
export function parseDateKey(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isValid(date) && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function makePeriod(start: Date, end: Date): PayPeriod {
  const label =
    start.getFullYear() === end.getFullYear()
      ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
      : `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  return { start: startOfDay(start), end: startOfDay(end), label };
}

/** The pay period that contains `date`, or null when the schedule cannot place it. */
export function payPeriodContaining(date: Date, config: PeriodConfig): PayPeriod | null {
  const day = startOfDay(date);

  switch (config.paySchedule) {
    case 'weekly': {
      const back = (day.getDay() - config.periodStartDay + 7) % 7;
      const start = addDays(day, -back);
      return makePeriod(start, addDays(start, 6));
    }
    case 'bi-weekly': {
      const anchor = parseDateKey(config.biweeklyAnchor);
      if (!anchor) return null;
      const diffDays = Math.round((day.getTime() - startOfDay(anchor).getTime()) / 86_400_000);
      const start = addDays(day, -(((diffDays % 14) + 14) % 14));
      return makePeriod(start, addDays(start, 13));
    }
    case 'semi-monthly':
      return day.getDate() <= 15
        ? makePeriod(startOfMonth(day), new Date(day.getFullYear(), day.getMonth(), 15))
        : makePeriod(new Date(day.getFullYear(), day.getMonth(), 16), endOfMonth(day));
    case 'monthly':
      return makePeriod(startOfMonth(day), endOfMonth(day));
  }
}

/** The period straight after (1) or before (-1) another. */
export function adjacentPayPeriod(period: PayPeriod, direction: 1 | -1, config: PeriodConfig): PayPeriod | null {
  return payPeriodContaining(direction === 1 ? addDays(period.end, 1) : addDays(period.start, -1), config);
}

/** The most recent period that has fully ended (the one normally paid next). */
export function lastCompletedPayPeriod(today: Date, config: PeriodConfig): PayPeriod | null {
  const current = payPeriodContaining(today, config);
  return current ? adjacentPayPeriod(current, -1, config) : null;
}

/** True when the dates are exactly one whole pay period of the schedule. */
export function isStandardPeriod(start: Date, end: Date, config: PeriodConfig): boolean {
  const standard = payPeriodContaining(start, config);
  return !!standard && standard.start.getTime() === startOfDay(start).getTime() && standard.end.getTime() === startOfDay(end).getTime();
}
