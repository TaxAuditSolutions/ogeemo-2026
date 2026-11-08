/**
 * Payroll run report and pay stub figures (pure; see tests/payroll-history.test.ts).
 */
import { roundCents } from '@/lib/document-totals';
import { money, type RunDetailLike, type RunLike } from '@/lib/payroll-history';

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A payroll run as CSV: one row per worker and a totals row, amounts to the cent. */
export function buildPayrollRunCsv(run: RunLike, details: readonly RunDetailLike[]): string {
  const rows: (string | number)[][] = [['Employee', 'Pay period start', 'Pay period end', 'Pay date', 'Gross pay', 'Deductions', 'Net pay']];
  let gross = 0;
  let deductions = 0;
  let net = 0;
  for (const detail of details) {
    gross += money(detail.grossPay);
    deductions += money(detail.deductions);
    net += money(detail.netPay);
    rows.push([detail.employeeName, run.periodStart, run.periodEnd, run.payDate, money(detail.grossPay).toFixed(2), money(detail.deductions).toFixed(2), money(detail.netPay).toFixed(2)]);
  }
  rows.push(['Total', run.periodStart, run.periodEnd, run.payDate, roundCents(gross).toFixed(2), roundCents(deductions).toFixed(2), roundCents(net).toFixed(2)]);
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Deductions as the percentage of gross they were estimated at, or null when there was no gross. */
export function deductionPercent(gross: number, deductions: number): number | null {
  if (!Number.isFinite(gross) || gross <= 0) return null;
  return Math.round((deductions / gross) * 10000) / 100;
}

/** One line from address parts, skipping blanks: "12 Main St, Barrie, ON, L4M 1A1". */
export function formatAddress(parts: readonly (string | null | undefined)[]): string {
  return parts.map((part) => (part ?? '').trim()).filter(Boolean).join(', ');
}