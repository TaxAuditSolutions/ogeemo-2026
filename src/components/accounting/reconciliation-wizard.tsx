'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
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
    Zap,
    AlertTriangle,
    Ban,
    Filter,
    RefreshCw,
    Activity
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
import { format, isValid, differenceInDays, parse, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow,
    TableFooter
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

interface BankTransaction {
    id: string;
    date: string;
    name: string;
    memo: string;
    amount: number;
    status: 'unreconciled' | 'reconciled' | 'orphan';
}

interface ReconciliationNode {
    bank: BankTransaction;
    matchStatus: 'perfect' | 'drift' | 'unmatched' | 'duplicate';
    matchedLedgerNode?: any;
    driftDays?: number;
    recommendation: string;
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
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
    const [step, setStep] = useState<'upload' | 'ledger'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const { toast } = useToast();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reconciliationNodes = useMemo(() => {
        if (bankTransactions.length === 0) return [];

        const allRegistry = [
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

        const usedRegistryIds = new Set<string>();

        return bankTransactions.map(bt => {
            const absBankAmount = Math.abs(bt.amount);
            const normalizedBankDate = normalizeDate(bt.date);

            const perfectMatch = allRegistry.find(lt => {
                if (usedRegistryIds.has(lt.id)) return false;
                if ('isReconciled' in lt && lt.isReconciled) return false;
                return lt.date === normalizedBankDate && Math.abs(lt.totalAmount - absBankAmount) < 0.01;
            });

            if (perfectMatch) {
                usedRegistryIds.add(perfectMatch.id);
                return {
                    bank: bt,
                    matchStatus: 'perfect' as const,
                    matchedLedgerNode: perfectMatch,
                    recommendation: 'Verify Match'
                };
            }

            const driftMatch = allRegistry.find(lt => {
                if (usedRegistryIds.has(lt.id)) return false;
                if ('isReconciled' in lt && lt.isReconciled) return false;
                if (Math.abs(lt.totalAmount - absBankAmount) > 0.01) return false;
                const dateDiff = Math.abs(differenceInDays(new Date(lt.date), new Date(normalizedBankDate)));
                return dateDiff <= 7;
            });

            if (driftMatch) {
                const drift = differenceInDays(new Date(driftMatch.date), new Date(normalizedBankDate));
                usedRegistryIds.add(driftMatch.id);
                return {
                    bank: bt,
                    matchStatus: 'drift' as const,
                    matchedLedgerNode: driftMatch,
                    driftDays: drift,
                    recommendation: 'Verify Drift'
                };
            }

            return {
                bank: bt,
                matchStatus: 'unmatched' as const,
                recommendation: 'Create Entry'
            };
        });
    }, [bankTransactions, incomeLedger, expenseLedger, invoices, payableBills]);

    const filteredNodes = useMemo(() => {
        if (!searchQuery.trim()) return reconciliationNodes;
        const term = searchQuery.toLowerCase();
        return reconciliationNodes.filter(node => 
            node.bank.name.toLowerCase().includes(term) || 
            node.bank.memo.toLowerCase().includes(term) ||
            node.bank.amount.toString().includes(term)
        );
    }, [reconciliationNodes, searchQuery]);

    const stats = useMemo(() => {
        const total = reconciliationNodes.length;
        const matched = reconciliationNodes.filter(n => n.matchStatus === 'perfect' || n.matchStatus === 'drift').length;
        
        const debits = reconciliationNodes.filter(n => n.bank.amount < 0).reduce((sum, n) => sum + n.bank.amount, 0);
        const credits = reconciliationNodes.filter(n => n.bank.amount > 0).reduce((sum, n) => sum + n.bank.amount, 0);
        const net = credits + debits;

        return { total, matched, totalDebits: Math.abs(debits), totalCredits: credits, netActivity: net };
    }, [reconciliationNodes]);

    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) throw new Error("CSV invalid format.");

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
                setStep('ledger');
                toast({ title: "Statement Ingested", description: `Discovered ${newTxns.length} bank transactions.` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Ingestion Error', description: error.message });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleBulkVerify = async () => {
        if (!user || selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const nodesToVerify = reconciliationNodes.filter(n => 
                selectedIds.includes(n.bank.id) && 
                (n.matchStatus === 'perfect' || n.matchStatus === 'drift') &&
                n.bank.status !== 'reconciled'
            );

            if (nodesToVerify.length === 0) {
                toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Selected items must have a registry match to verify.' });
                setIsProcessing(false);
                return;
            }

            for (const node of nodesToVerify) {
                const match = node.matchedLedgerNode;
                if (match.matchType === 'ledger') {
                    await reconcileLedgerEntry(match.id, match.type, node.bank.id);
                } else if (match.matchType === 'invoice') {
                    await reconcileInvoicePayment(user.uid, match.id, Math.abs(node.bank.amount), node.bank.date, node.bank.id, 'Bank Account');
                } else if (match.matchType === 'bill') {
                    await reconcileBillPayment(user.uid, match.id, node.bank.date, node.bank.id, 'Bank Account');
                }
            }

            setBankTransactions(prev => prev.map(tx => selectedIds.includes(tx.id) ? { ...tx, status: 'reconciled' } : tx));
            setSelectedIds([]);
            toast({ title: 'Verification Complete', description: `${nodesToVerify.length} nodes achieves parity.` });
            onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Verification Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkAutoIngest = async () => {
        if (!user || selectedIds.length === 0) return;
        setIsProcessing(true);
        try {
            const nodesToIngest = reconciliationNodes.filter(n => 
                selectedIds.includes(n.bank.id) && 
                n.matchStatus === 'unmatched' &&
                n.bank.status !== 'reconciled'
            );

            if (nodesToIngest.length === 0) {
                toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Selected items must be unmatched to auto-ingest.' });
                setIsProcessing(false);
                return;
            }

            for (const node of nodesToIngest) {
                const bt = node.bank;
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
                    description: `Bank Ingested: ${bt.memo}`,
                    totalAmount: absAmount,
                    preTaxAmount: absAmount,
                    taxAmount: 0,
                    taxRate: 0,
                    explanation: "Automated verification from statement ingestion hub.",
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
            }

            setBankTransactions(prev => prev.map(tx => selectedIds.includes(tx.id) ? { ...tx, status: 'reconciled' } : tx));
            setSelectedIds([]);
            toast({ title: 'Ingestion Successful', description: `${nodesToIngest.length} new transactions committed to General Ledger.` });
            onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Ingestion Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFlagAsOrphan = () => {
        setBankTransactions(prev => prev.map(tx => selectedIds.includes(tx.id) ? { ...tx, status: 'orphan' } : tx));
        setSelectedIds([]);
        toast({ title: 'Records Flagged', description: 'Selected items marked as Orphan / Duplicate.' });
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const resetWizard = () => {
        setStep('upload');
        setBankTransactions([]);
        setSelectedIds([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black bg-background">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <GitMerge className="h-8 w-8" />
                        <div>
                            <DialogTitle className="text-3xl font-headline uppercase tracking-tight">Financial Ingestion Hub</DialogTitle>
                            <DialogDescription className="text-base font-medium">Unified Transaction Reconciliation Ledger</DialogDescription>
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
                                    Ingest a bank statement (CSV) to achieve professional parity between your bank activity and registry entries.
                                </p>
                            </div>
                            <Button size="lg" className="h-20 px-20 text-2xl font-bold shadow-2xl rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                                {isProcessing ? <LoaderCircle className="mr-3 h-8 w-8 animate-spin" /> : <FileSpreadsheet className="mr-3 h-8 w-8" />}
                                Select Statement File
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="bg-muted/30 border-b p-4 px-8 space-y-4">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="grid grid-cols-3 gap-3 flex-1 max-w-2xl">
                                        <Card className="bg-red-50/50 border-red-100 py-2 px-4 border-2 shadow-none">
                                            <p className="text-[9px] uppercase font-bold text-red-600 tracking-widest mb-0.5 flex items-center gap-1">
                                                <TrendingDown className="h-3 w-3" /> Debits
                                            </p>
                                            <p className="font-mono font-bold text-red-600 text-lg">({formatCurrency(stats.totalDebits)})</p>
                                        </Card>
                                        <Card className="bg-green-50/50 border-green-100 py-2 px-4 border-2 shadow-none">
                                            <p className="text-[9px] uppercase font-bold text-green-600 tracking-widest mb-0.5 flex items-center gap-1">
                                                <TrendingUp className="h-3 w-3" /> Credits
                                            </p>
                                            <p className="font-mono font-bold text-green-600 text-lg">{formatCurrency(stats.totalCredits)}</p>
                                        </Card>
                                        <Card className="bg-primary/5 border-primary/10 py-2 px-4 border-2 shadow-none">
                                            <p className="text-[9px] uppercase font-bold text-primary tracking-widest mb-0.5 flex items-center gap-1">
                                                <Activity className="h-3 w-3" /> Net Impact
                                            </p>
                                            <p className={cn("font-mono font-bold text-lg", stats.netActivity >= 0 ? "text-primary" : "text-destructive")}>
                                                {formatCurrency(stats.netActivity)}
                                            </p>
                                        </Card>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Match Parity</span>
                                            <span className="text-xl font-bold text-primary">{stats.matched} / {stats.total} Verified</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                                    <div className="relative w-full sm:w-96">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Search ingested activity..." 
                                            className="h-10 pl-9 bg-white"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {selectedIds.length > 0 && (
                                        <div className="flex items-center gap-2 p-1 bg-white border rounded-lg shadow-sm animate-in slide-in-from-right-2">
                                            <Button size="sm" onClick={handleBulkVerify} className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase">
                                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Verify Matches
                                            </Button>
                                            <Button size="sm" onClick={handleBulkAutoIngest} className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase">
                                                <Zap className="mr-1.5 h-3.5 w-3.5" /> Ingest & Reconcile
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={handleFlagAsOrphan} className="h-8 text-muted-foreground font-bold text-[10px] uppercase hover:bg-red-50 hover:text-red-600">
                                                <Ban className="mr-1.5 h-3.5 w-3.5" /> Duplicate / Orphan
                                            </Button>
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedIds([])} className="h-8 w-8 text-muted-foreground">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-10 border-b-2 border-black/5">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">
                                                <Checkbox 
                                                    checked={filteredNodes.length > 0 && selectedIds.length === filteredNodes.length}
                                                    onCheckedChange={(checked) => setSelectedIds(checked ? filteredNodes.map(n => n.bank.id) : [])}
                                                />
                                            </TableHead>
                                            <TableHead className="w-32">Date</TableHead>
                                            <TableHead>Counterparty / Memo</TableHead>
                                            <TableHead className="text-right w-32">Amount</TableHead>
                                            <TableHead className="text-center w-40">Status Node</TableHead>
                                            <TableHead>Orchestration Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredNodes.map((node) => {
                                            const bt = node.bank;
                                            const isSelected = selectedIds.includes(bt.id);
                                            const isReconciled = bt.status === 'reconciled';
                                            const isOrphan = bt.status === 'orphan';

                                            return (
                                                <TableRow 
                                                    key={bt.id} 
                                                    className={cn(
                                                        isSelected && "bg-primary/5",
                                                        isReconciled && "bg-green-50/30 opacity-60",
                                                        isOrphan && "opacity-40 grayscale"
                                                    )}
                                                >
                                                    <TableCell className="text-center">
                                                        <Checkbox 
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleSelect(bt.id)}
                                                            disabled={isReconciled}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono font-bold">{bt.date}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{bt.name}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-sm italic">{bt.memo}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className={cn("text-right font-mono font-black", bt.amount > 0 ? "text-green-600" : "text-red-600")}>
                                                        {bt.amount > 0 ? '+' : ''}{formatCurrency(bt.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isReconciled ? (
                                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-[9px] uppercase tracking-widest font-black">
                                                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Reconciled
                                                            </Badge>
                                                        ) : isOrphan ? (
                                                            <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black">Orphaned</Badge>
                                                        ) : (
                                                            <div className="flex justify-center">
                                                                {node.matchStatus === 'perfect' && <Badge className="bg-green-500 text-[9px] uppercase tracking-widest font-black">Perfect Match</Badge>}
                                                                {node.matchStatus === 'drift' && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] uppercase tracking-widest font-black cursor-help">
                                                                                    {Math.abs(node.driftDays!)} Day Drift
                                                                                </Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p className="text-xs font-bold">Matches {node.matchedLedgerNode.company}</p>
                                                                                <p className="text-[10px] opacity-80">Recorded on {node.matchedLedgerNode.date}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                                {node.matchStatus === 'unmatched' && <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black">Unmatched</Badge>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter w-24">{node.recommendation}</span>
                                                            {!isReconciled && !isOrphan && (
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black hover:bg-primary/10 hover:text-primary" onClick={() => handleToggleSelect(bt.id)}>
                                                                    Select Item
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-6">
                    <div className="hidden sm:flex items-center gap-4">
                        {step === 'ledger' && (
                            <Button variant="ghost" size="lg" onClick={resetWizard} className="font-bold text-sm uppercase tracking-widest">
                                <RefreshCw className="mr-2 h-4 w-4" /> Reset Hub
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-12 font-bold text-lg">Exit Terminal</Button>
                        {step === 'ledger' && (
                            <Button size="lg" asChild className="h-14 px-8 font-bold shadow-xl">
                                <Link href="/reports/bank-reconciliation">
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
