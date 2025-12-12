
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  getPayableBills,
  addPayableBill,
  updatePayableBill,
  deletePayableBill,
  type PayableBill,
  getCompanies,
  addCompany,
  type Company,
  getExpenseCategories,
  addExpenseCategory,
  type ExpenseCategory,
  addExpenseTransaction,
} from '@/services/accounting-service';
import { format } from 'date-fns';
import { LoaderCircle } from 'lucide-react';
import { AccountingPageHeader } from './page-header';
import { AccountsPayableView } from './accounts-payable-view';

export function AccountsPayablePageView() {
  const [payableLedger, setPayableLedger] = useState<PayableBill[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [payables, fetchedCompanies, fetchedExpenseCategories] =
        await Promise.all([
          getPayableBills(user.uid),
          getCompanies(user.uid),
          getExpenseCategories(user.uid),
        ]);
      setPayableLedger(payables);
      setCompanies(fetchedCompanies);
      setExpenseCategories(fetchedExpenseCategories);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordPayment = async (bill: PayableBill) => {
    if (!user) return;
    try {
        const expenseCategory = expenseCategories.find(c => c.name === bill.category);
        const newExpense = {
            date: format(new Date(), 'yyyy-MM-dd'),
            company: bill.vendor,
            description: bill.description || `Payment for Invoice #${bill.invoiceNumber}`,
            totalAmount: bill.totalAmount,
            preTaxAmount: bill.preTaxAmount,
            taxAmount: bill.taxAmount,
            taxRate: bill.taxRate,
            category: expenseCategory?.categoryNumber || bill.category,
            explanation: `Paid bill from A/P on ${format(new Date(), 'PP')}`,
            documentNumber: bill.invoiceNumber,
            documentUrl: bill.documentUrl,
            type: 'business' as 'business' | 'personal',
            userId: user.uid,
        };
        
        await addExpenseTransaction(newExpense);
        await deletePayableBill(bill.id);

        setPayableLedger(prev => prev.filter(b => b.id !== bill.id));

        toast({ title: "Payment Recorded", description: `Bill from ${bill.vendor} marked as paid and moved to expenses.` });
    } catch (error: any) {
        console.error("Failed to record payment:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not record payment.' });
        throw error;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Accounts Payable" />
        <AccountsPayableView
            payableLedger={payableLedger}
            isLoading={isLoading}
            onRecordPayment={handleRecordPayment}
            companies={companies}
            expenseCategories={expenseCategories}
            onCompaniesChange={setCompanies}
            onExpenseCategoriesChange={setExpenseCategories}
            onPayableLedgerChange={setPayableLedger}
        />
    </div>
  );
}
