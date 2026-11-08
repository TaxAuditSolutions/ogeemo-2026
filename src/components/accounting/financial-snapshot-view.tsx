'use client';

import { useState, useEffect, useMemo } from 'react';
import { buildFullBalanceSheet } from '@/lib/balance-sheet-inputs';
import { BalanceSheetNotesPanel } from '@/components/accounting/balance-sheet-notes';
import { getInventoryItems, type Item } from '@/services/inventory-service';
import { buildIncomeStatement } from '@/lib/income-statement';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  LoaderCircle,
  Landmark,
  Building,
  Wallet,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  getIncomeTransactions,
  getExpenseTransactions,
  getInvoices,
  getPayableBills,
  getAssets,
  getLoans,
  getEquityTransactions,
  type IncomeTransaction,
  type ExpenseTransaction,
  type Invoice,
  type PayableBill,
  type Asset,
  type Loan,
  type EquityTransaction,
  getInternalAccounts,
  type InternalAccount,
} from '@/core/accounting-service';
import { getRemittances, type PayrollRemittance } from '@/services/payroll-service';
import { MatchbookLoanSummaryDialog } from './MatchbookLoanSummaryDialog';
import { Separator } from '../ui/separator';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const VitalsCard = ({ title, value, icon: Icon, description, colorClass }: { title: string; value: string; icon: React.ElementType; description: string; colorClass?: string; }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${colorClass || ''}`}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const BalanceSheetRow = ({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) => (
    <div className="flex justify-between items-center text-sm py-1">
        <p className="text-muted-foreground">{label}</p>
        <p className={`font-mono ${colorClass || ''}`}>{value}</p>
    </div>
);


export function FinancialSnapshotView() {
  const [income, setIncome] = useState<IncomeTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payableBills, setPayableBills] = useState<PayableBill[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [equity, setEquity] = useState<EquityTransaction[]>([]);
  const [remittances, setRemittances] = useState<PayrollRemittance[]>([]);
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [stock, setStock] = useState<Item[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('summary') === 'matchbook') {
      setIsSummaryDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [
          incomeData,
          expenseData,
          invoiceData,
          payableData,
          assetsData,
          loansData,
          equityData,
          remittanceData,
          accountData,
          stockData
        ] = await Promise.all([
          getIncomeTransactions(user.uid),
          getExpenseTransactions(user.uid),
          getInvoices(user.uid),
          getPayableBills(user.uid),
          getAssets(user.uid),
          getLoans(user.uid),
          getEquityTransactions(user.uid),
          getRemittances(user.uid),
          getInternalAccounts(user.uid),
          // Inventory is optional: a workspace that does not use it still gets a sheet.
          getInventoryItems(user.uid).catch(() => [] as Item[])
        ]);
        setIncome(incomeData);
        setExpenses(expenseData);
        setInvoices(invoiceData);
        setPayableBills(payableData);
        setAssets(assetsData);
        setLoans(loansData);
        setEquity(equityData);
        setRemittances(remittanceData);
        setAccounts(accountData);
        setStock(stockData);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to load financial data',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, toast]);
  
  const financialMetrics = useMemo(() => {
    // Profitability for THIS calendar year to date, before sales tax, business entries only; the same figures
    // as the Income Statement (see lib/income-statement).
    const yearStatement = buildIncomeStatement(income, expenses, { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }, {
      salesLine: t2125IncomeCategories.find(c => c.key === 'sales')?.line ?? '',
      expenseCategories: t2125ExpenseCategories,
    });

    // One tested balance sheet shared with the loan application (see lib/balance-sheet-inputs): cash, petty
    // cash and inventory are assets, credit cards owing are a liability, and owner's equity is what is left.
    const sheet = buildFullBalanceSheet({ accounts, income, expenses, inventory: stock, invoices, bills: payableBills, assets, loans, remittances, equity });

    return {
        totalIncome: yearStatement.businessIncome.gross,
        totalExpenses: yearStatement.totalExpenses,
        netIncome: yearStatement.netProfitOrLoss,
        ...sheet,
        netOwnerEquity: sheet.netWorth,
    };
  }, [income, expenses, invoices, payableBills, assets, loans, equity, remittances, accounts, stock]);


  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Financial Snapshot...</p>
            </div>
        </div>
    )
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Financial Snapshot" showLoanManagerButton={true} />
        <div className="flex flex-col items-center">
          <header className="text-center mb-6 max-w-4xl">
            <h1 className="text-3xl font-bold font-headline text-primary">
              Financial Snapshot
            </h1>
            <p className="text-muted-foreground">
              Your key financial numbers, at a glance.
            </p>
          </header>
          <div className="w-full max-w-5xl space-y-8">
              <Card>
                  <CardHeader>
                      <CardTitle>Profitability (YTD)</CardTitle>
                      <CardDescription>A summary of your income and expenses for the year so far.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                       <VitalsCard 
                          title="Total Income"
                          value={formatCurrency(financialMetrics.totalIncome)}
                          description="All revenue generated."
                          icon={TrendingUp}
                          colorClass="text-green-600"
                      />
                       <VitalsCard 
                          title="Total Expenses"
                          value={formatCurrency(financialMetrics.totalExpenses)}
                          description="All costs incurred."
                          icon={TrendingDown}
                          colorClass="text-red-600"
                      />
                      <VitalsCard 
                          title="Net Income"
                          value={formatCurrency(financialMetrics.netIncome)}
                          description="Income minus expenses."
                          icon={DollarSign}
                          colorClass={financialMetrics.netIncome >= 0 ? "text-primary" : "text-destructive"}
                      />
                  </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle>Financial Position (Balance Sheet)</CardTitle>
                    <CardDescription>A snapshot of what your business owns and what it owes.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/> Assets</h3>
                        <Separator />
                        <BalanceSheetRow label="Cash in Bank Accounts" value={formatCurrency(financialMetrics.cash)} />
                        <BalanceSheetRow label="Petty Cash Box" value={formatCurrency(financialMetrics.pettyCash)} />
                        <BalanceSheetRow label="Inventory (at cost)" value={formatCurrency(financialMetrics.inventory)} />
                        <BalanceSheetRow label="Accounts Receivable" value={formatCurrency(financialMetrics.accountsReceivable)} />
                        <BalanceSheetRow label="Capital Assets (UCC)" value={formatCurrency(financialMetrics.capitalAssets)} />
                        <BalanceSheetRow label="Loans Receivable" value={formatCurrency(financialMetrics.loansReceivable)} />
                        <Separator />
                        <BalanceSheetRow label="Total Assets" value={formatCurrency(financialMetrics.totalAssets)} colorClass="font-bold" />
                    </div>
                     <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2"><Coins className="h-5 w-5 text-primary"/> Liabilities & Equity</h3>
                        <Separator />
                        <BalanceSheetRow label="Accounts Payable" value={formatCurrency(financialMetrics.accountsPayable)} />
                        <BalanceSheetRow label="Loans Payable" value={formatCurrency(financialMetrics.loansPayable)} />
                        <BalanceSheetRow label="Credit Cards Owing" value={formatCurrency(financialMetrics.creditCards)} />
                        <BalanceSheetRow label="Payroll Remittances Due" value={formatCurrency(financialMetrics.payrollLiabilities)} colorClass="text-destructive" />
                        <BalanceSheetRow label="Total Liabilities" value={formatCurrency(financialMetrics.totalLiabilities)} />
                        <Separator />
                        <BalanceSheetRow label="Owner's Equity (assets less liabilities)" value={formatCurrency(financialMetrics.netOwnerEquity)} />
                        <Separator />
                         <BalanceSheetRow label="Total Liabilities & Equity" value={formatCurrency(financialMetrics.totalAssets)} colorClass="font-bold" />
                    </div>
                    <BalanceSheetNotesPanel notes={financialMetrics.notes} />
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
      <MatchbookLoanSummaryDialog
        isOpen={isSummaryDialogOpen}
        onOpenChange={setIsSummaryDialogOpen}
        metrics={{ 
            netIncome: financialMetrics.netIncome,
            totalAssets: financialMetrics.totalAssets,
            totalLiabilities: financialMetrics.totalLiabilities,
            netEquity: financialMetrics.netOwnerEquity,
        }}
      />
    </>
  );
}
