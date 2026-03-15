
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    CheckCircle2
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
    getTaxTypes, type TaxType
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

type GeneralTransaction = (IncomeTransaction | ExpenseTransaction) & { transactionType: 'income' | 'expense' };

export function LedgersView() {
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
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
  
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [isStartFilterOpen, setIsStartFilterOpen] = React.useState(false);
  const [isEndFilterOpen, setIsEndFilterOpen] = React.useState(false);

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
        const [income, expenses, fetchedContacts, fetchedFolders, fetchedExpenseCategories, fetchedIncomeCategories, fetchedIndustries, fetchedCompanies, fetchedTaxTypes] = await Promise.all([
            getIncomeTransactions(user.uid), 
            getExpenseTransactions(user.uid), 
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

  const filteredIncome = React.useMemo(() => {
    if (!startDate && !endDate) return incomeLedger;
    return incomeLedger.filter(tx => {
        const txDate = new Date(tx.date);
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date(8640000000000000);
        return isWithinInterval(txDate, { start, end });
    });
  }, [incomeLedger, startDate, endDate]);

  const filteredExpenses = React.useMemo(() => {
    if (!startDate && !endDate) return expenseLedger;
    return expenseLedger.filter(tx => {
        const txDate = new Date(tx.date);
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date(8640000000000000);
        return isWithinInterval(txDate, { start, end });
    });
  }, [expenseLedger, startDate, endDate]);

  const generalLedger = React.useMemo(() => {
    const combined: GeneralTransaction[] = [
      ...filteredIncome.map(item => ({ ...item, transactionType: 'income' as const })),
      ...filteredExpenses.map(item => ({ ...item, transactionType: 'expense' as const })),
    ];
    
    if (sortConfig !== null) {
        combined.sort((a, b) => {
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
                default:
                    aValue = 0;
                    bValue = 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return combined;
  }, [filteredIncome, filteredExpenses, sortConfig, getCategoryName]);

  const incomeTotal = React.useMemo(() => filteredIncome.reduce((sum, item) => sum + item.totalAmount, 0), [filteredIncome]);
  const expenseTotal = React.useMemo(() => filteredExpenses.reduce((sum, item) => sum + item.totalAmount, 0), [filteredExpenses]);
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

  const handleEdit = (transaction: GeneralTransaction) => {
      setTransactionToEdit(transaction);
      setIsTransactionDialogOpen(true);
  };

  const clearFilters = () => {
      setStartDate(undefined);
      setEndDate(undefined);
  };

  const handleDownloadCSV = () => {
    let dataToExport: GeneralTransaction[] = [];
    let fileName = "Ogeemo_General_Ledger";

    if (activeTab === 'all') {
      dataToExport = generalLedger;
    } else if (activeTab === 'income') {
      dataToExport = filteredIncome.map(i => ({ ...i, transactionType: 'income' as const }));
      fileName = "Ogeemo_Income_Ledger";
    } else if (activeTab === 'expenses') {
      dataToExport = filteredExpenses.map(e => ({ ...e, transactionType: 'expense' as const }));
      fileName = "Ogeemo_Expense_Ledger";
    }

    if (dataToExport.length === 0) {
      toast({ variant: 'destructive', title: "No data to export", description: "The current view has no transactions." });
      return;
    }

    const headers = ["Date", "Contact", "Category", "Category #", "Type", "Amount", "Notes", "Document Link", "Reconciled"];
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

  const renderTable = (data: GeneralTransaction[], type: 'income' | 'expense' | 'all') => (
    <div className="border rounded-md overflow-hidden bg-card">
        <Table>
            <TableHeader>
                <TableRow>
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
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center print:hidden">Audit</TableHead>
                    <TableHead className="w-12 print:hidden"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(item => (
                    <TableRow id={`row-${item.id}`} key={item.id} className={cn(highlightedId === item.id && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset")}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell className="font-medium">{item.company}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {getCategoryName(item.transactionType === 'income' ? (item as IncomeTransaction).incomeCategory : (item as ExpenseTransaction).category, item.transactionType)}
                        </TableCell>
                        {type === 'all' && <TableCell className="text-center"><Badge variant={item.transactionType === 'income' ? 'default' : 'destructive'}>{item.transactionType}</Badge></TableCell>}
                        <TableCell className={cn("text-right font-mono font-semibold", item.transactionType === 'income' ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                            <div className="flex items-center justify-center gap-2">
                                {item.isReconciled && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">Reconciled against bank record.</p>
                                            </TooltipContent>
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
                ))}
                {data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={type === 'all' ? 7 : 6} className="h-32 text-center text-muted-foreground italic">No transactions found for the selected criteria.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={type === 'all' ? 4 : 3} className="text-right font-bold">Total</TableCell>
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
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="BKS Ledger" hubPath="/accounting" hubLabel="Accounting Hub" />
        
        <header className="text-center relative print:hidden">
            <h1 className="text-3xl font-bold font-headline text-primary">BKS General Ledger</h1>
            <p className="text-muted-foreground">The Source of Truth for all processed business transactions.</p>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                </Button>
            </div>
        </header>

        <Card className="print:hidden">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Orchestration Options</CardTitle>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white border-primary text-primary hover:bg-primary/5" onClick={() => setIsReconciliationWizardOpen(true)}>
                        <GitMerge className="mr-2 h-4 w-4" /> Reconcile with Bank
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white" onClick={handleDownloadCSV} disabled={generalLedger.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white" onClick={handlePrint} disabled={generalLedger.length === 0}>
                        <Printer className="mr-2 h-4 w-4" /> Print Ledger
                    </Button>
                    <Button size="sm" onClick={() => { setTransactionToEdit(null); setIsTransactionDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Post Transaction
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex flex-wrap items-end justify-center gap-6">
                <div className="flex flex-col items-center space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                    <Popover open={isStartFilterOpen} onOpenChange={setIsStartFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 text-sm bg-white", !startDate && "text-muted-foreground")}>
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
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
                    <Popover open={isEndFilterOpen} onOpenChange={setIsEndFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 text-sm bg-white", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {endDate ? format(endDate, "PPP") : <span>End of time</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndFilterOpen(false); }} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="outline" className="bg-white" onClick={clearFilters} disabled={!startDate && !endDate}>
                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
            </CardContent>
        </Card>

        <div ref={contentRef}>
            <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold">BKS General Ledger</h1>
                <p className="text-muted-foreground">
                    {startDate ? format(startDate, 'PPP') : 'Beginning of time'} - {endDate ? format(endDate, 'PPP') : 'Present'}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 print:hidden">
                    <TabsTrigger value="all">General Ledger</TabsTrigger>
                    <TabsTrigger value="income">Income Ledger</TabsTrigger>
                    <TabsTrigger value="expenses">Expense Ledger</TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderTable(generalLedger, 'all')}</TabsContent>
                <TabsContent value="income">{renderTable(filteredIncome.map(i => ({...i, transactionType: 'income'})), 'income')}</TabsContent>
                <TabsContent value="expenses">{renderTable(filteredExpenses.map(e => ({...e, transactionType: 'expense'})), 'expense')}</TabsContent>
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
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            companies={companies}
            onSuccess={loadData}
        />

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
