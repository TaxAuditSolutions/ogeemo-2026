/**
 * Income statement figures, BEFORE sales tax (pure; see tests/income-statement.test.ts).
 *
 * GST/HST collected on sales and paid on purchases is not business income or expense:
 * it is owed to or recoverable from the government. So the statement uses each entry's
 * amount without tax. For the same reason the payment of net sales tax to CRA is left
 * out of expenses (it is the other half of the tax that was left out of income).
 * Entries marked Personal are not business activity and are left out.
 */
import { roundCents } from '@/lib/document-totals';
import { isLedgerDateInRange } from '@/lib/ledger-date';
import { isBusinessEntry } from '@/lib/ledger-totals';

export interface StatementEntry {
  date?: unknown;
  type?: string | null;
  totalAmount?: number | null;
  preTaxAmount?: number | null;
  taxAmount?: number | null;
  incomeCategory?: string;
  category?: string;
  company?: string;
  description?: string;
  isSalesTaxRemittance?: boolean;
}

export interface StatementCategory {
  line: string;
  key: string;
}

export interface IncomeStatementData {
  businessIncome: { sales: number; other: number; gross: number };
  costOfGoodsSold: { purchases: number; total: number };
  netIncomeBeforeExpenses: number;
  expenses: { [key: string]: number };
  totalExpenses: number;
  netProfitOrLoss: number;
  /** Sales tax in the income counted above is left out; these explain what was adjusted. */
  notes: {
    /** Income entries with no tax recorded; they are counted at their full amount. */
    incomeWithoutTaxRecorded: number;
    /** Sales tax payments to CRA left out of expenses, and how much they came to. */
    remittancesExcluded: number;
    remittanceTotal: number;
  };
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The tax inside an entry: the recorded tax, else the gap between total and pre-tax, else none. */
export function taxOf(entry: StatementEntry): number {
  const total = Number(entry.totalAmount) || 0;
  if (finite(entry.taxAmount)) return Math.max(0, entry.taxAmount);
  if (finite(entry.preTaxAmount)) return Math.max(0, roundCents(total - entry.preTaxAmount));
  return 0;
}

/** The entry's amount without tax, to the cent. */
export function netAmountOf(entry: StatementEntry): number {
  return roundCents((Number(entry.totalAmount) || 0) - taxOf(entry));
}

/** True for the entry the Sales Tax page creates when you record paying CRA. */
export function isSalesTaxRemittance(entry: StatementEntry): boolean {
  if (entry.isSalesTaxRemittance === true) return true;
  return /^canada revenue agency$/i.test((entry.company || '').trim()) && /^sales tax remittance/i.test((entry.description || '').trim());
}

/** Income entries that never recorded their tax (payments posted before it was kept). */
function hasNoTaxRecorded(entry: StatementEntry): boolean {
  return !finite(entry.taxAmount) && !finite(entry.preTaxAmount);
}

export function buildIncomeStatement(
  income: readonly StatementEntry[],
  expenses: readonly StatementEntry[],
  period: { from?: Date | null; to?: Date | null },
  config: { salesLine: string; expenseCategories: readonly StatementCategory[] }
): IncomeStatementData {
  const inPeriod = (entry: StatementEntry) => isBusinessEntry(entry) && isLedgerDateInRange(entry.date, period.from, period.to);
  const incomeRows = income.filter(inPeriod);
  const expenseRows = expenses.filter(inPeriod);

  let sales = 0;
  let other = 0;
  let incomeWithoutTaxRecorded = 0;
  for (const entry of incomeRows) {
    const net = netAmountOf(entry);
    if (entry.incomeCategory === config.salesLine || entry.incomeCategory?.startsWith('C-')) sales += net;
    else other += net;
    if (hasNoTaxRecorded(entry)) incomeWithoutTaxRecorded += 1;
  }
  sales = roundCents(sales);
  other = roundCents(other);
  const gross = roundCents(sales + other);

  const totals: { [key: string]: number } = {};
  for (const category of config.expenseCategories) totals[category.key] = 0;
  totals.otherExpenses = 0;

  let remittancesExcluded = 0;
  let remittanceTotal = 0;
  for (const entry of expenseRows) {
    if (isSalesTaxRemittance(entry)) {
      remittancesExcluded += 1;
      remittanceTotal += Number(entry.totalAmount) || 0;
      continue;
    }
    const category = config.expenseCategories.find((c) => c.line === entry.category);
    totals[category ? category.key : 'otherExpenses'] += netAmountOf(entry);
  }
  for (const key of Object.keys(totals)) totals[key] = roundCents(totals[key]);

  const totalExpenses = roundCents(Object.values(totals).reduce((sum, value) => sum + value, 0));
  return {
    businessIncome: { sales, other, gross },
    costOfGoodsSold: { purchases: 0, total: 0 },
    netIncomeBeforeExpenses: gross,
    expenses: totals,
    totalExpenses,
    netProfitOrLoss: roundCents(gross - totalExpenses),
    notes: { incomeWithoutTaxRecorded, remittancesExcluded, remittanceTotal: roundCents(remittanceTotal) },
  };
}
