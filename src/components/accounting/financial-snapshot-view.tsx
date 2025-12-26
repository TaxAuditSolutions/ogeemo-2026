
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
  type IncomeTransaction,
  type ExpenseTransaction,
  type Invoice,
  type PayableBill,
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
        ] = await Promise.all([
          getIncomeTransactions(user.uid),
          getExpenseTransactions(user.uid),
          getInvoices(user.uid),
          getPayableBills(user.uid),
        ]);
        setIncome(incomeData);
        setExpenses(expenseData);
        setInvoices(invoiceData);
        setPayableBills(payableData);
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

    const accountsPayable = payableBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    return { totalIncome, totalExpenses, netIncome, accountsReceivable, accountsPayable };
  }, [income, expenses, invoices, payableBills]);


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
          </div>
        </div>
      </div>
      <MatchbookLoanSummaryDialog
        isOpen={isSummaryDialogOpen}
        onOpenChange={setIsSummaryDialogOpen}
        metrics={{ netIncome: 0, totalAssets: 0, totalLiabilities: 0, netEquity: 0}}
      />
    </>
  );
}
