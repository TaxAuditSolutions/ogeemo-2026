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
    Search
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
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
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

export function ReconciliationWizard({ 
    isOpen, 
    onOpenChange, 
    incomeLedger, 
    expenseLedger,
    onSuccess 
}: ReconciliationWizardProps) {
    const [step, setStep] = useState<'upload' | 'triage'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const { toast } = useToast();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Matching Results Logic
    const results = useMemo(() => {
        if (bankTransactions.length === 0) return { perfectMatches: [], missing: [], outstanding: [] };

        const allLedger = [
            ...incomeLedger.map(i => ({ ...i, type: 'income' as const })),
            ...expenseLedger.map(e => ({ ...e, type: 'expense' as const }))
        ];

        const perfectMatches: { bank: BankTransaction; ledger: any }[] = [];
        const missingFromLedger: BankTransaction[] = [];
        const usedLedgerIds = new Set<string>();

        bankTransactions.forEach(bt => {
            // Temporal Normalization
            let normalizedBankDate = bt.date;
            try {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(bt.date)) {
                    const parsed = new Date(bt.date);
                    if (isValid(parsed)) {
                        normalizedBankDate = format(parsed, 'yyyy-MM-dd');
                    }
                }
            } catch (e) {
                console.warn("Date normalization failed for signal:", bt.date);
            }

            // High-Fidelity Matching
            const match = allLedger.find(lt => {
                return !lt.isReconciled && 
                    !usedLedgerIds.has(lt.id) &&
                    lt.date === normalizedBankDate && 
                    Math.abs(lt.totalAmount - Math.abs(bt.amount)) < 0.01;
            });

            if (match) {
                perfectMatches.push({ bank: bt, ledger: match });
                usedLedgerIds.add(match.id);
            } else {
                missingFromLedger.push(bt);
            }
        });

        // Outstanding Triage
        const outstandingLedger = allLedger.filter(lt => !lt.isReconciled && !usedLedgerIds.has(lt.id));

        return { perfectMatches, missing: missingFromLedger, outstanding: outstandingLedger };
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
                        amount: parseFloat(parts[4]) || 0
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
            for (const match of results.perfectMatches) {
                await reconcileLedgerEntry(match.ledger.id, match.ledger.type, match.bank.id);
            }
            toast({ title: 'Reconciliation Complete', description: `Matched ${results.perfectMatches.length} transactions.` });
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
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden text-black shadow-2xl">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <GitMerge className="h-8 w-8" />
                        <div>
                            <DialogTitle className="text-2xl font-headline uppercase tracking-tight">Reconciliation Wizard</DialogTitle>
                            <DialogDescription className="text-base">GL-First Verification Strategy</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {step === 'upload' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-8 overflow-y-auto">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                                <Upload className="h-10 w-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold">Upload Bank Signal Registry</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Drop your monthly bank CSV statement here. Ogeemo will perform an automated comparison across your Spider Web.
                                </p>
                            </div>
                            <Button size="lg" className="h-14 px-12 text-lg font-bold shadow-xl" onClick={() => fileInputRef.current?.click()}>
                                {isProcessing ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <FileSpreadsheet className="mr-2 h-5 w-5" />}
                                Select CSV File
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-12">
                                <div className="p-4 border rounded-xl bg-muted/30 flex gap-3">
                                    <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <strong>Automated Perfect Match:</strong> Date and Amount parity results in an instant <strong>Audit Shield</strong>.
                                    </p>
                                </div>
                                <div className="p-4 border rounded-xl bg-muted/30 flex gap-3">
                                    <Info className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <strong>Exception Triage:</strong> Easily identify missing ledger nodes or uncleared bank signals.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Tabs defaultValue="perfect" className="flex-1 flex flex-col min-h-0">
                            <TabsList className="w-full justify-start h-14 bg-muted/50 rounded-none px-6 border-b shrink-0">
                                <TabsTrigger value="perfect" className="data-[state=active]:border-b-2 border-primary rounded-none h-full px-6">
                                    Perfect Matches <Badge className="ml-2 bg-green-500">{results.perfectMatches.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="missing" className="data-[state=active]:border-b-2 border-primary rounded-none h-full px-6">
                                    Missing from Ledger <Badge className="ml-2 bg-amber-500">{results.missing.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="outstanding" className="data-[state=active]:border-b-2 border-primary rounded-none h-full px-6">
                                    Outstanding Ledger <Badge className="ml-2 bg-blue-500">{results.outstanding.length}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-hidden">
                                <TabsContent value="perfect" className="h-full m-0 p-6 flex flex-col gap-4">
                                    <div className="flex items-center justify-between shrink-0">
                                        <p className="text-sm text-muted-foreground italic">These entries match your Ledger and Bank Signal exactly.</p>
                                        <Button size="sm" onClick={handleBulkReconcile} disabled={results.perfectMatches.length === 0 || isProcessing}>
                                            Confirm & Reconcile All ({results.perfectMatches.length})
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50">
                                        <div className="p-4 space-y-2">
                                            {results.perfectMatches.map((m, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{m.ledger.company}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{m.ledger.date} • {m.bank.memo}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-mono font-bold text-sm">{formatCurrency(m.bank.amount)}</p>
                                                </div>
                                            ))}
                                            {results.perfectMatches.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                                    <Search className="h-10 w-10 mb-2" />
                                                    <p className="text-sm font-bold">No Perfect Matches Found</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="missing" className="h-full m-0 p-6 flex flex-col gap-4">
                                    <p className="text-sm text-muted-foreground italic shrink-0">Transactions found in your bank but NOT in Ogeemo.</p>
                                    <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50">
                                        <div className="p-4 space-y-2">
                                            {results.missing.map((m, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                                            <AlertCircle className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{m.name}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{m.date} • {m.memo}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className={cn("font-mono font-bold text-sm", m.amount > 0 ? "text-green-600" : "text-red-600")}>
                                                            {formatCurrency(m.amount)}
                                                        </p>
                                                        <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <PlusCircle className="mr-1 h-3 w-3" /> Create Node
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="outstanding" className="h-full m-0 p-6 flex flex-col gap-4">
                                    <p className="text-sm text-muted-foreground italic shrink-0">Transactions in Ogeemo that haven't cleared your bank yet.</p>
                                    <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50">
                                        <div className="p-4 space-y-2">
                                            {results.outstanding.map((m, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                            <Clock className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{m.company}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{m.date} • {m.description}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-mono font-bold text-sm text-slate-400">{formatCurrency(m.totalAmount)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2">
                        <Button variant="ghost" onClick={resetWizard}>Restart Wizard</Button>
                        {step === 'triage' && (
                            <Button variant="outline" asChild>
                                <Link href={`/reports/bank-reconciliation?from=${bankTransactions[bankTransactions.length - 1]?.date}&to=${bankTransactions[0]?.date}`}>
                                    <FileDigit className="mr-2 h-4 w-4" /> Final Reconciliation Report
                                </Link>
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6">Cancel</Button>
                        {step === 'triage' && (
                            <Button onClick={handleBulkReconcile} disabled={isProcessing} className="h-12 px-8 shadow-xl font-bold">
                                {isProcessing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Finalize Perfect Matches
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
