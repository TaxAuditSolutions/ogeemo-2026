/**
 * Builds the balance sheet from loaded records (pure; see tests/balance-sheet-inputs.test.ts).
 *
 * The Financial Snapshot and the Loan Application both call this with the same records, so the
 * two can never show different numbers. It also returns the notes a reader needs to trust the
 * sheet: how much cash could not be tied to an account, and how many stock items have no cost.
 */
import { assetBalance } from '@/lib/cca';
import { summarizeCash, type CashAccount, type CashEntry } from '@/lib/cash-balance';
import { valueInventory, type InventoryLike } from '@/lib/inventory-value';
import { invoiceBalance } from '@/lib/invoice-status';
import { buildBalanceSheet, type BalanceSheet, type LoanType } from '@/lib/loans';
import { sumCents } from '@/lib/ledger-totals';

export interface BalanceSheetRecords {
  accounts: readonly CashAccount[];
  income: readonly CashEntry[];
  expenses: readonly CashEntry[];
  inventory: readonly InventoryLike[];
  invoices: readonly { originalAmount: number; amountPaid: number; status?: string }[];
  bills: readonly { totalAmount: number }[];
  assets: readonly { undepreciatedCapitalCost?: number; depreciationEntries?: readonly { date: string; amount: number }[] }[];
  loans: readonly { loanType: LoanType; outstandingBalance: number }[];
  remittances: readonly { status: string; amount: number }[];
  equity: readonly { type: 'contribution' | 'draw'; amount: number }[];
}

export interface BalanceSheetNotes {
  /** Net cash on entries that named no registry account (not in the sheet's cash line). */
  unassignedCashNet: number;
  unassignedCashCount: number;
  accountsWithoutOpeningBalance: number;
  uncostedInventoryItems: number;
  negativeStockItems: number;
}

export interface FullBalanceSheet extends BalanceSheet {
  accountsReceivable: number;
  capitalAssets: number;
  accountsPayable: number;
  payrollLiabilities: number;
  notes: BalanceSheetNotes;
}

export function buildFullBalanceSheet(records: BalanceSheetRecords): FullBalanceSheet {
  const cash = summarizeCash(records.accounts, records.income, records.expenses);
  const stock = valueInventory(records.inventory);
  const accountsReceivable = sumCents(
    records.invoices.filter((inv) => inv.status !== 'draft').map((inv) => invoiceBalance(inv.originalAmount, inv.amountPaid))
  );
  const capitalAssets = sumCents(records.assets.map((asset) => assetBalance(asset)));
  const accountsPayable = sumCents(records.bills.map((bill) => bill.totalAmount));
  const payrollLiabilities = sumCents(records.remittances.filter((r) => r.status === 'Due').map((r) => r.amount));

  const sheet = buildBalanceSheet({
    cash: cash.totalCash,
    pettyCash: cash.pettyCash,
    inventory: stock.value,
    creditCards: cash.creditCardOwing,
    accountsReceivable,
    capitalAssets,
    loans: records.loans,
    accountsPayable,
    payrollLiabilities,
    equity: records.equity,
  });

  return {
    ...sheet,
    accountsReceivable,
    capitalAssets,
    accountsPayable,
    payrollLiabilities,
    notes: {
      unassignedCashNet: cash.unassigned.net,
      unassignedCashCount: cash.unassigned.count,
      accountsWithoutOpeningBalance: cash.accounts.filter((b) => b.account.type !== 'Credit Card' && b.account.openingBalance === undefined).length,
      uncostedInventoryItems: stock.uncostedItems,
      negativeStockItems: stock.negativeStockItems,
    },
  };
}
