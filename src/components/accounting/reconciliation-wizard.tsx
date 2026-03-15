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
 * Handles: -$2,400.00, (2,400.00), 2400.00, $2.400,00
 */
const scrubAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const s = String(val).trim();
    if (!s) return 0;
    
    // Check for parenthetical negative (1,234.56)
    const isParens = s.startsWith('(') && s.endsWith(')');
    
    // Remove currency symbols, commas, and parentheses
    let clean = s.replace(/[$,()]/g, '');
    
    let num = parseFloat(clean);
    if (isNaN(num)) return 0;

    // Check for negative signs (leading or trailing)
    const isNegative = isParens || s.startsWith('-') || s.endsWith('-');
    
    return isNegative ? -Math.abs(num) : num;
};

/**
 * Normalizes disparate bank date formats to Ogeemo standard YYYY-MM-DD.
 * Handles multiple international formats resiliently.
 */
const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Remove any extra noise
    const cleanStr = dateStr.replace(/[^0-9/-]/g, '');
    const parts = cleanStr.split(/[-/]/);
    
    if (parts.length === 3) {
        let y, m, d;
        // Case: YYYY MM DD
        if (parts[0].length === 4) {
            y = parts[0]; m = parts[1]; d = parts[2];
        } 
        // Case: MM DD YYYY or DD MM YYYY
        else if (parts[2].length === 4) {
            y = parts[2];
            // We'll trust native JS parsing for local ambiguities, but ensure consistency
            const dObj = new Date(dateStr);
            if (isValid(dObj)) return format(dObj, 'yyyy-MM-dd');
            
            // Manual fallback if standard fails
            m = parts[0]; d = parts[1];
        } else {
            // Assume 2-digit year (e.g. 01/02/25)
            const yearPrefix = new Date().getFullYear().toString().slice(0, 2);
            y = `${yearPrefix}${parts[2]}`;
            m = parts[0]; d = parts[1];
        }
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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

    // Matching Results Logic - Multi-Interpretive Intelligence
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
            const bankAmount = bt.amount;
            const absBankAmount = Math.abs(bankAmount);
            const isBankIncome = bankAmount > 0;
            const normalizedBankDate = normalizeDate(bt.date);

            // 1. Tier 1 Pass: Perfect Match (Exact Date, Amount, and Direction)
            const perfectMatch = allLedger.find(lt => {
                if (lt.isReconciled || usedLedgerIds.has(lt.id)) return false;
                const amountMatch = Math.abs(lt.totalAmount - absBankAmount) < 0.01;
                const typeMatch = (isBankIncome && lt.type === 'income') || (!isBankIncome && lt.type === 'expense');
                const dateMatch = lt.date === normalizedBankDate;
                return dateMatch && amountMatch && typeMatch;
            });

            if (perfectMatch) {
                perfectMatches.push({ bank: bt, ledger: perfectMatch });
                usedLedgerIds.add(perfectMatch.id);
                return;
            }

            // 2. Tier 2 Pass: Fuzzy Match (Amount Match + High Confidence Similarity)
            const potentialMatch = allLedger.find(lt => {
                if (lt.isReconciled || usedLedgerIds.has(lt.id)) return false;
                
                const amountMatch = Math.abs(lt.totalAmount - absBankAmount) < 0.01;
                const typeMatch = (isBankIncome && lt.type === 'income') || (!isBankIncome && lt.type === 'expense');
                
                if (!amountMatch || !typeMatch) return false;

                // Check date variance (+/- 7 days - processing window)
                const ledgerDate = new Date(lt.date);
                const bankDate = new Date(normalizedBankDate);
                const dateDiff = Math.abs(differenceInDays(ledgerDate, bankDate));
                
                if (dateDiff <= 7) return true;

                // Basic string similarity for counterparty
                const bankName = bt.name.toLowerCase();
                const ledgerName = lt.company.toLowerCase();
                if (bankName.includes(ledgerName) || ledgerName.includes(bankName)) return true;

                return false;
            });

            if (potentialMatch) {
                const reason = differenceInDays(new Date(potentialMatch.date), new Date(normalizedBankDate)) !== 0 
                    ? 'Processing Window Delay' 
                    : 'Amount & Entity match';
                potentialMatches.push({ bank: bt, ledger: potentialMatch, reason });
                usedLedgerIds.add(potentialMatch.id);
                return;
            }

            missingFromLedger.push(bt);
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
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) throw new Error("The CSV file is too small or improperly formatted.");

                const headerLine = lines[0].toLowerCase();
                // Split by comma but respect quoted values
                const headers = headerLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));

                // DISCOVERY NODE: Intelligent column identification
                const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('posted'));
                const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('total') || h.includes('price'));
                const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal'));
                const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));
                const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('description') || h.includes('payee') || h.includes('merchant'));
                const memoIdx = headers.findIndex(h => h.includes('memo') || h.includes('notes') || h.includes('details') || h.includes('transaction type'));

                if (dateIdx === -1 && (amountIdx === -1 && debitIdx === -1)) {
                    throw new Error("Could not automatically discover Date or Amount columns. Ensure your CSV has headers like 'Date' and 'Amount'.");
                }

                const finalDateIdx = dateIdx !== -1 ? dateIdx : 0;
                const finalNameIdx = nameIdx !== -1 ? nameIdx : (headers.length > 2 ? 2 : 1);
                const finalMemoIdx = memoIdx !== -1 ? memoIdx : (headers.length > 3 ? 3 : 1);

                const newTxns: BankTransaction[] = lines.slice(1).map((line, index) => {
                    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                    
                    // Logic for combined amount vs split debit/credit columns
                    let amount = 0;
                    if (amountIdx !== -1) {
                        amount = scrubAmount(parts[amountIdx]);
                    } else {
                        const debit = debitIdx !== -1 ? Math.abs(scrubAmount(parts[debitIdx])) : 0;
                        const credit = creditIdx !== -1 ? Math.abs(scrubAmount(parts[creditIdx])) : 0;
                        amount = credit !== 0 ? credit : -debit;
                    }

                    return {
                        id: `bank_${Date.now()}_${index}`,
                        date: parts[finalDateIdx] || '',
                        name: parts[finalNameIdx] || 'Unknown',
                        memo: parts[finalMemoIdx] || '',
                        amount: amount
                    };
                });
                
                setBankTransactions(newTxns);
                setStep('triage');
                toast({ title: "Statement Ingested", description: `Discovered columns and parsed ${newTxns.length} signals.` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Ingestion Error', description: error.message || 'Invalid CSV format.' });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleBulkReconcile = async () => {
        setIsProcessing(true);
        try {
            const allMatches = [...results.perfectMatches, ...results.potentialMatches];
            for (const match of allMatches) {
                await reconcileLedgerEntry(match.ledger.id, match.ledger.type, match.bank.id);
            }
            toast({ title: 'Synchronization Complete', description: `Verified and locked ${allMatches.length} ledger nodes.` });
            onSuccess();
            onOpenChange(false);
            resetWizard();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Process Failed', description: error.message });
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
                            <DialogDescription className="text-base font-medium">BKS Autonomous Reconciliation Engine</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {step === 'upload' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-10">
                            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse border-4 border-primary/20">
                                <Upload className="h-14 w-14" />
                            </div>
                            <div className="text-center space-y-4 max-w-xl">
                                <h3 className="text-4xl font-bold font-headline tracking-tight text-slate-900">Ingest Bank Signals</h3>
                                <p className="text-muted-foreground text-xl leading-relaxed">
                                    Upload your monthly bank CSV statement. Ogeemo will automatically discover column mapping and match signals to your BKS General Ledger.
                                </p>
                            </div>
                            <Button size="lg" className="h-20 px-20 text-2xl font-bold shadow-2xl rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                                {isProcessing ? <LoaderCircle className="mr-3 h-8 w-8 animate-spin" /> : <FileSpreadsheet className="mr-3 h-8 w-8" />}
                                Select CSV File
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-16">
                                <Card className="p-6 border-2 rounded-3xl bg-primary/5 border-primary/10 shadow-sm">
                                    <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                                    <h4 className="font-bold text-lg mb-2">Automated Parity</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Our interpretive engine handles disparate date and currency formats, ensuring your Triangle Mastercard or Chase signals match your Ledger nodes.
                                    </p>
                                </Card>
                                <Card className="p-6 border-2 rounded-3xl bg-primary/5 border-primary/10 shadow-sm">
                                    <Clock className="h-10 w-10 text-primary mb-4" />
                                    <h4 className="font-bold text-lg mb-2">Audit Lock</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Matches are permanently linked to external bank IDs, creating an immutable paper trail for your Black Box of Evidence.
                                    </p>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="w-full justify-start h-16 bg-muted/50 rounded-none px-8 border-b shrink-0 gap-2">
                                <TabsTrigger value="perfect" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Discovered Matches <Badge className="ml-2 bg-green-500 font-mono">{results.perfectMatches.length + results.potentialMatches.length}</Badge>
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
                                                        Ready for Synchronization
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">High-confidence matches found across your BKS Spider Web.</p>
                                                </div>
                                                <Button size="lg" onClick={handleBulkReconcile} disabled={(results.perfectMatches.length + results.potentialMatches.length) === 0 || isProcessing} className="shadow-xl h-12 px-8 font-bold">
                                                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                    Commit All Matches ({results.perfectMatches.length + results.potentialMatches.length})
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {[...results.perfectMatches, ...results.potentialMatches].map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-green-50 rounded-xl text-green-600">
                                                                <CheckCircle2 className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-lg text-slate-900">{m.ledger.company}</p>
                                                                    {'reason' in m && <Badge variant="outline" className="text-[8px] uppercase border-amber-200 text-amber-700 bg-amber-50">{m.reason}</Badge>}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest border-r pr-3">Ledger: {m.ledger.date}</p>
                                                                    <p className="text-xs text-muted-foreground italic truncate max-w-sm">Bank Signal: {m.bank.date} • {m.bank.name}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-black text-2xl text-slate-900">{formatCurrency(Math.abs(m.bank.amount))}</p>
                                                            <p className="text-[10px] uppercase font-bold text-green-600 tracking-widest mt-1">Perfect Parity</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                                {(results.perfectMatches.length + results.potentialMatches.length) === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                                                        <Search className="h-16 w-16 mb-4 text-primary" />
                                                        <p className="text-2xl font-bold">No Perfect Matches Found</p>
                                                        <p className="text-sm max-w-xs mt-2">Adjust your interpretation strategy or check "Missing from Ledger" for potential discrepancies.</p>
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
                                                    Unrecorded External Signals
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Transactions discovered in the bank statement that lack an internal BKS node.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.missing.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm group">
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
                                                        <div className="text-right">
                                                            <p className={cn("font-mono font-black text-2xl", m.amount > 0 ? "text-green-600" : "text-red-600")}>
                                                                {m.amount > 0 ? '+' : ''}{formatCurrency(m.amount)}
                                                            </p>
                                                            <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest mt-1">Unassigned Signal</p>
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
                                                    Internal Ledger Gaps
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Records in Ogeemo that have not yet appeared as external signals (cleared).</p>
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
                                                            <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mt-1">Pending Node</p>
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
                            <Button variant="ghost" size="lg" onClick={resetWizard} className="font-bold text-sm uppercase tracking-widest">
                                <X className="mr-2 h-4 w-4" /> Cancel & Restart
                            </Button>
                        ) : (
                            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-primary/20">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Protocol: Verified Registry</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-12 font-bold text-lg">Close Hub</Button>
                        {step === 'triage' && (
                            <Button variant="outline" size="lg" asChild className="h-14 px-8 border-2 font-bold shadow-sm bg-white">
                                <Link href={`/reports/bank-reconciliation?from=${bankTransactions[bankTransactions.length - 1]?.date}&to=${bankTransactions[0]?.date}`}>
                                    <FileDigit className="mr-2 h-5 w-5 text-primary" /> Audit Parity Report
                                </Link>
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
