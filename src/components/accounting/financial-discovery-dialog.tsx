'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    X, 
    TrendingUp, 
    TrendingDown, 
    FileDigit, 
    Landmark, 
    WalletCards, 
    LoaderCircle,
    ArrowRight,
    SearchX
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
    getInvoices, 
    getIncomeTransactions, 
    getExpenseTransactions, 
    getPayableBills, 
    getAssets, 
    getLoans,
    type Invoice,
    type IncomeTransaction,
    type ExpenseTransaction,
    type PayableBill,
    type Asset,
    type Loan
} from '@/services/accounting-service';
import { cn } from '@/lib/utils';

interface FinancialDiscoveryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

type FinancialResult = 
    | ({ resultType: 'Invoice' } & Invoice)
    | ({ resultType: 'Income' } & IncomeTransaction)
    | ({ resultType: 'Expense' } & ExpenseTransaction)
    | ({ resultType: 'Payable' } & PayableBill)
    | ({ resultType: 'Asset' } & Asset)
    | ({ resultType: 'Loan' } & Loan);

const ResultIcon = ({ type }: { type: FinancialResult['resultType'] }) => {
    switch (type) {
        case 'Invoice': return <FileDigit className="h-4 w-4 text-blue-500" />;
        case 'Income': return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'Expense': return <TrendingDown className="h-4 w-4 text-red-500" />;
        case 'Payable': return <TrendingDown className="h-4 w-4 text-orange-500" />;
        case 'Asset': return <WalletCards className="h-4 w-4 text-primary" />;
        case 'Loan': return <Landmark className="h-4 w-4 text-muted-foreground" />;
        default: return <Search className="h-4 w-4" />;
    }
};

export function FinancialDiscoveryDialog({ isOpen, onOpenChange }: FinancialDiscoveryDialogProps) {
    const [query, setQuery] = useState('');
    const [data, setData] = useState<FinancialResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const loadData = React.useCallback(async () => {
        if (!user || !isOpen) return;
        setIsLoading(true);
        try {
            const [invoices, income, expenses, payables, assets, loans] = await Promise.all([
                getInvoices(user.uid),
                getIncomeTransactions(user.uid),
                getExpenseTransactions(user.uid),
                getPayableBills(user.uid),
                getAssets(user.uid),
                getLoans(user.uid),
            ]);

            const combined: FinancialResult[] = [
                ...invoices.map(item => ({ ...item, resultType: 'Invoice' as const })),
                ...income.map(item => ({ ...item, resultType: 'Income' as const })),
                ...expenses.map(item => ({ ...item, resultType: 'Expense' as const })),
                ...payables.map(item => ({ ...item, resultType: 'Payable' as const })),
                ...assets.map(item => ({ ...item, resultType: 'Asset' as const })),
                ...loans.map(item => ({ ...item, resultType: 'Loan' as const })),
            ];
            setData(combined);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Search Load Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, isOpen, toast]);

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen, loadData]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const term = query.toLowerCase().trim();
        const keywords = term.split(/\s+/).filter(Boolean);

        return data.filter(item => {
            let searchableText = '';
            if (item.resultType === 'Invoice') {
                searchableText = `${item.invoiceNumber} ${item.companyName} ${item.originalAmount} ${item.amountPaid} ${item.notes || ''} ${item.businessNumber || ''}`;
            } else if (item.resultType === 'Income' || item.resultType === 'Expense') {
                const catNum = item.resultType === 'Income' ? (item as IncomeTransaction).incomeCategory : (item as ExpenseTransaction).category;
                searchableText = `${item.company} ${item.description} ${item.totalAmount} ${item.explanation || ''} ${item.documentNumber || ''} ${catNum}`;
            } else if (item.resultType === 'Payable') {
                searchableText = `${item.vendor} ${item.description} ${item.totalAmount} ${item.invoiceNumber || ''} ${item.category}`;
            } else if (item.resultType === 'Asset') {
                searchableText = `${item.name} ${item.assetClass || ''} ${item.cost} ${item.undepreciatedCapitalCost} ${item.description || ''}`;
            } else if (item.resultType === 'Loan') {
                searchableText = `${item.counterparty} ${item.originalAmount} ${item.outstandingBalance} ${item.loanType}`;
            }
            return keywords.every(k => searchableText.toLowerCase().includes(k));
        }).slice(0, 50);
    }, [query, data]);

    const handleResultClick = (item: FinancialResult) => {
        let path = '';
        if (item.resultType === 'Invoice') {
            path = `/accounting/invoicing-report?highlight=${item.id}`;
        } else if (item.resultType === 'Income') {
            path = `/accounting/ledgers?tab=income&highlight=${item.id}`;
        } else if (item.resultType === 'Expense') {
            path = `/accounting/ledgers?tab=expenses&highlight=${item.id}`;
        } else if (item.resultType === 'Payable') {
            path = `/accounting/accounts-payable?highlight=${item.id}`;
        } else if (item.resultType === 'Asset') {
            path = `/accounting/asset-management?highlight=${item.id}`;
        } else if (item.resultType === 'Loan') {
            path = `/accounting/loan-manager?highlight=${item.id}`;
        }

        if (path) {
            router.push(path);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Search className="h-5 w-5" />
                        <DialogTitle className="text-xl font-headline">Financial Discovery</DialogTitle>
                    </div>
                    <DialogDescription>
                        Audit scoped search across ledgers, invoices, and assets.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-4 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search names, amounts, or reference numbers..."
                            className="pl-10 h-12 text-lg focus-visible:ring-primary"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {query && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={() => setQuery('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <ScrollArea className="flex-1 px-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Indexing financial data...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-2 pb-6">
                            {results.map((item, i) => {
                                let title = '';
                                let subtitle = '';
                                let amount = 0;

                                if (item.resultType === 'Invoice') {
                                    title = `Invoice #${item.invoiceNumber}`;
                                    subtitle = item.companyName;
                                    amount = item.originalAmount;
                                } else if (item.resultType === 'Income' || item.resultType === 'Expense') {
                                    title = item.company;
                                    subtitle = item.description;
                                    amount = item.totalAmount;
                                } else if (item.resultType === 'Payable') {
                                    title = item.vendor;
                                    subtitle = item.description;
                                    amount = item.totalAmount;
                                } else if (item.resultType === 'Asset') {
                                    title = item.name;
                                    subtitle = item.assetClass ? `Class ${item.assetClass}` : 'Capital Asset';
                                    amount = item.undepreciatedCapitalCost;
                                } else if (item.resultType === 'Loan') {
                                    title = item.counterparty;
                                    subtitle = item.loanType === 'payable' ? 'Loan Payable' : 'Loan Receivable';
                                    amount = item.outstandingBalance;
                                }

                                return (
                                    <div 
                                        key={`${item.resultType}-${item.id}-${i}`}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors group"
                                        onClick={() => handleResultClick(item)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 bg-muted rounded-md group-hover:bg-background">
                                                <ResultIcon type={item.resultType} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm truncate">{title}</span>
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase tracking-tighter font-bold">
                                                        {item.resultType}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4 shrink-0">
                                            <p className="font-mono text-sm font-bold">${amount.toFixed(2)}</p>
                                            <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : query.trim() ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                            <SearchX className="h-10 w-10 text-muted-foreground opacity-20" />
                            <p className="text-sm font-medium">No matches found</p>
                            <p className="text-xs text-muted-foreground">Try searching for a different name or amount.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-2 opacity-40">
                            <Landmark className="h-12 w-12" />
                            <p className="text-sm font-medium">Audit Discovery Mode</p>
                            <p className="text-xs">Search for any financial record by name, amount, or reference.</p>
                        </div>
                    )}
                </ScrollArea>
                <div className="p-4 border-t bg-muted/30 text-center shrink-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        Scoped To: Financial Records & Ledgers Only
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}