
'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from '@/services/accounting-service';
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
        ] = await Promise.all([
          getIncomeTransactions(user.uid),
          getExpenseTransactions(user.uid),
          getInvoices(user.uid),
          getPayableBills(user.uid),
          getAssets(user.uid),
          getLoans(user.uid),
          getEquityTransactions(user.uid),
        ]);
        setIncome(incomeData);
        setExpenses(expenseData);
        setInvoices(invoiceData);
        setPayableBills(payableData);
        setAssets(assetsData);
        setLoans(loansData);
        setEquity(equityData);
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
    // Profitability
    const totalIncome = income.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const netIncome = totalIncome - totalExpenses;
    
    // Assets
    const accountsReceivable = invoices.reduce((sum, inv) => {
        const balance = inv.originalAmount - inv.amountPaid;
        return sum + (balance > 0 ? balance : 0);
    }, 0);
    const capitalAssets = assets.reduce((sum, asset) => sum + asset.undepreciatedCapitalCost, 0);
    const loansReceivable = loans.filter(l => l.loanType === 'receivable').reduce((sum, l) => sum + l.outstandingBalance, 0);
    const totalAssets = accountsReceivable + capitalAssets + loansReceivable;

    // Liabilities
    const accountsPayable = payableBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const loansPayable = loans.filter(l => l.loanType === 'payable').reduce((sum, l) => sum + l.outstandingBalance, 0);
    const totalLiabilities = accountsPayable + loansPayable;

    // Equity
    const totalContributions = equity.filter(e => e.type === 'contribution').reduce((sum, e) => sum + e.amount, 0);
    const totalDraws = equity.filter(e => e.type === 'draw').reduce((sum, e) => sum + e.amount, 0);
    const netOwnerEquity = totalContributions - totalDraws; // Simplified view
    
    return { 
        totalIncome, totalExpenses, netIncome, 
        accountsReceivable, capitalAssets, loansReceivable, totalAssets,
        accountsPayable, loansPayable, totalLiabilities,
        netOwnerEquity,
    };
  }, [income, expenses, invoices, payableBills, assets, loans, equity]);


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
                        <BalanceSheetRow label="Total Liabilities" value={formatCurrency(financialMetrics.totalLiabilities)} />
                        <Separator />
                        <BalanceSheetRow label="Owner's Equity" value={formatCurrency(financialMetrics.netOwnerEquity)} />
                        <Separator />
                         <BalanceSheetRow label="Total Liabilities & Equity" value={formatCurrency(financialMetrics.totalLiabilities + financialMetrics.netOwnerEquity)} colorClass="font-bold" />
                    </div>
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
