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
    const [activeTab, setActiveTab] = useState('perfect');
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
            // Temporal Normalization: Convert bank date to Ogeemo standard YYYY-MM-DD
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

            // High-Fidelity Matching Engine
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
                
                // Advanced CSV Parsing (handles quoted values containing commas)
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
        setActiveTab('perfect');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black shadow-2xl">
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
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-16">
                                <Card className="p-6 border-2 rounded-3xl bg-primary/5 border-primary/10 shadow-sm">
                                    <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                                    <h4 className="font-bold text-lg mb-2">Automated Parity</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Exact Date and Amount matches result in an instant <strong>Audit Shield</strong> verification, locking the node in your General Ledger.
                                    </p>
                                </Card>
                                <Card className="p-6 border-2 rounded-3xl bg-muted/30 border-black/5 shadow-sm">
                                    <Info className="h-10 w-10 text-primary mb-4" />
                                    <h4 className="font-bold text-lg mb-2">Intelligent Triage</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Identify "Surprise" bank signals (Missing from Ledger) or uncleared GL entries (Outstanding Items) from a unified hub.
                                    </p>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden bg-white">
                            <TabsList className="w-full justify-start h-16 bg-muted/50 rounded-none px-8 border-b shrink-0 gap-2">
                                <TabsTrigger value="perfect" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Perfect Matches <Badge className="ml-2 bg-green-500 font-mono">{results.perfectMatches.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="missing" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Missing from Ledger <Badge className="ml-2 bg-amber-500 font-mono">{results.missing.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="outstanding" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
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
                                                    <p className="text-sm text-muted-foreground">Nodes that share identical dates and amounts with external bank signals.</p>
                                                </div>
                                                <Button size="lg" onClick={handleBulkReconcile} disabled={results.perfectMatches.length === 0 || isProcessing} className="shadow-xl h-12 px-8 font-bold">
                                                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                    Finalize All Matches ({results.perfectMatches.length})
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {results.perfectMatches.length > 0 ? results.perfectMatches.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                                                                <CheckCircle2 className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.ledger.company}</p>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest border-r pr-3">{m.ledger.date}</p>
                                                                    <p className="text-xs text-muted-foreground italic truncate max-w-sm">{m.bank.memo}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-black text-2xl text-slate-900">{formatCurrency(m.bank.amount)}</p>
                                                            <p className="text-[10px] uppercase font-bold text-green-600 tracking-widest mt-1">Ready to Lock</p>
                                                        </div>
                                                    </Card>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                                                        <Search className="h-16 w-16 mb-4 text-primary" />
                                                        <p className="text-2xl font-bold">No Perfect Matches Found</p>
                                                        <p className="text-sm max-w-xs mt-2">Verify the date and amounts in your Ledger. Check the other tabs for discrepancies.</p>
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
                                                    Discovered Signals
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Signals found in your bank but NOT in Ogeemo. Create new nodes to resolve the gap.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.missing.length > 0 ? results.missing.map((m, i) => (
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
                                                                    {m.amount > 0 ? '+' : ''}{formatCurrency(m.amount)}
                                                                </p>
                                                                <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest mt-1">Unrecorded Signal</p>
                                                            </div>
                                                            <Button size="sm" variant="outline" className="h-10 px-6 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all border-2 border-primary text-primary hover:bg-primary/5">
                                                                <PlusCircle className="mr-2 h-4 w-4" /> Create Node
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                                                        <CheckCircle2 className="h-16 w-16 mb-4 text-green-500" />
                                                        <p className="text-2xl font-bold">Registry Perfectly Aligned</p>
                                                        <p className="text-sm mt-2">Every bank signal has a corresponding node in your Spider Web.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="outstanding" className="m-0 focus-visible:ring-0">
                                        <div className="space-y-6">
                                            <div className="space-y-1 border-b pb-4">
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <Clock className="h-5 w-5 text-blue-600" />
                                                    Pending Clearance
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Nodes in Ogeemo that have not yet cleared your physical bank account.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.outstanding.length > 0 ? results.outstanding.map((m, i) => (
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
                                                            <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mt-1">Uncleared Ledger Node</p>
                                                        </div>
                                                    </Card>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                                                        <XCircle className="h-16 w-16 mb-4 text-slate-400" />
                                                        <p className="text-2xl font-bold">No Outstanding Items</p>
                                                        <p className="text-sm mt-2">Your Ledger is perfectly synchronized with reality.</p>
                                                    </div>
                                                )}
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
                                        <FileDigit className="mr-2 h-5 w-5 text-primary" /> Generate Audit Statement
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
                        {step === 'triage' && results.perfectMatches.length > 0 && (
                            <Button size="lg" onClick={handleBulkReconcile} disabled={isProcessing} className="h-14 px-16 shadow-2xl font-bold text-xl">
                                {isProcessing ? <LoaderCircle className="mr-3 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-3 h-6 w-6" />}
                                Finalize Perfect Matches
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
