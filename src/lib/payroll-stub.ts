/**
 * Pay stub figures (pure; see tests/payroll-stub.test.ts).
 *
 * A stub shows what the saved run recorded for the worker, plus the year to date from the runs that
 * were really saved. Nothing is invented: deductions are one estimate at the percentage the run used
 * (tax, EI, CPP and benefits are not split because the run never calculated them separately), and the
 * company and employee addresses come from the workspace and the contact, blank when there is none.
 */
import { formatAddress, deductionPercent } from '@/lib/payroll-report';
import { yearToDate, money, type RunDetailLike, type RunLike } from '@/lib/payroll-history';

export interface PayStubData {
  runId: string;
  employeeName: string;
  /** Day keys, YYYY-MM-DD. */
  payPeriod: { from: string; to: string };
  payDate: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  /** The percentage of gross the deductions were estimated at, when the run recorded it or it can be worked out. */
  deductionRatePercent: number | null;
  ytd: { grossPay: number; deductions: number; netPay: number; runs: number };
  employeeAddress: string;
  companyName: string;
  companyAddress: string;
}

export interface StubAddressSource {
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
  homeAddress?: { street?: string; city?: string; provinceState?: string; postalCode?: string; country?: string };
}

/** The contact's address on one line: the home address when it has any part, else the plain address fields. */
export function workerAddressLine(worker: StubAddressSource | undefined): string {
  if (!worker) return '';
  const home = worker.homeAddress;
  const homeLine = formatAddress([home?.street, home?.city, home?.provinceState, home?.postalCode, home?.country]);
  if (homeLine) return homeLine;
  return formatAddress([worker.streetAddress, worker.city, worker.provinceState, worker.postalCode, worker.country]);
}

export interface RunForStub extends RunLike {
  deductionRatePercent?: number;
  details: readonly RunDetailLike[];
}

export function buildPayStub(
  allRuns: readonly RunForStub[],
  run: RunForStub,
  detail: RunDetailLike,
  company: { name?: string; address?: string },
  employeeAddress: string
): PayStubData {
  const gross = money(detail.grossPay);
  const deductions = money(detail.deductions);
  const ytd = yearToDate(allRuns, run, { employeeId: detail.employeeId, employeeName: detail.employeeName });
  return {
    runId: run.id,
    employeeName: detail.employeeName,
    payPeriod: { from: run.periodStart, to: run.periodEnd },
    payDate: run.payDate,
    grossPay: gross,
    deductions,
    netPay: money(detail.netPay),
    deductionRatePercent: run.deductionRatePercent ?? deductionPercent(gross, deductions),
    ytd,
    employeeAddress,
    companyName: (company.name ?? '').trim(),
    companyAddress: (company.address ?? '').trim(),
  };
}

/** Reads stub data back from session storage, or null when it is missing or not a stub. */
export function parsePayStub(raw: string | null): PayStubData | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const ok =
      value && typeof value.employeeName === 'string' && typeof value.payDate === 'string' &&
      typeof value.grossPay === 'number' && typeof value.netPay === 'number' &&
      value.payPeriod && typeof value.payPeriod.from === 'string' && value.ytd && typeof value.ytd.grossPay === 'number';
    return ok ? (value as PayStubData) : null;
  } catch {
    return null;
  }
}
