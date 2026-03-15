
'use client';

import React, { useState, useMemo, useRef } from 'react';
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
    CardFooter,
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
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    reconcileLedgerEntry,
    type IncomeTransaction, 
    type ExpenseTransaction, 
    type Company,
    type IncomeCategory,
    type ExpenseCategory
} from '@/services/accounting-service';
import { format, parseISO, isValid, startOfDay, endOfDay, differenceInDays } from 'date-fns';
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
}

interface ReconciliationWizardProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    incomeLedger: IncomeTransaction[];
    expenseLedger: ExpenseTransaction[];
    incomeCategories: IncomeCategory[];
    expenseCategories: ExpenseCategory[];
    companies: Company[];
    onSuccess: () => void;
}

/**
 * Robustly parses an amount string from a bank CSV.
 * Handles: -$2,400.00, (2,400.00), 2400.00
 */
const scrubAmount = (val: string): number => {
    if (!val) return 0;
    // Handle accounting parenthetical negatives
    let isNegative = val.includes('(') && val.includes(')');
    // Handle leading/trailing minus signs
    if (val.trim().startsWith('-') || val.trim().endsWith('-')) isNegative = true;
    
    const clean = val.replace(/[^-0-9.]/g, '');
    const num = parseFloat(clean);
    return isNegative ? -Math.abs(num) : num;
};

/**
 * Normalizes disparate bank date formats to Ogeemo standard YYYY-MM-DD.
 */
const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        // Handle MM/DD/YYYY or DD/MM/YYYY
        // We'll try to parse it via JS Date which is locale-aware
        const parsed = new Date(dateStr);
        if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
    }
    return dateStr;
};

export function ReconciliationWizard({ 
    isOpen, 
    onOpenChange, 
    incomeLedger, 
    expenseLedger,
    onSuccess 
}: ReconciliationWizardProps) {
    const [step, setStep] = useState<'upload' | 'triage'>('upload');
    const [activeTab, setActiveTab] = useState('perfect');
    const [isProcessing, setIsProcessing] = useState(false);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const { toast } = useToast();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Matching Results Logic
    const results = useMemo(() => {
        if (bankTransactions.length === 0) return { perfectMatches: [], potentialMatches: [], missing: [], outstanding: [] };

        const allLedger = [
            ...incomeLedger.map(i => ({ ...i, type: 'income' as const })),
            ...expenseLedger.map(e => ({ ...e, type: 'expense' as const }))
        ];

        const perfectMatches: { bank: BankTransaction; ledger: any }[] = [];
        const potentialMatches: { bank: BankTransaction; ledger: any; reason: string }[] = [];
        const missingFromLedger: BankTransaction[] = [];
        const usedLedgerIds = new Set<string>();

        bankTransactions.forEach(bt => {
            const normalizedBankDate = normalizeDate(bt.date);
            const bankAmount = scrubAmount(String(bt.amount));
            const absBankAmount = Math.abs(bankAmount);

            // 1. Perfect Match (Exact Date & Amount)
            const perfectMatch = allLedger.find(lt => {
                const amountMatch = Math.abs(lt.totalAmount - absBankAmount) < 0.01;
                const typeMatch = (bankAmount < 0 && lt.type === 'expense') || (bankAmount > 0 && lt.type === 'income');
                return !lt.isReconciled && !usedLedgerIds.has(lt.id) && lt.date === normalizedBankDate && amountMatch && typeMatch;
            });

            if (perfectMatch) {
                perfectMatches.push({ bank: bt, ledger: perfectMatch });
                usedLedgerIds.add(perfectMatch.id);
                return;
            }

            // 2. Potential Match (Amount Match, but Date variance or Type mismatch)
            const potentialMatch = allLedger.find(lt => {
                const amountMatch = Math.abs(lt.totalAmount - absBankAmount) < 0.01;
                const typeMatch = (bankAmount < 0 && lt.type === 'expense') || (bankAmount > 0 && lt.type === 'income');
                const dateDiff = Math.abs(differenceInDays(new Date(lt.date), new Date(normalizedBankDate)));
                
                return !lt.isReconciled && !usedLedgerIds.has(lt.id) && amountMatch && typeMatch && dateDiff <= 3;
            });

            if (potentialMatch) {
                potentialMatches.push({ bank: bt, ledger: potentialMatch, reason: 'Date Variance (+/- 3 days)' });
                usedLedgerIds.add(potentialMatch.id);
                return;
            }

            missingFromLedger.push({ ...bt, amount: bankAmount });
        });

        const outstandingLedger = allLedger.filter(lt => !lt.isReconciled && !usedLedgerIds.has(lt.id));

        return { perfectMatches, potentialMatches, missing: missingFromLedger, outstanding: outstandingLedger };
    }, [bankTransactions, incomeLedger, expenseLedger]);

    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(l => l.trim());
                
                const newTxns: BankTransaction[] = lines.slice(1).map((line, index) => {
                    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                    return {
                        id: `bank_${Date.now()}_${index}`,
                        date: parts[0] || '',
                        name: parts[2] || 'Unknown',
                        memo: parts[3] || '',
                        amount: scrubAmount(parts[4])
                    };
                });
                
                setBankTransactions(newTxns);
                setStep('triage');
                toast({ title: "Statement Ingested", description: `Parsed ${newTxns.length} transactions.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Upload Failed', description: 'Invalid CSV format.' });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleBulkReconcile = async () => {
        setIsProcessing(true);
        try {
            // Concatenate all identified matches
            const allMatches = [...results.perfectMatches, ...results.potentialMatches];
            for (const match of allMatches) {
                await reconcileLedgerEntry(match.ledger.id, match.ledger.type, match.bank.id);
            }
            toast({ title: 'Reconciliation Complete', description: `Synchronized ${allMatches.length} nodes.` });
            onSuccess();
            onOpenChange(false);
            resetWizard();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
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
                            <DialogTitle className="text-3xl font-headline uppercase tracking-tight">Reconciliation Wizard</DialogTitle>
                            <DialogDescription className="text-base font-medium">GL-First Verification Strategy</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {step === 'upload' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-10 bg-white">
                            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse border-4 border-primary/20">
                                <Upload className="h-14 w-14" />
                            </div>
                            <div className="text-center space-y-4 max-w-xl">
                                <h3 className="text-4xl font-bold font-headline tracking-tight text-slate-900">Ingest Bank Signals</h3>
                                <p className="text-muted-foreground text-xl leading-relaxed">
                                    Upload your monthly bank CSV statement to begin the high-fidelity matching process across your Spider Web.
                                </p>
                            </div>
                            <Button size="lg" className="h-20 px-20 text-2xl font-bold shadow-2xl rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                                {isProcessing ? <LoaderCircle className="mr-3 h-8 w-8 animate-spin" /> : <FileSpreadsheet className="mr-3 h-8 w-8" />}
                                Select CSV Statement File
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden bg-white">
                            <TabsList className="w-full justify-start h-16 bg-muted/50 rounded-none px-8 border-b shrink-0 gap-2 overflow-x-auto">
                                <TabsTrigger value="perfect" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest whitespace-nowrap">
                                    Matches Found <Badge className="ml-2 bg-green-500 font-mono">{results.perfectMatches.length + results.potentialMatches.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="missing" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest whitespace-nowrap">
                                    Missing from Ledger <Badge className="ml-2 bg-amber-500 font-mono">{results.missing.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="outstanding" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest whitespace-nowrap">
                                    Outstanding Ledger <Badge className="ml-2 bg-blue-500 font-mono">{results.outstanding.length}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <ScrollArea className="flex-1">
                                <div className="max-w-6xl mx-auto p-10">
                                    <TabsContent value="perfect" className="m-0 focus-visible:ring-0">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b pb-4">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" /> 
                                                        Verified Nodes
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">Nodes ready to be locked in your Black Box of Evidence.</p>
                                                </div>
                                                <Button size="lg" onClick={handleBulkReconcile} disabled={(results.perfectMatches.length + results.potentialMatches.length) === 0 || isProcessing} className="shadow-xl h-12 px-8 font-bold">
                                                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                    Reconcile All Matches ({results.perfectMatches.length + results.potentialMatches.length})
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {[...results.perfectMatches, ...results.potentialMatches].map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                                                                <CheckCircle2 className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-lg text-slate-900">{m.ledger.company}</p>
                                                                    {'reason' in m && <Badge variant="outline" className="text-[8px] uppercase border-amber-200 text-amber-700 bg-amber-50">Potential Match</Badge>}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest border-r pr-3">Ledger: {m.ledger.date}</p>
                                                                    <p className="text-xs text-muted-foreground italic truncate max-w-sm">Bank: {m.bank.date} • {m.bank.memo}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-black text-2xl text-slate-900">{formatCurrency(Math.abs(m.bank.amount))}</p>
                                                            <p className="text-[10px] uppercase font-bold text-green-600 tracking-widest mt-1">Ready to Lock</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                                {(results.perfectMatches.length + results.potentialMatches.length) === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                                                        <Search className="h-16 w-16 mb-4 text-primary" />
                                                        <p className="text-2xl font-bold">No Matches Discovered</p>
                                                        <p className="text-sm max-w-xs mt-2">Verify amounts and dates in your Ledger. Check the "Missing from Ledger" tab for bank entries not yet recorded.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="missing" className="m-0 focus-visible:ring-0">
                                        <div className="space-y-6">
                                            <div className="space-y-1 border-b pb-4">
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                                    Unrecorded Bank Signals
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Signals found in your bank but NOT in Ogeemo. Create new nodes to resolve the gap.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.missing.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm hover:border-amber-200 transition-all group">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                                                                <AlertCircle className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.name}</p>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest border-r pr-3">{m.date}</p>
                                                                    <p className="text-xs text-muted-foreground italic truncate max-w-sm">{m.memo}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-8">
                                                            <div className="text-right">
                                                                <p className={cn("font-mono font-black text-2xl", m.amount > 0 ? "text-green-600" : "text-red-600")}>
                                                                    {m.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(m.amount))}
                                                                </p>
                                                                <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest mt-1">Unrecorded Signal</p>
                                                            </div>
                                                            <Button size="sm" variant="outline" className="h-10 px-6 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all border-2 border-primary text-primary hover:bg-primary/5">
                                                                <PlusCircle className="mr-2 h-4 w-4" /> Create Node
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="outstanding" className="m-0 focus-visible:ring-0">
                                        <div className="space-y-6">
                                            <div className="space-y-1 border-b pb-4">
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <Clock className="h-5 w-5 text-blue-600" />
                                                    Pending Ledger Node (Uncleared)
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Entries in Ogeemo that have not yet appeared on your bank statement.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.outstanding.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm opacity-80">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                                                <Clock className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.company}</p>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest border-r pr-3">{m.date}</p>
                                                                    <p className="text-xs text-muted-foreground italic truncate max-w-sm">{m.description}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-bold text-xl text-slate-400">{formatCurrency(m.totalAmount)}</p>
                                                            <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mt-1">Uncleared Node</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-6">
                    <div className="hidden sm:flex items-center gap-4">
                        {step === 'triage' ? (
                            <>
                                <Button variant="ghost" size="lg" onClick={resetWizard} className="font-bold text-sm uppercase tracking-widest hover:bg-white">
                                    <X className="mr-2 h-4 w-4" /> Cancel & Restart
                                </Button>
                                <Button variant="outline" size="lg" asChild className="border-2 font-bold shadow-sm bg-white">
                                    <Link href={`/reports/bank-reconciliation?from=${bankTransactions[bankTransactions.length - 1]?.date}&to=${bankTransactions[0]?.date}`}>
                                        <FileDigit className="mr-2 h-5 w-5 text-primary" /> Final Reconciliation Report
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-primary/20">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Protocol: Verified Registry</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-12 font-bold text-lg">Close Hub</Button>
                        {step === 'triage' && (results.perfectMatches.length + results.potentialMatches.length) > 0 && (
                            <Button size="lg" onClick={handleBulkReconcile} disabled={isProcessing} className="h-14 px-16 shadow-2xl font-bold text-xl">
                                {isProcessing ? <LoaderCircle className="mr-3 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-3 h-6 w-6" />}
                                Commit Verified Matches
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
