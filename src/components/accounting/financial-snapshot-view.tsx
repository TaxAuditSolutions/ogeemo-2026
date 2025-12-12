
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  LoaderCircle,
  Landmark,
  Building,
  Wallet,
} from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  getIncomeTransactions,
  getExpenseTransactions,
  getInvoices,
  getPayableBills,
  getEquityTransactions,
  getAssets,
  getLoans,
  type IncomeTransaction,
  type ExpenseTransaction,
  type Invoice,
  type PayableBill,
  type EquityTransaction,
  type Asset,
  type Loan,
} from '@/services/accounting-service';
import { Separator } from '@/components/ui/separator';
import { MatchbookLoanSummaryDialog } from './MatchbookLoanSummaryDialog';

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

export function FinancialSnapshotView() {
  const [income, setIncome] = useState<IncomeTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payableBills, setPayableBills] = useState<PayableBill[]>([]);
  const [equityTransactions, setEquityTransactions] = useState<EquityTransaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
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
          equityData,
          assetData,
          loanData,
        ] = await Promise.all([
          getIncomeTransactions(user.uid),
          getExpenseTransactions(user.uid),
          getInvoices(user.uid),
          getPayableBills(user.uid),
          getEquityTransactions(user.uid),
          getAssets(user.uid),
          getLoans(user.uid),
        ]);
        setIncome(incomeData);
        setExpenses(expenseData);
        setInvoices(invoiceData);
        setPayableBills(payableData);
        setEquityTransactions(equityData);
        setAssets(assetData);
        setLoans(loanData);
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
    const totalIncome = income.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const netIncome = totalIncome - totalExpenses;
    
    const accountsReceivable = invoices.reduce((sum, inv) => {
        const balance = inv.originalAmount - inv.amountPaid;
        return sum + (balance > 0 ? balance : 0);
    }, 0);

    const loansReceivable = loans.filter(l => l.loanType === 'receivable').reduce((sum, l) => sum + l.outstandingBalance, 0);
    const totalCapitalAssets = assets.reduce((sum, asset) => sum + asset.undepreciatedCapitalCost, 0);
    const totalCurrentAssets = accountsReceivable + loansReceivable;
    const totalAssets = totalCurrentAssets + totalCapitalAssets;
    
    const accountsPayable = payableBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const loansPayable = loans.filter(l => l.loanType === 'payable').reduce((sum, l) => sum + l.outstandingBalance, 0);
    const totalLiabilities = accountsPayable + loansPayable;

    const netEquity = equityTransactions.reduce((sum, tx) => sum + (tx.type === 'contribution' ? tx.amount : -tx.amount), 0);

    return { totalIncome, totalExpenses, netIncome, accountsReceivable, loansReceivable, totalAssets, accountsPayable, loansPayable, totalLiabilities, netEquity, totalCapitalAssets };
  }, [income, expenses, invoices, payableBills, equityTransactions, assets, loans]);


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
                      <CardTitle>Balance Sheet Summary</CardTitle>
                      <CardDescription>A snapshot of your company's financial health.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-muted-foreground"/> Assets ({formatCurrency(financialMetrics.totalAssets)})</h3>
                          <VitalsCard 
                              title="Accounts Receivable"
                              value={formatCurrency(financialMetrics.accountsReceivable)}
                              description="Money your clients owe you."
                              icon={TrendingUp}
                          />
                          <VitalsCard 
                              title="Loans Receivable"
                              value={formatCurrency(financialMetrics.loansReceivable)}
                              description="Money you have loaned to others."
                              icon={TrendingUp}
                          />
                           <VitalsCard 
                              title="Total Capital Assets"
                              value={formatCurrency(financialMetrics.totalCapitalAssets)}
                              description="Current value of equipment, vehicles, etc."
                              icon={Building}
                          />
                      </div>
                      <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2"><Landmark className="h-5 w-5 text-muted-foreground"/> Liabilities & Equity ({formatCurrency(financialMetrics.totalLiabilities + financialMetrics.netEquity)})</h3>
                          <VitalsCard 
                              title="Accounts Payable"
                              value={formatCurrency(financialMetrics.accountsPayable)}
                              description="Money you owe to vendors."
                              icon={TrendingDown}
                          />
                           <VitalsCard 
                              title="Loans Payable"
                              value={formatCurrency(financialMetrics.loansPayable)}
                              description="Money you have borrowed."
                              icon={TrendingDown}
                          />
                          <VitalsCard 
                              title="Net Owner's Equity"
                              value={formatCurrency(financialMetrics.netEquity)}
                              description="Owner contributions minus draws."
                              icon={Landmark}
                          />
                      </div>
                  </CardContent>
                  <CardFooter className="pt-4 text-center text-xs text-muted-foreground">
                      <p>Note: This is a simplified summary. Cash, inventory, and other items would be included in a full balance sheet.</p>
                  </CardFooter>
              </Card>

          </div>
        </div>
      </div>
      <MatchbookLoanSummaryDialog
        isOpen={isSummaryDialogOpen}
        onOpenChange={setIsSummaryDialogOpen}
        metrics={financialMetrics}
      />
    </>
  );
}
