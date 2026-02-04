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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreVertical, BookOpen, Pencil, Trash2, LoaderCircle, Check, ChevronsUpDown, FilterX, Plus, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from '@/context/auth-context';
import { 
    getIncomeTransactions, addIncomeTransaction, updateIncomeTransaction, deleteIncomeTransaction, type IncomeTransaction, 
    getExpenseTransactions, addExpenseTransaction, updateExpenseTransaction, deleteExpenseTransaction, type ExpenseTransaction, 
    getCompanies, addCompany, type Company, 
    getExpenseCategories, addExpenseCategory, type ExpenseCategory,
    getIncomeCategories, addIncomeCategory, type IncomeCategory,
} from '@/services/accounting-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { format } from 'date-fns';
import { ScrollArea } from "../ui/scroll-area";
import { Calendar } from "../ui/calendar";
import Link from "next/link";

type GeneralTransaction = (IncomeTransaction | ExpenseTransaction) & { transactionType: 'income' | 'expense' };

const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];
const emptyTransactionForm = { date: '', company: '', description: '', totalAmount: '', taxRate: '', preTaxAmount: '', taxAmount: '', category: '', incomeCategory: '', explanation: '', documentNumber: '', documentUrl: '', type: 'business' as 'business' | 'personal', depositedTo: '' };

const tabTitles: Record<string, string> = {
    bks: 'BKS (General Ledger)',
    income: 'Income Ledger',
    expenses: 'Expense Ledger',
};

export function LedgersView() {
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<GeneralTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<GeneralTransaction | null>(null);
  const [newTransactionType, setNewTransactionType] = React.useState<'income' | 'expense'>('income');
  const [newTransaction, setNewTransaction] = React.useState(emptyTransactionForm);
  const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = React.useState(false);
  const [showAddCompany, setShowAddCompany] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState('');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
  const [showAddExpenseCategory, setShowAddExpenseCategory] = React.useState(false);
  const [newExpenseCategoryName, setNewExpenseCategoryName] = React.useState('');
  const [isIncomeCategoryPopoverOpen, setIsIncomeCategoryPopoverOpen] = React.useState(false);
  const [showAddIncomeCategory, setShowAddIncomeCategory] = React.useState(false);
  const [newIncomeCategoryName, setNewIncomeCategoryName] = React.useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [showTotals, setShowTotals] = React.useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterCategory = searchParams.get('category');
  const highlightedId = searchParams.get('highlight');
  const initialTab = searchParams.get('tab') || 'bks';
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement | null>>(new Map());

  const loadData = React.useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const [income, expenses, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories] = await Promise.all([
            getIncomeTransactions(user.uid), 
            getExpenseTransactions(user.uid), 
            getCompanies(user.uid), 
            getExpenseCategories(user.uid), 
            getIncomeCategories(user.uid),
        ]);
        setIncomeLedger(income); 
        setExpenseLedger(expenses); 
        setCompanies(fetchedCompanies); 
        setExpenseCategories(fetchedExpenseCategories); 
        setIncomeCategories(fetchedIncomeCategories);
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    finally { setIsLoading(false); }
  }, [user, toast]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const generalLedger = React.useMemo(() => {
    const combined: GeneralTransaction[] = [
      ...incomeLedger.map(item => ({ ...item, transactionType: 'income' as const })),
      ...expenseLedger.map(item => ({ ...item, transactionType: 'expense' as const })),
    ];
    if (filterCategory) {
        return combined.filter(item => {
            const itemCategory = item.transactionType === 'income' ? item.incomeCategory : item.category;
            return itemCategory === filterCategory;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomeLedger, expenseLedger, filterCategory]);

  const incomeTotal = React.useMemo(() => incomeLedger.reduce((sum, item) => sum + item.totalAmount, 0), [incomeLedger]);
  const expenseTotal = React.useMemo(() => expenseLedger.reduce((sum, item) => sum + item.totalAmount, 0), [expenseLedger]);

  const handleSaveTransaction = async () => {
      if (!user) return;
      const totalAmountNum = parseFloat(newTransaction.totalAmount);
      const taxRateNum = parseFloat(newTransaction.taxRate) || 0;
      
      let categoryNumber: string | undefined;
      if (newTransactionType === 'income') {
          categoryNumber = incomeCategories.find(c => c.name === newTransaction.incomeCategory)?.categoryNumber;
      } else {
          categoryNumber = expenseCategories.find(c => c.name === newTransaction.category)?.categoryNumber;
      }

      if (!newTransaction.date || !newTransaction.company || !categoryNumber || !newTransaction.totalAmount || isNaN(totalAmountNum) || totalAmountNum <= 0) {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill all required fields correctly.' });
          return;
      }

      const preTaxAmount = totalAmountNum / (1 + taxRateNum / 100);
      const taxAmount = totalAmountNum - preTaxAmount;
      
      const baseData = {
          date: newTransaction.date,
          company: newTransaction.company,
          description: newTransaction.description,
          totalAmount: totalAmountNum,
          preTaxAmount: preTaxAmount,
          taxAmount: taxAmount,
          taxRate: taxRateNum,
          explanation: newTransaction.explanation,
          documentNumber: newTransaction.documentNumber,
          documentUrl: newTransaction.documentUrl,
          type: newTransaction.type,
      };

      try {
          if (transactionToEdit) {
              if (newTransactionType === 'income') {
                  await updateIncomeTransaction(transactionToEdit.id, { ...baseData, incomeCategory: categoryNumber, depositedTo: newTransaction.depositedTo });
              } else {
                  await updateExpenseTransaction(transactionToEdit.id, { ...baseData, category: categoryNumber });
              }
              toast({ title: "Transaction Updated" });
          } else {
              if (newTransactionType === 'income') {
                  const newEntryData: Omit<IncomeTransaction, 'id'> = { ...baseData, incomeCategory: categoryNumber, depositedTo: newTransaction.depositedTo, userId: user.uid };
                  await addIncomeTransaction(newEntryData);
                  toast({ title: "Income Transaction Added" });
              } else {
                  const newEntryData: Omit<ExpenseTransaction, 'id'> = { ...baseData, category: categoryNumber, userId: user.uid };
                  await addExpenseTransaction(newEntryData);
                  toast({ title: "Expense Transaction Added" });
              }
          }
          setIsTransactionDialogOpen(false);
          loadData();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      }
  };

  const handleDeleteTransaction = (transaction: GeneralTransaction) => {
      setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async () => {
      if (!transactionToDelete) return;
      try {
          if (transactionToDelete.transactionType === 'income') {
              await deleteIncomeTransaction(transactionToDelete.id);
          } else {
              await deleteExpenseTransaction(transactionToDelete.id);
          }
          toast({ title: "Transaction Deleted" });
          loadData();
      } catch (error: any) {
          toast({ variant: "destructive", title: "Delete Failed", description: error.message });
      } finally {
          setTransactionToDelete(null);
      }
  };

  const handleCreateCompany = async () => {
      if (!user || !newCompanyName.trim()) return;
      try {
          const newCompany = await addCompany({ name: newCompanyName.trim(), userId: user.uid });
          setCompanies(prev => [...prev, newCompany]);
          setNewTransaction(prev => ({ ...prev, company: newCompanyName.trim() }));
          setShowAddCompany(false);
          setNewCompanyName('');
          toast({ title: 'Company Created' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to create company', description: error.message });
      }
  };

  const handleCreateExpenseCategory = async () => {
      if (!user || !newExpenseCategoryName.trim()) return;
      try {
          const newCategory = await addExpenseCategory({ name: newExpenseCategoryName.trim(), userId: user.uid });
          setExpenseCategories(prev => [...prev, newCategory]);
          setNewTransaction(prev => ({ ...prev, category: newExpenseCategoryName.trim() }));
          setShowAddExpenseCategory(false);
          setNewExpenseCategoryName('');
          toast({ title: 'Category Created' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
      }
  };

  const handleCreateIncomeCategory = async () => {
      if (!user || !newIncomeCategoryName.trim()) return;
      try {
          const newCategory = await addIncomeCategory({ name: newIncomeCategoryName.trim(), userId: user.uid });
          setIncomeCategories(prev => [...prev, newCategory]);
          setNewTransaction(prev => ({ ...prev, incomeCategory: newIncomeCategoryName.trim() }));
          setShowAddIncomeCategory(false);
          setNewIncomeCategoryName('');
          toast({ title: 'Category Created' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
      }
  };

  const handleEditTransaction = (tx: GeneralTransaction) => {
      setTransactionToEdit(tx);
      setNewTransactionType(tx.transactionType);
      setNewTransaction({
          date: tx.date,
          company: tx.company,
          description: tx.description,
          totalAmount: String(tx.totalAmount),
          taxRate: String(tx.taxRate || ''),
          preTaxAmount: String(tx.preTaxAmount || ''),
          taxAmount: String(tx.taxAmount || ''),
          category: tx.transactionType === 'expense' ? expenseCategories.find(c => c.categoryNumber === (tx as ExpenseTransaction).category)?.name || '' : '',
          incomeCategory: tx.transactionType === 'income' ? incomeCategories.find(c => c.categoryNumber === (tx as IncomeTransaction).incomeCategory)?.name || '' : '',
          explanation: tx.explanation || '',
          documentNumber: tx.documentNumber || '',
          documentUrl: tx.documentUrl || '',
          type: tx.type,
          depositedTo: tx.transactionType === 'income' ? (tx as IncomeTransaction).depositedTo : '',
      });
      setIsTransactionDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center p-4"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle={tabTitles[activeTab]} hubPath="/accounting" hubLabel="Accounting Hub" />
        <Card>
            <CardHeader className="text-center relative">
                <CardTitle>BKS General Ledger</CardTitle>
                <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setTransactionToEdit(null); setNewTransaction(emptyTransactionForm); setIsTransactionDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Post Transaction
                    </Button>
                    <Button variant="outline" onClick={() => setShowTotals(!showTotals)}>
                        {showTotals ? 'Hide Totals' : 'Show Totals'}
                    </Button>
                </div>
                <div className="absolute top-4 right-4">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {generalLedger.map(item => (
                                <TableRow key={item.id} ref={el => rowRefs.current.set(item.id, el)}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.company}</TableCell>
                                    <TableCell><Badge variant={item.transactionType === 'income' ? 'default' : 'destructive'}>{item.transactionType}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">${item.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleEditTransaction(item)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleDeleteTransaction(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        {showTotals && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Income:</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">${incomeTotal.toFixed(2)}</TableCell>
                                    <TableCell/>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Expenses:</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">${expenseTotal.toFixed(2)}</TableCell>
                                    <TableCell/>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={3} className="text-right font-bold text-lg">Net Profit/Loss:</TableCell>
                                    <TableCell className={cn("text-right font-bold text-lg", (incomeTotal - expenseTotal) >= 0 ? 'text-primary' : 'text-destructive')}>
                                        ${(incomeTotal - expenseTotal).toFixed(2)}
                                    </TableCell>
                                    <TableCell/>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="text-center sm:text-center shrink-0">
                    <DialogTitle className="text-2xl text-primary font-bold">{transactionToEdit ? 'Edit' : 'Post'} Transaction</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="grid gap-4 py-4 px-6">
                        <RadioGroup value={newTransactionType} onValueChange={(v) => setNewTransactionType(v as 'income' | 'expense')} className="grid grid-cols-2 gap-4">
                            <div><RadioGroupItem value="income" id="r-income" className="peer sr-only"/><Label htmlFor="r-income" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600">Income</Label></div>
                            <div><RadioGroupItem value="expense" id="r-expense" className="peer sr-only"/><Label htmlFor="r-expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-600">Expense</Label></div>
                        </RadioGroup>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date *</Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newTransaction.date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newTransaction.date ? format(new Date(newTransaction.date), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newTransaction.date ? new Date(newTransaction.date) : undefined} onSelect={(date) => { if (date) setNewTransaction(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDatePickerOpen(false); }} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Company *</Label>
                            <div className="col-span-3 space-y-2">
                                <div className="flex gap-2">
                                    <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" className="w-full justify-between">{newTransaction.company || "Select company..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search company..." value={newCompanyName} onValueChange={setNewCompanyName}/>
                                                <CommandList>
                                                    <CommandEmpty>No company found. <Button variant="link" onClick={() => setShowAddCompany(true)}>Add "{newCompanyName}"</Button></CommandEmpty>
                                                    <CommandGroup>
                                                        {companies.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(p => ({ ...p, company: c.name })); setIsCompanyPopoverOpen(false); }}>{c.name}</CommandItem>))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {showAddCompany && <div className="flex gap-2"><Input placeholder="New company name..." value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} /><Button onClick={handleCreateCompany}>Add</Button></div>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Amount *</Label>
                            <Input type="number" step="0.01" value={newTransaction.totalAmount} onChange={e => setNewTransaction(p => ({ ...p, totalAmount: e.target.value }))} className="col-span-3" placeholder="0.00" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category *</Label>
                            <div className="col-span-3 space-y-2">
                                {newTransactionType === 'income' ? (
                                    <Select value={newTransaction.incomeCategory} onValueChange={v => setNewTransaction(p => ({ ...p, incomeCategory: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select income category..." /></SelectTrigger>
                                        <SelectContent>{incomeCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                ) : (
                                    <Select value={newTransaction.category} onValueChange={v => setNewTransaction(p => ({ ...p, category: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select expense category..." /></SelectTrigger>
                                        <SelectContent>{expenseCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Notes</Label>
                            <Textarea value={newTransaction.description} onChange={e => setNewTransaction(p => ({ ...p, description: e.target.value }))} className="col-span-3" rows={3} placeholder="Add any extra details..."/>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2 border-t shrink-0">
                    <Button variant="ghost" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTransaction}>Save Transaction</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this transaction record.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
