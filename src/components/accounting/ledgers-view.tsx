'use client';

import * as React from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
    MoreVertical, 
    Pencil, 
    Trash2, 
    LoaderCircle, 
    Calendar as CalendarIcon, 
    X, 
    TrendingUp, 
    ArrowUpDown,
    ArrowDownAZ,
    ArrowUpZA,
    Printer,
    FilterX,
    Link as LinkIcon,
    PlusCircle,
    FileSpreadsheet,
    ShieldCheck,
    GitMerge,
    CheckCircle2,
    Eye,
    ScanSearch,
    AlertTriangle,
    Info,
    Zap,
    Layers,
    Scale,
    Bot
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { 
    getIncomeTransactions, deleteIncomeTransaction, type IncomeTransaction, 
    getExpenseTransactions, deleteExpenseTransaction, type ExpenseTransaction, 
    getExpenseCategories, type ExpenseCategory,
    getIncomeCategories, type IncomeCategory,
    getCompanies, type Company,
    getTaxTypes, type TaxType,
    reconcileLedgerEntry,
    getInvoices,
    getPayableBills,
    type Invoice,
    type PayableBill,
    deleteIncomeTransactions,
    deleteExpenseTransactions
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { CustomCalendar } from "@/components/ui/custom-calendar";
import Link from "next/link";
import ContactFormDialog from "@/components/contacts/contact-form-dialog";
import { useReactToPrint } from "@/hooks/use-react-to-print";
import { TransactionDialog } from "./transaction-dialog";
import { ReconciliationWizard } from "./reconciliation-wizard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

type GeneralTransaction = (IncomeTransaction | ExpenseTransaction) & { transactionType: 'income' | 'expense' };

export function LedgersView() {
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payableBills, setPayableBills] = React.useState<PayableBill[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [taxTypes, setTaxTypes] = React.useState<TaxType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [transactionToDelete, setTransactionToDelete] = React.useState<GeneralTransaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = React.useState<GeneralTransaction | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [isReconciliationWizardOpen, setIsReconciliationWizardOpen] = React.useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [isPhilosophyDialogOpen, setIsPhilosophyDialogOpen] = React.useState(false);
  
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [isStartFilterOpen, setIsStartFilterOpen] = React.useState(false);
  const [isEndFilterOpen, setIsEndFilterOpen] = React.useState(false);

  // Selection & Duplicate states
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = React.useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = React.useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { handlePrint, contentRef } = useReactToPrint();
  
  const searchParams = useSearchParams();
  const highlightedId = searchParams ? searchParams.get('highlight') : null;
  const initialTabFromParams = searchParams ? searchParams.get('tab') : 'all';
  
  const [activeTab, setActiveTab] = React.useState(initialTabFromParams || 'all');
  const router = useRouter();

  const getCategoryName = React.useCallback((categoryNumber: string, type: 'income' | 'expense') => {
      if (type === 'income') {
          return incomeCategories.find(c => c.categoryNumber === categoryNumber)?.name || categoryNumber || 'Unknown';
      }
      return expenseCategories.find(c => c.categoryNumber === categoryNumber)?.name || categoryNumber || 'Unknown';
  }, [incomeCategories, expenseCategories]);

  const loadData = React.useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const [income, expenses, invs, bills, fetchedContacts, fetchedFolders, fetchedExpenseCategories, fetchedIncomeCategories, fetchedIndustries, fetchedCompanies, fetchedTaxTypes] = await Promise.all([
            getIncomeTransactions(user.uid), 
            getExpenseTransactions(user.uid), 
            getInvoices(user.uid),
            getPayableBills(user.uid),
            getContacts(), 
            getContactFolders(user.uid),
            getExpenseCategories(user.uid), 
            getIncomeCategories(user.uid),
            getIndustries(user.uid),
            getCompanies(user.uid),
            getTaxTypes(user.uid)
        ]);
        setIncomeLedger(income); 
        setExpenseLedger(expenses); 
        setInvoices(invs.filter(i => i.originalAmount - i.amountPaid > 0.01));
        setPayableBills(bills);
        setContacts(fetchedContacts);
        setContactFolders(fetchedFolders);
        setExpenseCategories(fetchedExpenseCategories); 
        setIncomeCategories(fetchedIncomeCategories);
        setCustomIndustries(fetchedIndustries);
        setCompanies(fetchedCompanies);
        setTaxTypes(fetchedTaxTypes);
    } catch (e: any) {}
    finally { setIsLoading(false); }
  }, [user]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const generalLedgerFull = React.useMemo(() => {
    const combined: GeneralTransaction[] = [
      ...incomeLedger.map(item => ({ ...item, transactionType: 'income' as const })),
      ...expenseLedger.map(item => ({ ...item, transactionType: 'expense' as const })),
    ];
    return combined;
  }, [incomeLedger, expenseLedger]);

  const duplicateMap = React.useMemo(() => {
    const counts = new Map<string, string[]>();
    generalLedgerFull.forEach(item => {
        const key = `${item.date}|${item.company.toLowerCase().trim()}|${item.totalAmount.toFixed(2)}`;
        const existing = counts.get(key) || [];
        counts.set(key, [...existing, item.id]);
    });
    
    const dupeIds = new Set<string>();
    counts.forEach((ids) => {
        if (ids.length > 1) {
            ids.forEach(id => dupeIds.add(id));
        }
    });
    return dupeIds;
  }, [generalLedgerFull]);

  const generalLedgerFiltered = React.useMemo(() => {
    let list = generalLedgerFull;

    if (activeTab === 'income') list = list.filter(tx => tx.transactionType === 'income');
    if (activeTab === 'expenses') list = list.filter(tx => tx.transactionType === 'expense');

    if (startDate || endDate) {
        list = list.filter(tx => {
            const txDate = new Date(tx.date);
            const start = startDate ? startOfDay(startDate) : new Date(0);
            const end = endDate ? endOfDay(endDate) : new Date(8640000000000000);
            return isWithinInterval(txDate, { start, end });
        });
    }

    if (showDuplicatesOnly) {
        list = list.filter(tx => duplicateMap.has(tx.id));
    }

    if (sortConfig !== null) {
        list.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'date':
                    aValue = new Date(a.date).getTime() || 0;
                    bValue = new Date(b.date).getTime() || 0;
                    break;
                case 'company':
                    aValue = (a.company || '').toLowerCase();
                    bValue = (b.company || '').toLowerCase();
                    break;
                case 'category':
                    aValue = getCategoryName(
                        a.transactionType === 'income' ? (a as IncomeTransaction).incomeCategory : (a as ExpenseTransaction).category, 
                        a.transactionType
                    ).toLowerCase();
                    bValue = getCategoryName(
                        b.transactionType === 'income' ? (b as IncomeTransaction).incomeCategory : (b as ExpenseTransaction).category, 
                        b.transactionType
                    ).toLowerCase();
                    break;
                case 'type':
                    aValue = a.transactionType;
                    bValue = b.transactionType;
                    break;
                case 'totalAmount':
                    aValue = a.totalAmount;
                    bValue = b.totalAmount;
                    break;
                default:
                    aValue = 0;
                    bValue = 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return list;
  }, [generalLedgerFull, activeTab, startDate, endDate, showDuplicatesOnly, duplicateMap, sortConfig, getCategoryName]);

  const incomeTotal = React.useMemo(() => generalLedgerFiltered.filter(t => t.transactionType === 'income').reduce((sum, item) => sum + item.totalAmount, 0), [generalLedgerFiltered]);
  const expenseTotal = React.useMemo(() => generalLedgerFiltered.filter(t => t.transactionType === 'expense').reduce((sum, item) => sum + item.totalAmount, 0), [generalLedgerFiltered]);
  const netIncome = incomeTotal - expenseTotal;

  const handleConfirmDelete = () => {
    if (!transactionToDelete || !user) return;
    if (transactionToDelete.transactionType === 'income') {
        deleteIncomeTransaction(transactionToDelete.id);
    } else {
        deleteExpenseTransaction(transactionToDelete.id);
    }
    setTransactionToDelete(null);
    setTimeout(loadData, 500);
  };

  const handleBulkDelete = async () => {
      if (!user || selectedIds.length === 0) return;
      setIsLoading(true);
      try {
          const incomeIds = selectedIds.filter(id => incomeLedger.some(tx => tx.id === id));
          const expenseIds = selectedIds.filter(id => expenseLedger.some(tx => tx.id === id));

          if (incomeIds.length > 0) await deleteIncomeTransactions(incomeIds);
          if (expenseIds.length > 0) await deleteExpenseTransactions(expenseIds);

          toast({ title: 'Batch Delete Complete', description: `${selectedIds.length} records removed.` });
          setSelectedIds([]);
          loadData();
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Batch Failed', description: e.message });
      } finally {
          setIsLoading(false);
          setIsBulkDeleteAlertOpen(false);
      }
  };

  const handleEdit = (transaction: GeneralTransaction) => {
      setTransactionToEdit(transaction);
      setIsTransactionDialogOpen(true);
  };

  const clearFilters = () => {
      setStartDate(undefined);
      setEndDate(undefined);
      setShowDuplicatesOnly(false);
  };

  const handleDownloadCSV = () => {
    let dataToExport = generalLedgerFiltered;
    let fileName = "Ogeemo_General_Ledger";

    if (dataToExport.length === 0) {
      toast({ variant: 'destructive', title: "No data to export", description: "The current view has no transactions." });
      return;
    }

    const headers = ["Date", "Contact", "Category", "Category #", "Type", "Amount", "Rationale", "Document Link", "Reconciled"];
    const csvRows = dataToExport.map(item => {
      const catNum = item.transactionType === 'income' ? (item as IncomeTransaction).incomeCategory : (item as ExpenseTransaction).category;
      const catName = getCategoryName(catNum, item.transactionType);
      const notesValue = item.description || "";
      const explanationValue = item.explanation || "";
      const combinedNotes = `${notesValue}${explanationValue ? ' - ' + explanationValue : ''}`;
      
      return [
        item.date,
        `"${item.company.replace(/"/g, '""')}"`, 
        `"${catName.replace(/"/g, '""')}"`,
        catNum,
        item.transactionType.toUpperCase(),
        item.totalAmount.toFixed(2),
        `"${combinedNotes.replace(/"/g, '""')}"`,
        item.documentUrl || "",
        item.isReconciled ? "YES" : "NO"
      ];
    });

    const csvString = [headers.join(","), ...csvRows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful" });
  };

  const handleToggleSelect = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = (checked: boolean) => {
      setSelectedIds(checked ? generalLedgerFiltered.map(t => t.id) : []);
  };

  const renderTable = (data: GeneralTransaction[], type: 'income' | 'expense' | 'all') => (
    <div className="border border-black rounded-md overflow-hidden bg-card">
        <Table>
            <TableHeader className="bg-muted/50 border-b border-black">
                <TableRow>
                    <TableHead className="w-12 text-center">
                        <Checkbox 
                            checked={data.length > 0 && selectedIds.length === data.length}
                            onCheckedChange={handleToggleSelectAll}
                        />
                    </TableHead>
                    <TableHead className="p-0">
                        <Button variant="ghost" onClick={() => setSortConfig({ key: 'date', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                            Date {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    <TableHead className="p-0">
                        <Button variant="ghost" onClick={() => setSortConfig({ key: 'company', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                            Contact {sortConfig?.key === 'company' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    <TableHead className="p-0">
                        <Button variant="ghost" onClick={() => setSortConfig({ key: 'category', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                            Category {sortConfig?.key === 'category' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    {type === 'all' && <TableHead className="text-center">Type</TableHead>}
                    <TableHead className="p-0 text-right">
                        <Button variant="ghost" onClick={() => setSortConfig({ key: 'totalAmount', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} className="h-full w-full justify-end px-4 font-bold hover:bg-muted/50 rounded-none">
                            Amount {sortConfig?.key === 'totalAmount' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    <TableHead className="text-center print:hidden">Audit Rationale</TableHead>
                    <TableHead className="w-12 print:hidden"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(item => {
                    const isDupe = duplicateMap.has(item.id);
                    return (
                        <TableRow 
                            id={`row-${item.id}`} 
                            key={item.id} 
                            className={cn(
                                highlightedId === item.id && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset",
                                isDupe && !showDuplicatesOnly && "bg-amber-50/30"
                            )}
                        >
                            <TableCell className="text-center">
                                <Checkbox 
                                    checked={selectedIds.includes(item.id)} 
                                    onCheckedChange={() => handleToggleSelect(item.id)} 
                                />
                            </TableCell>
                            <TableCell className="text-xs">{item.date}</TableCell>
                            <TableCell className="font-medium">{item.company}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {getCategoryName(item.transactionType === 'income' ? (item as IncomeTransaction).incomeCategory : (item as ExpenseTransaction).category, item.transactionType)}
                            </TableCell>
                            {type === 'all' && <TableCell className="text-center"><Badge variant={item.transactionType === 'income' ? 'default' : 'destructive'} className="text-[10px] h-4 uppercase">{item.transactionType}</Badge></TableCell>}
                            <TableCell className={cn("text-right font-mono font-semibold", item.transactionType === 'income' ? "text-green-600" : "text-red-600")}>
                                {formatCurrency(item.totalAmount)}
                            </TableCell>
                            <TableCell className="text-center print:hidden">
                                <div className="flex items-center justify-center gap-2">
                                    {isDupe && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                </TooltipTrigger>
                                                <TooltipContent><p className="text-xs">Potential duplicate found.</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {item.isReconciled && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <ShieldCheck className="h-4 w-4 text-green-600" />
                                                </TooltipTrigger>
                                                <TooltipContent><p className="text-xs">Reconciled against bank record.</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {item.documentUrl ? (
                                        <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                            <LinkIcon className="h-4 w-4" />
                                        </a>
                                    ) : '-'}
                                </div>
                            </TableCell>
                            <TableCell className="print:hidden">
                                <div className="flex justify-end">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleEdit(item)}><Pencil className="mr-2 h-4 w-4"/>Edit Details</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setTransactionToDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
                {data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={type === 'all' ? 8 : 7} className="h-32 text-center text-muted-foreground italic">No transactions found for the selected criteria.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            <TableFooter className="bg-muted/10 border-t border-black">
                <TableRow>
                    <TableCell colSpan={type === 'all' ? 5 : 4} className="text-right font-bold">Total</TableCell>
                    <TableCell className={cn("text-right font-bold font-mono", type === 'expense' ? "text-red-600" : type === 'income' ? "text-green-600" : (netIncome >= 0 ? "text-green-600" : "text-red-600"))}>
                        {formatCurrency(type === 'income' ? incomeTotal : type === 'expense' ? expenseTotal : netIncome)}
                    </TableCell>
                    <TableCell className="print:hidden" colSpan={2}/>
                </TableRow>
            </TableFooter>
        </Table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 text-black">
        <AccountingPageHeader pageTitle="BKS Ledger" hubPath="/accounting" hubLabel="Accounting Hub" />
        
        <header className="text-center relative print:hidden">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold font-headline text-primary">BKS General Ledger</h1>
                <Button variant="ghost" size="icon" className="mt-1" onClick={() => setIsPhilosophyDialogOpen(true)}>
                    <Info className="h-5 w-5 text-muted-foreground" />
                </Button>
            </div>
            <p className="text-muted-foreground">The Source of Truth for all processed business transactions.</p>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                </Button>
            </div>
        </header>

        <Card className="print:hidden border-black shadow-lg">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-black bg-muted/30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Orchestration</CardTitle>
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                            <Badge variant="destructive" className="h-6">{selectedIds.length} Selected</Badge>
                            <Button variant="destructive" size="sm" className="h-8" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center space-x-2 mr-4 border-r pr-4 border-black/10">
                        <Switch id="dupe-audit" checked={showDuplicatesOnly} onCheckedChange={setShowDuplicatesOnly} />
                        <Label htmlFor="dupe-audit" className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                            <ScanSearch className="h-3.5 w-3.5" /> Duplicate Audit
                        </Label>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white border-primary text-primary hover:bg-primary/5" onClick={() => setIsReconciliationWizardOpen(true)}>
                        <GitMerge className="mr-2 h-4 w-4" /> Reconcile with Bank
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white" onClick={handleDownloadCSV} disabled={generalLedgerFiltered.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white" onClick={handlePrint} disabled={generalLedgerFiltered.length === 0}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button size="sm" onClick={() => { setTransactionToEdit(null); setIsTransactionDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Post Transaction
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex flex-wrap items-end justify-center gap-6">
                <div className="flex flex-col items-center space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Start Date</Label>
                    <Popover open={isStartFilterOpen} onOpenChange={setIsStartFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 text-sm bg-white border-black/20", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {startDate ? format(startDate, "PPP") : <span>Beginning of time</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartFilterOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-col items-center space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">End Date</Label>
                    <Popover open={isEndFilterOpen} onOpenChange={setIsEndFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 text-sm bg-white border-black/20", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {endDate ? format(endDate, "PPP") : <span>End of time</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndFilterOpen(false); }} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="outline" className="bg-white border-black/20" onClick={clearFilters} disabled={!startDate && !endDate && !showDuplicatesOnly}>
                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
            </CardContent>
        </Card>

        <div ref={contentRef}>
            <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold uppercase tracking-widest">BKS General Ledger</h1>
                <p className="text-gray-600 font-medium">
                    {startDate ? format(startDate, 'PPP') : 'Beginning of time'} - {endDate ? format(endDate, 'PPP') : 'Present'}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-2 border border-black"><p className="text-[10px] uppercase font-bold">Total Income</p><p className="font-mono text-lg">{formatCurrency(incomeTotal)}</p></div>
                    <div className="p-2 border border-black"><p className="text-[10px] uppercase font-bold">Total Expenses</p><p className="font-mono text-lg">{formatCurrency(expenseTotal)}</p></div>
                    <div className="p-2 border-2 border-black bg-muted/10"><p className="text-[10px] uppercase font-bold">Net Profit</p><p className="font-mono text-lg font-bold">{formatCurrency(netIncome)}</p></div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 print:hidden border border-black p-1 bg-muted">
                    <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase text-xs font-black tracking-widest">General Ledger</TabsTrigger>
                    <TabsTrigger value="income" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase text-xs font-black tracking-widest">Income Ledger</TabsTrigger>
                    <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase text-xs font-black tracking-widest">Expense Ledger</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="focus-visible:ring-0">{renderTable(generalLedgerFiltered, 'all')}</TabsContent>
                <TabsContent value="income" className="focus-visible:ring-0">{renderTable(generalLedgerFiltered, 'income')}</TabsContent>
                <TabsContent value="expenses" className="focus-visible:ring-0">{renderTable(generalLedgerFiltered, 'expense')}</TabsContent>
            </Tabs>
        </div>

        <TransactionDialog
            isOpen={isTransactionDialogOpen}
            onOpenChange={(open) => {
                setIsTransactionDialogOpen(open);
                if (!open) setTransactionToEdit(null);
            }}
            initialType={activeTab === 'income' ? 'income' : activeTab === 'expenses' ? 'expense' : 'income'}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            companies={companies}
            contacts={contacts}
            taxTypes={taxTypes}
            onSuccess={loadData}
            transactionToEdit={transactionToEdit}
        />

        <ReconciliationWizard
            isOpen={isReconciliationWizardOpen}
            onOpenChange={setIsReconciliationWizardOpen}
            incomeLedger={incomeLedger}
            expenseLedger={expenseLedger}
            invoices={invoices}
            payableBills={payableBills}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            companies={companies}
            onSuccess={loadData}
        />

        <Dialog open={isPhilosophyDialogOpen} onOpenChange={setIsPhilosophyDialogOpen}>
            <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black bg-background">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <ShieldCheck className="h-8 w-8" />
                        <div className="space-y-0.5">
                            <DialogTitle className="text-2xl font-headline uppercase tracking-tight">The Philosophy of Evidence</DialogTitle>
                            <DialogDescription className="text-sm font-medium">Reconciliation: Achieving Parity between Reality and Record.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <ScrollArea className="flex-1 bg-white">
                    <div className="max-w-4xl mx-auto p-12 space-y-12">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Zap className="h-5 w-5 text-primary" /></div>
                                <h3 className="text-2xl font-bold">1. The Signal and the Node</h3>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-base">
                                <p>
                                    In the Ogeemo World, your BKS General Ledger is your <strong>Internal Node Registry</strong>—it is your professional record of *why* money moved. The Bank Statement is an <strong>External Signal</strong>—raw proof that money moved in the physical world.
                                </p>
                                <p className="font-semibold text-foreground border-l-4 border-primary pl-4 my-6">
                                    Reconciliation is the professional act of proving that the Signal and the Node match exactly.
                                </p>
                                <p>
                                    Without reconciliation, your books are just a collection of claims. With it, they become a <strong>Black Box of Evidence</strong> that is legally defensible and audit-ready.
                                </p>
                            </div>
                        </section>
                        <Separator />
                        <section className="space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Layers className="h-5 w-5 text-primary" /></div>
                                <h3 className="text-2xl font-bold">2. The Audit-Ready Workflow</h3>
                            </div>
                            <div className="space-y-10">
                                {[
                                    { s: "0", t: "Ingest Raw Facts", d: "Upload your bank statement (CSV) to the 'Bank Accounts' hub to ingest external signals into the staging area." },
                                    { s: "1", t: "Identify Gaps", d: "The engine highlights unreconciled signals. These are physical events that haven't been linked to a business rationale yet." },
                                    { s: "2", t: "Trigger the Match Engine", d: "Use the Reconciliation Wizard to scan your ledger for matching values and dates across income, expenses, and invoices." },
                                    { s: "3", t: "Verify & Commit", d: "Select the correct match or create a new 'Verified Entry' directly from the signal to fill the gap in your registry." },
                                    { s: "4", t: "Achieve Parity", d: "Once reconciled, the node is locked with a unique Bank Reference ID, becoming a verified fact in your permanent audit trail." }
                                ].map(step => (
                                    <div key={step.s} className="flex gap-6">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-black text-xl border-2 border-primary/20">{step.s}</div>
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-lg">{step.t}</h4>
                                            <p className="text-muted-foreground leading-relaxed">{step.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <Separator />
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Scale className="h-5 w-5 text-primary" /></div>
                                <h3 className="text-2xl font-bold">3. The Result: Total Defense</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="border-primary/10 bg-primary/5 shadow-none p-6">
                                    <h4 className="font-bold text-lg flex items-center gap-2 mb-3">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        The Audit Shield
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        A reconciled transaction is <strong>pre-verified</strong> by your financial institution. This protects you from the auditor's default assumption that undocumented expenses are personal.
                                    </p>
                                </Card>
                                <Card className="border-primary/10 bg-primary/5 shadow-none p-6">
                                    <h4 className="font-bold text-lg flex items-center gap-2 mb-3">
                                        <Bot className="h-5 w-5 text-primary" />
                                        Operational Intelligence
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Reconciliation ensures your <strong>Financial Snapshot</strong> is a high-fidelity mirror of reality, with zero administrative gaps in your cash position.
                                    </p>
                                </Card>
                            </div>
                        </section>
                        <div className="bg-muted p-10 rounded-3xl border-2 border-dashed text-center space-y-4">
                            <p className="text-lg font-bold text-primary uppercase tracking-[0.2em]">The Ogeemo Mandate</p>
                            <p className="text-base text-muted-foreground italic leading-relaxed max-w-2xl mx-auto">
                                "Reconcile your ledger against your bank statement at least once a week. It takes 5 minutes but saves 5 days of stress during tax season."
                            </p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
                    <Button onClick={() => setIsPhilosophyDialogOpen(false)} className="w-full sm:w-auto h-14 px-12 font-bold shadow-xl text-lg">Back to General Ledger</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!transactionToDelete} onOpenChange={setTransactionToDelete} >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this ledger entry. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to permanently delete {selectedIds.length} ledger entries. This action will destroy the audit trail for these transactions and cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete All Selected
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <ContactFormDialog
            isOpen={isContactFormOpen}
            onOpenChange={setIsContactFormOpen}
            contactToEdit={null}
            folders={contactFolders}
            onFoldersChange={setContactFolders}
            onSave={loadData}
            companies={companies}
            onCompaniesChange={setCompanies}
            customIndustries={customIndustries}
            onCustomIndustriesChange={setCustomIndustries}
        />
    </div>
  );
}
