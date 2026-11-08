/**
 * Adjustable payroll deductions (pure; see tests/payroll-deductions.test.ts).
 *
 * Deductions are an ESTIMATE of tax, EI, CPP and benefits as a flat percentage of
 * gross pay. The workspace default is 20% and an administrator can change it;
 * a single run can also override it before submitting.
 */

export const DEFAULT_DEDUCTION_RATE_PERCENT = 20;
export const MAX_DEDUCTION_RATE_PERCENT = 100;

/** Percent in, safe percent out: blank/garbage -> default, clamped to 0-100, 2 decimals. */
export function normalizeDeductionPercent(value: unknown): number {
  const number = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(number)) {
    return DEFAULT_DEDUCTION_RATE_PERCENT;
  }
  return Math.min(MAX_DEDUCTION_RATE_PERCENT, Math.max(0, Math.round(number * 100) / 100));
}

/** True when the text is a usable percentage (for form validation). */
export function isValidDeductionPercent(value: unknown): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const number = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(number) && number >= 0 && number <= MAX_DEDUCTION_RATE_PERCENT;
}

const toCents = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export interface Deductions {
  deductions: number;
  netPay: number;
}

/** Estimated deductions and net pay for one worker at the chosen percentage. */
export function calculateDeductions(grossPay: number, ratePercent: number): Deductions {
  const gross = Number.isFinite(grossPay) ? Math.max(0, grossPay) : 0;
  const deductions = toCents((gross * normalizeDeductionPercent(ratePercent)) / 100);
  return { deductions, netPay: toCents(gross - deductions) };
}
