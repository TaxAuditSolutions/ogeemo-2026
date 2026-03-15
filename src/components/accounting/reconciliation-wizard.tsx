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
    X,
    TrendingUp,
    TrendingDown,
    Save,
    ChevronsUpDown,
    Check,
    Plus,
    Calendar as CalendarIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    reconcileLedgerEntry,
    reconcileInvoicePayment,
    reconcileBillPayment,
    addIncomeTransaction,
    addExpenseTransaction,
    addCompany,
    type IncomeTransaction, 
    type ExpenseTransaction, 
    type Company,
    type IncomeCategory,
    type ExpenseCategory,
    type Invoice,
    type PayableBill
} from '@/services/accounting-service';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import Link from 'next/link';

interface BankTransaction {
    id: string;
    date: string;
    name: string;
    memo: string;
    amount: number;
    status: 'reconciled' | 'unreconciled';
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const dObj = new Date(dateStr);
    return isValid(dObj) ? format(dObj, 'yyyy-MM-dd') : dateStr;
};

const emptyTransactionForm = { 
    date: '', 
    company: '', 
    description: '', 
    totalAmount: '', 
    taxRate: '0', 
    category: '', 
    incomeCategory: '', 
    explanation: '', 
    documentNumber: '', 
    documentUrl: '', 
    type: 'business' as 'business' | 'personal'
};

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
    const [activeTab, setActiveTab] = useState('perfect');
    const [isProcessing, setIsProcessing] = useState(false);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    
    // Selection state for granular reconciliation
    const [transactionToWorkOn, setTransactionToWorkOn] = useState<BankTransaction | null>(null);
    const [reconciliationMode, setReconciliationMode] = useState<'suggest' | 'create'>('suggest');
    
    // Creation form state
    const [newTransaction, setNewTransaction] = useState(emptyTransactionForm);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = useState(false);
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
    const [companySearchValue, setCompanySearchValue] = useState("");
    const [categorySearchValue, setCategorySearchValue] = useState("");

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
            const absBankAmount = Math.abs(bt.amount);
            const normalizedBankDate = normalizeDate(bt.date);

            const perfectMatch = allLedger.find(lt => {
                if (lt.isReconciled || usedLedgerIds.has(lt.id)) return false;
                return lt.date === normalizedBankDate && Math.abs(lt.totalAmount - absBankAmount) < 0.01;
            });

            if (perfectMatch) {
                perfectMatches.push({ bank: bt, ledger: perfectMatch });
                usedLedgerIds.add(perfectMatch.id);
                return;
            }

            const potentialMatch = allLedger.find(lt => {
                if (lt.isReconciled || usedLedgerIds.has(lt.id)) return false;
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
                if (lines.length < 2) throw new Error("CSV invalid.");

                // Simple parser for prototype fidelity
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
        setIsProcessing(true);
        try {
            const allMatches = [...results.perfectMatches, ...results.potentialMatches];
            for (const match of allMatches) {
                await reconcileLedgerEntry(match.ledger.id, match.ledger.type, match.bank.id);
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

    const resetWizard = () => {
        setStep('upload');
        setBankTransactions([]);
        setActiveTab('perfect');
        setTransactionToWorkOn(null);
    };

    const handleStartManualCreation = (bt: BankTransaction) => {
        setTransactionToWorkOn(bt);
        setReconciliationMode('create');
        setNewTransaction({
            ...emptyTransactionForm,
            date: normalizeDate(bt.date),
            company: bt.name,
            totalAmount: String(Math.abs(bt.amount)),
            description: `Reconciled from bank signal: ${bt.memo}`,
        });
    };

    const handleSaveNewNode = async () => {
        if (!user || !transactionToWorkOn) return;
        
        const isIncome = transactionToWorkOn.amount > 0;
        const total = parseFloat(newTransaction.totalAmount);
        const rate = parseFloat(newTransaction.taxRate) || 0;
        const preTax = total / (1 + rate / 100);
        const tax = total - preTax;

        if (!newTransaction.company || !newTransaction.category) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please select a contact and category.' });
            return;
        }

        setIsProcessing(true);
        try {
            const baseData = {
                date: newTransaction.date,
                company: newTransaction.company,
                description: newTransaction.description,
                totalAmount: total,
                preTaxAmount: preTax,
                taxAmount: tax,
                taxRate: rate,
                explanation: newTransaction.explanation,
                documentNumber: newTransaction.documentNumber,
                documentUrl: newTransaction.documentUrl,
                type: newTransaction.type,
                paymentMethod: 'Bank Transfer',
                isReconciled: true,
                bankReferenceId: transactionToWorkOn.id,
                userId: user.uid,
            };

            if (isIncome) {
                await addIncomeTransaction({ ...baseData, incomeCategory: newTransaction.category, depositedTo: 'Bank Account' } as any);
            } else {
                await addExpenseTransaction({ ...baseData, category: newTransaction.category, paidFrom: 'Bank Account' } as any);
            }

            toast({ title: 'Node Created & Linked' });
            setTransactionToWorkOn(null);
            onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
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
                            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-primary/20">
                                <Upload className="h-14 w-14" />
                            </div>
                            <div className="text-center space-y-4 max-w-xl">
                                <h3 className="text-4xl font-bold font-headline tracking-tight text-slate-900">Ingest Bank Signals</h3>
                                <p className="text-muted-foreground text-xl leading-relaxed">
                                    Upload your bank CSV statement to automatically match signals to your BKS General Ledger by Date and Amount.
                                </p>
                            </div>
                            <Button size="lg" className="h-20 px-20 text-2xl font-bold shadow-2xl rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                                {isProcessing ? <LoaderCircle className="mr-3 h-8 w-8 animate-spin" /> : <FileSpreadsheet className="mr-3 h-8 w-8" />}
                                Select CSV File
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="w-full justify-start h-16 bg-muted/50 rounded-none px-8 border-b shrink-0 gap-2">
                                <TabsTrigger value="perfect" className="data-[state=active]:border-b-4 border-primary rounded-none h-full px-8 font-black uppercase text-xs tracking-widest">
                                    Matches <Badge className="ml-2 bg-green-500 font-mono">{results.perfectMatches.length + results.potentialMatches.length}</Badge>
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
                                                    <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> Ready for Synchronization</h3>
                                                    <p className="text-sm text-muted-foreground">Matches found by Date and Amount.</p>
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
                                                                <p className="text-xs text-muted-foreground italic">Signal: {m.bank.date} • {m.bank.name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono font-black text-2xl text-slate-900">{formatCurrency(Math.abs(m.bank.amount))}</p>
                                                            <p className="text-[10px] uppercase font-bold text-green-600 tracking-widest mt-1">Perfect Parity</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="missing" className="m-0 focus-visible:ring-0">
                                        <div className="space-y-6">
                                            <div className="space-y-1 border-b pb-4">
                                                <h3 className="text-xl font-bold flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-600" /> Unrecorded External Signals</h3>
                                                <p className="text-sm text-muted-foreground">Transactions discovered in the bank statement that lack a ledger node.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.missing.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm group hover:border-primary transition-colors">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><AlertCircle className="h-6 w-6" /></div>
                                                            <div>
                                                                <p className="font-bold text-lg text-slate-900">{m.name}</p>
                                                                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{m.date} • {m.memo}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-8">
                                                            <div className="text-right">
                                                                <p className={cn("font-mono font-black text-2xl", m.amount > 0 ? "text-green-600" : "text-red-600")}>
                                                                    {m.amount > 0 ? '+' : ''}{formatCurrency(m.amount)}
                                                                </p>
                                                                <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest mt-1">Unassigned</p>
                                                            </div>
                                                            <Button size="icon" variant="outline" className="h-12 w-12 rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-md" onClick={() => handleStartManualCreation(m)} title="Add to General Ledger">
                                                                <PlusCircle className="h-6 w-6" />
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
                                                <h3 className="text-xl font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" /> Internal Ledger Gaps</h3>
                                                <p className="text-sm text-muted-foreground">Records in Ogeemo that have not yet matched a bank signal.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {results.outstanding.map((m, i) => (
                                                    <Card key={i} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl shadow-sm opacity-80">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Clock className="h-6 w-6" /></div>
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
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-6">
                    <div className="hidden sm:flex items-center gap-4">
                        {step === 'triage' && (
                            <Button variant="ghost" size="lg" onClick={resetWizard} className="font-bold text-sm uppercase tracking-widest"><X className="mr-2 h-4 w-4" /> Cancel & Restart</Button>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-12 font-bold text-lg">Close Hub</Button>
                        {step === 'triage' && (
                            <Button variant="outline" size="lg" asChild className="h-14 px-8 border-2 font-bold shadow-sm bg-white text-primary">
                                <Link href={`/reports/bank-reconciliation?from=${bankTransactions[bankTransactions.length - 1]?.date}&to=${bankTransactions[0]?.date}`}>
                                    <FileDigit className="mr-2 h-5 w-5" /> Audit Parity Report
                                </Link>
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>

            {/* --- MANUAL CREATION WORKSPACE --- */}
            <Dialog open={!!transactionToWorkOn} onOpenChange={() => setTransactionToWorkOn(null)}>
                <DialogContent className="sm:max-w-2xl text-black shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <PlusCircle className="h-6 w-6" />
                            <DialogTitle className="text-xl font-headline uppercase tracking-tight">Create Ledger Node</DialogTitle>
                        </div>
                        <DialogDescription>Add a missing transaction directly from the bank signal.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <Card className="bg-primary/5 border-primary/20 shadow-inner">
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Bank Signal</p>
                                    <p className="font-bold text-lg">{transactionToWorkOn?.name}</p>
                                    <p className="text-xs text-muted-foreground italic">{transactionToWorkOn?.memo}</p>
                                </div>
                                <div className="text-right">
                                    <p className={cn("text-2xl font-mono font-black", (transactionToWorkOn?.amount || 0) < 0 ? 'text-red-600' : 'text-green-600')}>
                                        {formatCurrency(transactionToWorkOn?.amount || 0)}
                                    </p>
                                    <p className="text-xs font-bold text-muted-foreground">{transactionToWorkOn?.date}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">1. Identify Contact</Label>
                                <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-11 justify-between bg-white font-normal">
                                            <span className="truncate">{newTransaction.company || "Select/Add Contact"}</span>
                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <CommandInput placeholder="Search..." value={companySearchValue} onValueChange={setCompanySearchValue} />
                                            <CommandList>
                                                <CommandEmpty>
                                                    <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={async () => {
                                                        const newComp = await addCompany({ name: companySearchValue.trim(), userId: user?.uid || '' });
                                                        setNewTransaction(p => ({...p, company: newComp.name}));
                                                        setIsCompanyPopoverOpen(false);
                                                        onSuccess();
                                                    }}>
                                                        <Plus className="mr-2 h-4 w-4" /> Create "{companySearchValue}"
                                                    </Button>
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {companies.map(c => (
                                                        <CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(p => ({...p, company: c.name})); setIsCompanyPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", newTransaction.company === c.name ? "opacity-100" : "opacity-0")} />
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">2. Tax Line Assignment</Label>
                                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-11 justify-between bg-white font-normal">
                                            <span className="truncate">
                                                {(transactionToWorkOn?.amount || 0) > 0 
                                                    ? (incomeCategories.find(c => (c.categoryNumber || c.id) === newTransaction.category)?.name || "Select income line...")
                                                    : (expenseCategories.find(c => (c.categoryNumber || c.id) === newTransaction.category)?.name || "Select expense line...")
                                                }
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search lines..." value={categorySearchValue} onValueChange={setCategorySearchValue} />
                                            <CommandList className="max-h-[300px]">
                                                <CommandEmpty>No results found.</CommandEmpty>
                                                <CommandGroup>
                                                    {((transactionToWorkOn?.amount || 0) > 0 ? incomeCategories : expenseCategories).map((c) => (
                                                        <CommandItem key={c.id} value={`${c.name} ${c.categoryNumber}`} onSelect={() => { 
                                                            setNewTransaction(p => ({ ...p, category: c.categoryNumber || c.id }));
                                                            setIsCategoryPopoverOpen(false); 
                                                        }}>
                                                            <Check className={cn("mr-2 h-4 w-4", newTransaction.category === (c.categoryNumber || c.id) ? "opacity-100" : "opacity-0")}/>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black uppercase text-muted-foreground">Line {c.categoryNumber}</span>
                                                                <span className="text-sm font-semibold">{c.name}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">3. Audit Rationale</Label>
                                <Textarea placeholder="Explain the business purpose..." rows={3} value={newTransaction.explanation} onChange={e => setNewTransaction(p => ({...p, explanation: e.target.value}))} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-lg">
                        <Button variant="ghost" onClick={() => setTransactionToWorkOn(null)} disabled={isProcessing}>Cancel</Button>
                        <Button onClick={handleSaveNewNode} disabled={isProcessing} className="font-bold shadow-xl">
                            {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Build & Reconcile Node
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
