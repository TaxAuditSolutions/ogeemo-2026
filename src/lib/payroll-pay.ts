/**
 * Gross pay for one worker over an exact pay period (pure; see
 * tests/payroll-pay.test.ts).
 *
 * - Hourly: hours worked in the period x hourly rate.
 * - Salary: the Rate on a salaried worker is an ANNUAL salary. Pay is that
 *   salary prorated to the exact number of days in the period, so a week pays
 *   a week, a month pays that month, and a full year pays the whole salary. It
 *   used to pay half the annual salary for any period, which overpaid short
 *   periods and underpaid long ones.
 *
 * Proration is per calendar year (days in the period that fall in a year, over
 * that year's length), so leap years and periods that cross New Year are exact.
 */
import { differenceInCalendarDays, endOfYear, startOfDay, startOfYear } from 'date-fns';

export type PayType = 'hourly' | 'salary' | null | undefined;

export interface GrossPayInput {
  payType: PayType;
  /** Hourly rate, or annual salary when payType is 'salary'. */
  rate: number | string | null | undefined;
  /** Hours worked in the period (only used for hourly pay). */
  hoursWorked: number;
  periodStart: Date | undefined;
  periodEnd: Date | undefined;
}

const toCents = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Whole calendar days in the period, counting both the first and last day. */
export function periodDays(start: Date, end: Date): number {
  return Math.max(0, differenceInCalendarDays(startOfDay(end), startOfDay(start)) + 1);
}

/**
 * The fraction of a year the period covers, summed per calendar year. A full
 * calendar year is exactly 1, regardless of leap years.
 */
export function yearFraction(start: Date, end: Date): number {
  if (differenceInCalendarDays(startOfDay(end), startOfDay(start)) < 0) return 0;

  let fraction = 0;
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    const yearEnd = startOfDay(endOfYear(cursor));
    const segmentEnd = yearEnd.getTime() < last.getTime() ? yearEnd : last;
    const daysInSegment = differenceInCalendarDays(segmentEnd, cursor) + 1;
    const daysInYear = differenceInCalendarDays(startOfDay(endOfYear(cursor)), startOfYear(cursor)) + 1;
    fraction += daysInSegment / daysInYear;
    cursor = startOfDay(new Date(cursor.getFullYear() + 1, 0, 1));
  }
  return fraction;
}

export function calculateGrossPay(input: GrossPayInput): number {
  const rate = Number(input.rate);
  if (!Number.isFinite(rate) || rate <= 0) return 0;

  if (input.payType === 'hourly') {
    const hours = Number.isFinite(input.hoursWorked) ? Math.max(0, input.hoursWorked) : 0;
    return toCents(hours * rate);
  }

  // Salaried (and any worker with no explicit pay type, as before): annual
  // salary for exactly the selected period. No period yet means nothing to pay.
  if (!input.periodStart || !input.periodEnd) return 0;
  return toCents(rate * yearFraction(input.periodStart, input.periodEnd));
}
