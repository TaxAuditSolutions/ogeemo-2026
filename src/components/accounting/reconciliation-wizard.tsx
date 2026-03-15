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
    Landmark as BankIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    type IncomeTransaction, 
    type ExpenseTransaction, 
    type Company,
    type IncomeCategory,
    type ExpenseCategory,
    reconcileLedgerEntry,
    addIncomeTransaction,
    addExpenseTransaction
} from '@/services/accounting-service';
import { format, parseISO, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

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
    incomeCategories,
    expenseCategories,
    companies,
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
            const match = allLedger.find(lt => 
                !lt.isReconciled && 
                !usedLedgerIds.has(lt.id) &&
                lt.date === bt.date && 
                Math.abs(lt.totalAmount - Math.abs(bt.amount)) < 0.01
            );

            if (match) {
                perfectMatches.push({ bank: bt, ledger: match });
                usedLedgerIds.add(match.id);
            } else {
                missingFromLedger.push(bt);
            }
        });

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
                // Expecting Ogeemo 5-column format: Date, Transaction, Name, Memo, Amount
                const newTxns: BankTransaction[] = lines.slice(1).map((line, index) => {
                    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
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
            } catch (error) {
                toast({ variant: 'destructive', title: 'Upload Failed', description: 'Ensure the CSV matches the Ogeemo bank statement format.' });
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
            toast({ title: 'Reconciliation Complete', description: `Successfully matched ${results.perfectMatches.length} transactions.` });
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden text-black">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <GitMerge className="h-8 w-8" />
                        <div>
                            <DialogTitle className="text-2xl font-headline uppercase tracking-tight">Reconciliation Wizard</DialogTitle>
                            <DialogDescription className="text-base">GL-First Verification Strategy</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {step === 'upload' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-8">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                                <Upload className="h-10 w-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold">Upload Bank Signal Registry</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Drop your monthly bank CSV statement here. Ogeemo will perform an automated node-to-signal comparison.
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
                                        <strong>Automated Perfect Match:</strong> Date and Amount parity between the GL and Bank results in an instant <strong>Audit Shield</strong>.
                                    </p>
                                </div>
                                <div className="p-4 border rounded-xl bg-muted/30 flex gap-3">
                                    <Info className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <strong>Exception Triage:</strong> Easily identify missing ledger nodes or uncleared bank signals from a single dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            <Tabs defaultValue="perfect" className="flex-1 flex flex-col">
                                <TabsList className="w-full justify-start h-14 bg-muted/50 rounded-none px-6 border-b">
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

                                <div className="flex-1 overflow-hidden p-6">
                                    <TabsContent value="perfect" className="h-full m-0">
                                        <div className="space-y-4 h-full flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground italic">These entries match your Ledger and Bank Signal exactly.</p>
                                                <Button size="sm" onClick={handleBulkReconcile} disabled={results.perfectMatches.length === 0 || isProcessing}>
                                                    Confirm & Reconcile All ({results.perfectMatches.length})
                                                </Button>
                                            </div>
                                            <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50 p-4">
                                                {results.perfectMatches.map((m, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 mb-2 bg-white border rounded-lg shadow-sm">
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
                                            </ScrollArea>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="missing" className="h-full m-0">
                                        <div className="space-y-4 h-full flex flex-col">
                                            <p className="text-sm text-muted-foreground italic">Transactions found in your bank but NOT in Ogeemo. Create nodes to fix.</p>
                                            <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50 p-4">
                                                {results.missing.map((m, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 mb-2 bg-white border rounded-lg shadow-sm group">
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
                                            </ScrollArea>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="outstanding" className="h-full m-0">
                                        <div className="space-y-4 h-full flex flex-col">
                                            <p className="text-sm text-muted-foreground italic">Transactions in Ogeemo that haven't cleared your bank yet.</p>
                                            <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50 p-4">
                                                {results.outstanding.map((m, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 mb-2 bg-white border rounded-lg shadow-sm">
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
                                            </ScrollArea>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center">
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
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        {step === 'triage' && (
                            <Button onClick={handleBulkReconcile} disabled={isProcessing}>
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