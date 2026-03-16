'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { 
    Upload, 
    CheckCircle2, 
    AlertCircle, 
    LoaderCircle, 
    GitMerge, 
    Landmark, 
    ArrowRight,
    ShieldCheck,
    XCircle,
    Info,
    PlusCircle,
    FileSpreadsheet,
    Clock,
    FileDigit,
    Search,
    X,
    TrendingUp,
    TrendingDown,
    Save,
    ChevronsUpDown,
    Check,
    Plus,
    BookOpen,
    Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    reconcileLedgerEntry,
    reconcileInvoicePayment,
    reconcileBillPayment,
    addIncomeTransaction,
    addExpenseTransaction,
    type IncomeTransaction, 
    type ExpenseTransaction, 
    type Invoice,
    type PayableBill,
    type Company,
    type IncomeCategory,
    type ExpenseCategory
} from '@/services/accounting-service';
import { format, isValid, differenceInDays, parse } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

interface BankTransaction {
    id: string;
    date: string;
    name: string;
    memo: string;
    amount: number;
    status: 'unreconciled' | 'reconciled';
}

interface ReconciliationWizardProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    incomeLedger: IncomeTransaction[];
    expenseLedger: ExpenseTransaction[];
    invoices: Invoice[];
    payableBills: PayableBill[];
    incomeCategories: IncomeCategory[];
    expenseCategories: ExpenseCategory[];
    companies: Company[];
    onSuccess: () => void;
}

const scrubAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const s = String(val).trim();
    if (!s) return 0;
    const isParens = s.startsWith('(') && s.endsWith(')');
    let clean = s.replace(/[$,()]/g, '');
    let num = parseFloat(clean);
    if (isNaN(num)) return 0;
    const isNegative = isParens || s.startsWith('-') || s.endsWith('-');
    return isNegative ? -Math.abs(num) : num;
};

const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // Standard ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Attempt standard formats
    const formats = ['M/d/yyyy', 'MM/dd/yyyy', 'd/M/yyyy', 'dd/MM/yyyy', 'yyyy/MM/dd', 'MMM d, yyyy'];
    for (const f of formats) {
        try {
            const parsed = parse(dateStr, f, new Date());
            if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
        } catch (e) {}
    }

    const dObj = new Date(dateStr);
    return isValid(dObj) ? format(dObj, 'yyyy-MM-dd') : dateStr;
};

export function ReconciliationWizard({ 
    isOpen, 
    onOpenChange, 
    incomeLedger, 
    expenseLedger,
    invoices,
    payableBills,
    incomeCategories,
    expenseCategories,
    companies,
    onSuccess 
}: ReconciliationWizardProps) {
    const [step, setStep] = useState<'upload' | 'triage'>('upload');
    const [activeTab, setActiveTab] = useState('perfect');
    const [isProcessing, setIsProcessing] = useState(false);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    
    const { toast } = useToast();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const results = useMemo(() => {
        if (bankTransactions.length === 0) return { perfectMatches: [], potentialMatches: [], missing: [], outstanding: [] };

        // Unified Matching Pool: GL + AR + AP
        const allLedger = [
            ...incomeLedger.map(i => ({ ...i, type: 'income' as const, matchType: 'ledger' as const })),
            ...expenseLedger.map(e => ({ ...e, type: 'expense' as const, matchType: 'ledger' as const })),
            ...invoices.map(inv => ({ 
                ...inv, 
                type: 'income' as const, 
                matchType: 'invoice' as const, 
                totalAmount: inv.originalAmount - inv.amountPaid, 
                company: inv.companyName,
                date: format(new Date(inv.invoiceDate), 'yyyy-MM-dd')
            })),
            ...payableBills.map(bill => ({ 
                ...bill, 
                type: 'expense' as const, 
                matchType: 'bill' as const, 
                company: bill.vendor,
                date: bill.dueDate 
            }))
        ];

        const perfectMatches: { bank: BankTransaction; ledger: any }[] = [];
        const potentialMatches: { bank: BankTransaction; ledger: any; reason: string }[] = [];
        const missingFromLedger: BankTransaction[] = [];
        const usedLedgerIds = new Set<string>();

        bankTransactions.forEach(bt => {
            const absBankAmount = Math.abs(bt.amount);
            const normalizedBankDate = normalizeDate(bt.date);

            const perfectMatch = allLedger.find(lt => {
                if (usedLedgerIds.has(lt.id)) return false;
                if ('isReconciled' in lt && lt.isReconciled) return false;
                // Match criteria: Exact Date and Exact Amount
                return lt.date === normalizedBankDate && Math.abs(lt.totalAmount - absBankAmount) < 0.01;
            });

            if (perfectMatch) {
                perfectMatches.push({ bank: bt, ledger: perfectMatch });
                usedLedgerIds.add(perfectMatch.id);
                return;
            }

            const potentialMatch = allLedger.find(lt => {
                if (usedLedgerIds.has(lt.id)) return false;
                if ('isReconciled' in lt && lt.isReconciled) return false;
                if (Math.abs(lt.totalAmount - absBankAmount) > 0.01) return false;
                const dateDiff = Math.abs(differenceInDays(new Date(lt.date), new Date(normalizedBankDate)));
                return dateDiff <= 7;
            });

            if (potentialMatch) {
                potentialMatches.push({ bank: bt, ledger: potentialMatch, reason: 'Date variance match' });
                usedLedgerIds.add(potentialMatch.id);
                return;
            }

            missingFromLedger.push(bt);
        });

        const outstandingLedger = allLedger.filter(lt => (!('isReconciled' in lt) || !lt.isReconciled) && !usedLedgerIds.has(lt.id));

        return { perfectMatches, potentialMatches, missing: missingFromLedger, outstanding: outstandingLedger };
    }, [bankTransactions, incomeLedger, expenseLedger, invoices, payableBills]);

    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) throw new Error("CSV invalid.");

                const newTxns: BankTransaction[] = lines.slice(1).map((line, index) => {
                    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                    return {
                        id: `bank_${Date.now()}_${index}`,
                        date: parts[0] || '',
                        name: parts[2] || 'Unknown',
                        memo: parts[3] || '',
                        amount: scrubAmount(parts[4]),
                        status: 'unreconciled'
                    };
                });
                
                setBankTransactions(newTxns);
                setStep('triage');
                toast({ title: "Statement Ingested", description: `Discovered ${newTxns.length} signals.` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Ingestion Error', description: error.message });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleBulkReconcile = async () => {
        if (!user) return;
        setIsProcessing(true);
        try {
            const allMatches = [...results.perfectMatches, ...results.potentialMatches];
            for (const match of allMatches) {
                if (match.ledger.matchType === 'ledger') {
                    await reconcileLedgerEntry(match.ledger.id, match.ledger.type, match.bank.id);
                } else if (match.ledger.matchType === 'invoice') {
                    await reconcileInvoicePayment(user.uid, match.ledger.id, Math.abs(match.bank.amount), match.bank.date, match.bank.id, 'Bank Account');
                } else if (match.ledger.matchType === 'bill') {
                    await reconcileBillPayment(user.uid, match.ledger.id, match.bank.date, match.bank.id, 'Bank Account');
                }
            }
            toast({ title: 'Sync Complete', description: `${allMatches.length} nodes verified.` });
            onSuccess();
            onOpenChange(false);
            resetWizard();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Process Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOneClickIngest = async (bt: BankTransaction) => {
        if (!user) return;
        setIsProcessing(true);
        try {
            const isIncome = bt.amount > 0;
            const absAmount = Math.abs(bt.amount);
            
            let categoryId = "";
            if (isIncome) {
                const defaultIncome = incomeCategories.find(c => c.categoryNumber === "Part 3A" || c.name.toLowerCase().includes("sales")) || incomeCategories[0];
                categoryId = defaultIncome?.categoryNumber || defaultIncome?.id || "Part 3A";
            } else {
                const defaultExpense = expenseCategories.find(c => c.categoryNumber === "9270" || c.name.toLowerCase().includes("other")) || expenseCategories[0];
                categoryId = defaultExpense?.categoryNumber || defaultExpense?.id || "9270";
            }

            const baseData = {
                date: normalizeDate(bt.date),
                company: bt.name,
                description: `Ingested from bank: ${bt.memo}`,
                totalAmount: absAmount,
                preTaxAmount: absAmount,
                taxAmount: 0,
                taxRate: 0,
                explanation: "Automated one-click ingestion from bank statement ingestion.",
                type: 'business' as const,
                paymentMethod: 'Bank Transfer',
                isReconciled: true,
                bankReferenceId: bt.id,
                userId: user.uid,
            };

            if (isIncome) {
                await addIncomeTransaction({ ...baseData, incomeCategory: categoryId, depositedTo: 'Bank Account' } as any);
            } else {
                await addExpenseTransaction({ ...baseData, category: categoryId, paidFrom: 'Bank Account' } as any);
            }

            setBankTransactions(prev => prev.map(tx => tx.id === bt.id ? { ...tx, status: 'reconciled' } : tx));
            onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Ingestion Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAutoRecon = async () => {
        if (!user || results.missing.length === 0) return;
        setIsProcessing(true);
        
        const itemsToProcess = results.missing.filter(bt => bt.status !== 'reconciled');
        
        if (itemsToProcess.length === 0) {
            toast({ title: "No actions required", description: "All signals in this list are already reconciled." });
            setIsProcessing(false);
            return;
        }

        try {
            let successCount = 0;
            for (const bt of itemsToProcess) {
                const isIncome = bt.amount > 0;
                const absAmount = Math.abs(bt.amount);
                
                let categoryId = "";
                if (isIncome) {
                    const defaultIncome = incomeCategories.find(c => c.categoryNumber === "Part 3A" || c.name.toLowerCase().includes("sales")) || incomeCategories[0];
                    categoryId = defaultIncome?.categoryNumber || defaultIncome?.id || "Part 3A";
                } else {
                    const defaultExpense = expenseCategories.find(c => c.categoryNumber === "9270" || c.name.toLowerCase().includes("other")) || expenseCategories[0];
                    categoryId = defaultExpense?.categoryNumber || defaultExpense?.id || "9270";
                }

                const baseData = {
                    date: normalizeDate(bt.date),
                    company: bt.name,
                    description: `Automated Ingestion: ${bt.memo}`,
                    totalAmount: absAmount,
                    preTaxAmount: absAmount,
                    taxAmount: 0,
                    taxRate: 0,
                    explanation: "Batch Auto Recon orchestration.",
                    type: 'business' as const,
                    paymentMethod: 'Bank Transfer',
                    isReconciled: true,
                    bankReferenceId: bt.id,
                    userId: user.uid,
                };

                if (isIncome) {
                    await addIncomeTransaction({ ...baseData, incomeCategory: categoryId, depositedTo: 'Bank Account' } as any);
                } else {
                    await addExpenseTransaction({ ...baseData, category: categoryId, paidFrom: 'Bank Account' } as any);
                }
                
                successCount++;
                setBankTransactions(prev => prev.map(tx => tx.id === bt.id ? { ...tx, status: 'reconciled' } : tx));
            }

            toast({ title: "Auto Recon Complete", description: `${successCount} signals committed to General Ledger.` });
            onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Auto Recon Partial Failure', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const resetWizard = () => {
        setStep('upload');
        setBankTransactions([]);
        setActiveTab('perfect');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black bg-background">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <GitMerge className="h-8 w-8" />
                        <div>
                            <DialogTitle className="text-3xl font-headline uppercase tracking-tight">Financial Ingestion Hub</DialogTitle>
                            <DialogDescription className="text-base font-medium">GL-First Verification Strategy</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {step === 'upload' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-10">
                            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-primary/20">
                                <Upload className="h-14 w-14" />
                            </div>
                            <div className="text-center space-y-4 max-w-2xl">
                                <h3 className="text-4xl font-bold font-headline tracking-tight text-slate-900 uppercase">Commence Ingestion</h3>
                                <p className="text-muted-foreground text-xl leading-relaxed">
                                    Upload your bank statement to match signals to your BKS General Ledger by Date and Amount.
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-6">
                                <Button size="lg" className="h-20 px-20 text-2xl font-bold shadow-2xl rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                                    {isProcessing ? <LoaderCircle className="mr-3 h-8 w-8 animate-spin" /> : <FileSpreadsheet className="mr-3 h-8 w-8" />}
                                    Select CSV File
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-16">
                                    <Card className="p-6 border-2 rounded-3xl bg-primary/5 border-primary/10 shadow-sm">
                                        <CardHeader>
                                            <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                                            <CardTitle className="text-lg">Automated Parity</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                The engine performs high-fidelity matching across your entire Income and Expense history based strictly on Date and Amount.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="p-6 border-2 rounded-3xl bg-primary/5 border-primary/10 shadow-sm">
                                        <CardHeader>
                                            <PlusCircle className="h-10 w-10 text-primary mb-4" />
                                            <CardTitle className="text-lg">One-Click Ingestion</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Identify missing signals and post them directly to your General Ledger with a single action.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="w-full justify-start h-16 bg-muted/50 rounded-none px-8 border-b shrink-0 gap-2">
                                <TabsTrigger value="perfect" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Verify Matches <Badge className="ml-2 bg-green-500 font-mono">{results.perfectMatches.length + results.potentialMatches.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="missing" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Ingest to Ledger <Badge className="ml-2 bg-amber-500 font-mono">{results.missing.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="outstanding" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Pending Node Registry <Badge className="ml-2 bg-blue-500 font-mono">{results.outstanding.length}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-hidden relative">
                                <TabsContent value="perfect" className="h-full m-0 focus-visible:ring-0">
                                    <ScrollArea className="h-full">
                                        <div className="max-w-6xl mx-auto p-10 space-y-6">
                                            <div className="flex items-center justify-between border-b pb-4">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> Perfect Match Found</h3>
                                                    <p className="text-sm text-muted-foreground">Synchronize signal parity by Date and Amount.</p>
                                                </div>
                                                <Button size="lg" onClick={handleBulkReconcile} disabled={(results.perfectMatches.length + results.potentialMatches.length) === 0 || isProcessing} className="shadow-xl h-12 px-8 font-bold">
                                                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                    Commit All Matches ({results.perfectMatches.length + results.potentialMatches.length})
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {[...results.perfectMatches, ...results.potentialMatches].map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-green-50 rounded-xl text-green-600"><CheckCircle2 className="h-6 w-6" /></div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.ledger.company}</p>
                                                                <p className="text-xs text-muted-foreground italic">Signal Source: {m.bank.date} • {m.bank.name} • Type: {m.ledger.matchType}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-black text-2xl text-slate-900">{formatCurrency(Math.abs(m.bank.amount))}</p>
                                                            <p className="text-[10px] uppercase font-bold text-green-600 tracking-widest mt-1">Verified Node</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                                {results.perfectMatches.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                                        <Search className="h-10 w-10 mb-2" />
                                                        <p className="text-sm font-bold uppercase">No Perfect Matches Found</p>
                                                        <p className="text-xs italic">Check "Missing from Ledger" for potential discrepancies.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="missing" className="h-full m-0 focus-visible:ring-0">
                                    <ScrollArea className="h-full">
                                        <div className="max-w-6xl mx-auto p-10 space-y-6">
                                            <div className="flex items-center justify-between border-b pb-4">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-600" /> Discovered Unrecorded Signals</h3>
                                                    <p className="text-sm text-muted-foreground">External bank transactions that require a Ledger Node for audit-readiness.</p>
                                                </div>
                                                <Button 
                                                    size="lg" 
                                                    variant="secondary"
                                                    className="h-12 px-8 font-bold shadow-xl border-2 border-primary/20"
                                                    onClick={handleAutoRecon}
                                                    disabled={isProcessing || results.missing.filter(m => m.status !== 'reconciled').length === 0}
                                                >
                                                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                                                    Auto Recon All Signals
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {results.missing.map((m, i) => (
                                                    <Card key={i} className={cn("flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm group transition-all", m.status === 'reconciled' ? "border-green-500 bg-green-50/50" : "hover:border-primary")}>
                                                        <div className="flex items-center gap-5">
                                                            <div className={cn("p-3 rounded-xl", m.status === 'reconciled' ? "bg-green-100 text-green-600" : "bg-amber-50 text-amber-600")}>
                                                                {m.status === 'reconciled' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.name}</p>
                                                                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{m.date} • {m.memo}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-10">
                                                            <div className="text-right">
                                                                <p className={cn("font-mono font-black text-2xl", m.amount > 0 ? "text-green-600" : "text-red-600")}>
                                                                    {m.amount > 0 ? '+' : ''}{formatCurrency(m.amount)}
                                                                </p>
                                                                <p className={cn("text-[10px] uppercase font-bold tracking-widest mt-1", m.status === 'reconciled' ? "text-green-600" : "text-amber-600")}>
                                                                    {m.status === 'reconciled' ? "Verified Node" : "Staging Node"}
                                                                </p>
                                                            </div>
                                                            <Button 
                                                                size="lg" 
                                                                className={cn(
                                                                    "h-14 px-8 font-bold shadow-lg transition-all",
                                                                    m.status === 'reconciled' ? "bg-green-600 hover:bg-green-700 text-white border-green-700" : ""
                                                                )} 
                                                                onClick={() => m.status !== 'reconciled' && handleOneClickIngest(m)} 
                                                                disabled={(isProcessing && m.status !== 'reconciled') || m.status === 'reconciled'}
                                                            >
                                                                {m.status === 'reconciled' ? (
                                                                    <>
                                                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                                                        Posted & Reconciled
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {isProcessing ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                                                                        Post & Reconcile
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="outstanding" className="h-full m-0 focus-visible:ring-0">
                                    <ScrollArea className="h-full">
                                        <div className="max-w-6xl mx-auto p-10 space-y-6">
                                            <div className="space-y-1 border-b pb-4">
                                                <h3 className="text-xl font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" /> Pending Ledger Nodes</h3>
                                                <p className="text-sm text-muted-foreground">Internal records awaiting matching signal verification.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.outstanding.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm opacity-80">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Clock className="h-5 w-5" /></div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.company}</p>
                                                                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{m.date} • {m.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-bold text-xl text-slate-400">{formatCurrency(m.totalAmount)}</p>
                                                            <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mt-1">Pending Node</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-6">
                    <div className="hidden sm:flex items-center gap-4">
                        {step === 'triage' && (
                            <Button variant="ghost" size="lg" onClick={resetWizard} className="font-bold text-sm uppercase tracking-widest"><X className="mr-2 h-4 w-4" /> Abandon & Restart</Button>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-12 font-bold text-lg">
                            <BookOpen className="mr-2 h-5 w-5" /> Back to General Ledger
                        </Button>
                        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-12 font-bold text-lg">Close Terminal</Button>
                        {step === 'triage' && (
                            <Button variant="outline" size="lg" asChild className="h-14 px-8 border-2 font-bold shadow-sm bg-white text-primary">
                                <Link href={`/reports/bank-reconciliation?from=${bankTransactions[bankTransactions.length - 1]?.date}&to=${bankTransactions[0]?.date}`}>
                                    <FileDigit className="mr-2 h-5 w-5" /> Final Reconciliation Report
                                </Link>
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
