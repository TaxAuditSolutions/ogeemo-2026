
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getIncomeTransactions, getExpenseTransactions, getAssets, type IncomeTransaction, type ExpenseTransaction, type Asset } from '@/services/accounting-service';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { AccountingPageHeader } from './page-header';
import { IncomeStatementFormDisplay } from './income-statement-form-display';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';

// --- CRA Capital Cost Allowance (CCA) Rates ---
const ccaRateMap: Record<string, number> = {
    "1": 0.04,
    "8": 0.20,
    "10": 0.30,
    "10.1": 0.30,
    "12": 1.00,
    "16": 0.40,
    "43": 0.30,
    "45": 0.45,
    "50": 0.55,
    "53": 0.50,
};


// --- Data Calculation Logic ---
function useIncomeStatementData(income: IncomeTransaction[], expenses: ExpenseTransaction[], assets: Asset[]) {
    
    const standardIncomeCategoryMap = useMemo(() => {
        const map = new Map<string, string>();
        t2125IncomeCategories.forEach(cat => map.set(cat.line, cat.description));
        return map;
    }, []);

    const standardExpenseCategoryMap = useMemo(() => {
        const map = new Map<string, string>();
        t2125ExpenseCategories.forEach(cat => map.set(cat.line, cat.description));
        return map;
    }, []);

    const categorizedIncome = useMemo(() => {
        const result: Record<string, number> = {};
        t2125IncomeCategories.forEach(cat => {
            result[cat.description] = 0;
        });

        income.forEach(tx => {
            const amount = Number(tx.totalAmount) || 0;
            const categoryNumber = tx.incomeCategory;
            const categoryDescription = standardIncomeCategoryMap.get(categoryNumber);

            if (categoryDescription) {
                result[categoryDescription] = (result[categoryDescription] || 0) + amount;
            } else {
                result['Other income'] = (result['Other income'] || 0) + amount;
            }
        });
        
        return result;
    }, [income, standardIncomeCategoryMap]);


    const grossIncome = useMemo(() => Object.values(categorizedIncome).reduce((sum, amount) => sum + amount, 0), [categorizedIncome]);

    const cca = useMemo(() => {
        return assets.reduce((sum, asset) => {
            const ucc = Number(asset.undepreciatedCapitalCost) || 0;
            const rate = ccaRateMap[asset.assetClass || ''] || 0;
            
            if (ucc <= 0 || rate === 0) {
                return sum;
            }

            let assetDepreciation = ucc * rate;

            // Simplified half-year rule: if the flag is set, halve the depreciation.
            // A real implementation would need to track the acquisition year.
            if (asset.applyHalfYearRule) {
                assetDepreciation /= 2;
            }

            return sum + assetDepreciation;
        }, 0);
    }, [assets]);

    const categorizedExpenses = useMemo(() => {
        const result: Record<string, number> = {};
        
        t2125ExpenseCategories.forEach(cat => {
            result[cat.description] = 0;
        });
        
        expenses.forEach(tx => {
            const amount = Number(tx.totalAmount) || 0;
            const categoryNumber = tx.category;
            const categoryDescription = standardExpenseCategoryMap.get(categoryNumber);
            
            if (categoryDescription) {
                 result[categoryDescription] = (result[categoryDescription] || 0) + amount;
            } else {
                 result['Other expenses'] = (result['Other expenses'] || 0) + amount;
            }
        });
        
        result['Capital cost allowance (CCA)'] = cca;
        
        return result;
    }, [expenses, cca, standardExpenseCategoryMap]);
    
    const totalExpenses = useMemo(() => Object.values(categorizedExpenses).reduce((sum, amount) => sum + amount, 0), [categorizedExpenses]);
    const netIncome = grossIncome - totalExpenses;

    return { categorizedIncome, grossIncome, categorizedExpenses, totalExpenses, netIncome };
}


// --- Main View Component ---
export function IncomeStatementView() {
    const [income, setIncome] = useState<IncomeTransaction[]>([]);
    const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [incomeData, expenseData, assetData] = await Promise.all([
                    getIncomeTransactions(user.uid),
                    getExpenseTransactions(user.uid),
                    getAssets(user.uid),
                ]);
                setIncome(incomeData);
                setExpenses(expenseData);
                setAssets(assetData);
            } catch (error: any) {
                toast({ variant: 'destructive', title: "Failed to load ledger data", description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);

    const { categorizedIncome, grossIncome, categorizedExpenses, totalExpenses, netIncome } = useIncomeStatementData(income, expenses, assets);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading Ledger Data...</p>
                </div>
            </div>
        );
    }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Income Statement" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Income Statement
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          This is a snap shot view of your financial status based on current data from the general ledger.
        </p>
      </header>

      <div className="max-w-4xl mx-auto">
        <IncomeStatementFormDisplay 
            categorizedIncome={categorizedIncome}
            grossIncome={grossIncome}
            categorizedExpenses={categorizedExpenses}
            totalExpenses={totalExpenses}
            netIncome={netIncome}
        />
      </div>
    </div>
  );
}
