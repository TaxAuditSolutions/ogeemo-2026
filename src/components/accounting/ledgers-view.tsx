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

  const loadData = React.useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const [income, expenses, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories] = await Promise.all([
            getIncomeTransactions(user.uid), getExpenseTransactions(user.uid), getCompanies(user.uid), getExpenseCategories(user.uid), getIncomeCategories(user.uid),
        ]);
        setIncomeLedger(income); setExpenseLedger(expenses); setCompanies(fetchedCompanies); setExpenseCategories(fetchedExpenseCategories); setIncomeCategories(fetchedIncomeCategories);
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    finally { setIsLoading(false); }
  }, [user, toast]);

  React.useEffect(() => { loadData(); }, [loadData]);

  React.useEffect(() => {
    if (highlightedId && !isLoading) {
        const element = rowRefs.current.get(highlightedId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-primary/20');
            setTimeout(() => element.classList.remove('bg-primary/20'), 2500);
        }
    }
  }, [highlightedId, isLoading]);

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center p-4"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle={tabTitles[activeTab]} hubPath="/accounting" hubLabel="Accounting Hub" />
        <Card>
            <CardHeader className="text-center">
                <CardTitle>BKS General Ledger</CardTitle>
                <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsTransactionDialogOpen(true)}>Post Transaction</Button>
                    <Button variant="outline" onClick={() => setShowTotals(!showTotals)}>Toggle Totals</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {generalLedger.map(item => (
                            <TableRow key={item.id} ref={el => rowRefs.current.set(item.id, el)}>
                                <TableCell>{item.date}</TableCell>
                                <TableCell>{item.company}</TableCell>
                                <TableCell><Badge variant={item.transactionType === 'income' ? 'default' : 'destructive'}>{item.transactionType}</Badge></TableCell>
                                <TableCell className="text-right font-mono">${item.totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
