/**
 * Workspace payroll settings (pure; see tests/payroll-settings.test.ts).
 *
 * Stored on the organization document so everyone in the workspace sees the same
 * pay schedule and deduction rate; only administrators can change them (see
 * firestore.rules). Whatever is stored is cleaned by normalizePayrollSettings,
 * so missing or damaged values fall back to safe defaults.
 */
import {
  PAY_SCHEDULES,
  parseDateKey,
  toDateKey,
  type PaySchedule,
  type PeriodConfig,
} from '@/lib/payroll-periods';
import {
  DEFAULT_DEDUCTION_RATE_PERCENT,
  isValidDeductionPercent,
  normalizeDeductionPercent,
} from '@/lib/payroll-deductions';

export interface PayrollSettings extends PeriodConfig {
  /** Default deduction estimate, as a percentage of gross pay (0-100). */
  deductionRatePercent: number;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  paySchedule: 'bi-weekly',
  periodStartDay: 1,
  biweeklyAnchor: null,
  deductionRatePercent: DEFAULT_DEDUCTION_RATE_PERCENT,
};

/** Cleans whatever was stored (including nothing) into valid settings. */
export function normalizePayrollSettings(raw: unknown): PayrollSettings {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const day = Number(source.periodStartDay);
  const anchor = parseDateKey(source.biweeklyAnchor);
  return {
    paySchedule: PAY_SCHEDULES.includes(source.paySchedule as PaySchedule)
      ? (source.paySchedule as PaySchedule)
      : DEFAULT_PAYROLL_SETTINGS.paySchedule,
    periodStartDay: Number.isInteger(day) && day >= 0 && day <= 6 ? day : DEFAULT_PAYROLL_SETTINGS.periodStartDay,
    biweeklyAnchor: anchor ? toDateKey(anchor) : null,
    deductionRatePercent: normalizeDeductionPercent(source.deductionRatePercent),
  };
}

/** Why settings cannot be saved, or null when they can. */
export function validatePayrollSettings(settings: PayrollSettings): string | null {
  if (!PAY_SCHEDULES.includes(settings.paySchedule)) return 'Choose a pay schedule.';
  if (settings.paySchedule === 'bi-weekly' && !parseDateKey(settings.biweeklyAnchor)) {
    return 'Bi-weekly pay needs the first day of one of your pay periods, so every period lines up.';
  }
  if (!isValidDeductionPercent(settings.deductionRatePercent)) {
    return 'Deductions must be a percentage between 0 and 100.';
  }
  return null;
}

/**
 * True when no pay schedule has been saved yet for this workspace, so the Run
 * Payroll screen can prompt for one instead of silently assuming bi-weekly.
 */
export function needsPayrollSetup(raw: unknown): boolean {
  const source = (raw && typeof raw === 'object' ? raw : null) as Record<string, unknown> | null;
  return !source || !PAY_SCHEDULES.includes(source.paySchedule as PaySchedule);
}
