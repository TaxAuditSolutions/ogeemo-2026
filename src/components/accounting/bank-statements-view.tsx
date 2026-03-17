'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Plus, 
    Link2, 
    GitMerge, 
    UserCheck, 
    ShieldCheck, 
    LoaderCircle, 
    ChevronsUpDown, 
    Check, 
    MoreVertical, 
    Pencil, 
    Trash2, 
    Info,
    ArrowRight,
    Landmark,
    Calendar as CalendarIcon,
    X,
    Zap,
    Upload,
    Layers,
    Scale,
    ChevronLeft,
    FileSpreadsheet,
    Bot,
    Search
} from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';
import { 
    getIncomeTransactions, 
    getExpenseTransactions, 
    getInvoices,
    getPayableBills,
    reconcileLedgerEntry,
    reconcileInvoicePayment,
    reconcileBillPayment,
    type Invoice,
    type PayableBill,
    getCompanies, 
    getExpenseCategories, 
    getIncomeCategories, 
    addCompany, 
    type Company, 
    type ExpenseCategory, 
    type IncomeCategory,
    type TaxType,
    getTaxTypes
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><LoaderCircle className="h-10 w-10 animate-spin text-white" /></div>,
});

type BankAccount = {
  id: string;
  name: string;
  bank: string;
  type: "Business" | "Personal";
  institutionNumber: string;
  transitNumber: string;
  accountNumber: string;
  openingBalance: number;
  closingBalance: number;
  address?: string;
  phone?: string;
  accountManager?: string;
};

type BankTransaction = {
  id: string;
  accountId: string;
  date: string;
  transactionType: string;
  name: string;
  memo: string;
  amount: number;
  status: "reconciled" | "unreconciled" | "personal";
};

const initialMockAccounts: BankAccount[] = [
  { id: 'acc_1', name: 'Primary Checking', bank: 'Chase', type: 'Business', institutionNumber: '001', transitNumber: '12345', accountNumber: '111222333', openingBalance: 10430.22, closingBalance: 15430.22 },
  { id: 'acc_2', name: 'High-Yield Savings', bank: 'Marcus', type: 'Business', institutionNumber: '002', transitNumber: '67890', accountNumber: '444555666', openingBalance: 75000.00, closingBalance: 85000.00 },
  { id: 'acc_3', name: 'Personal Checking', bank: 'Chase', type: 'Personal', institutionNumber: '001', transitNumber: '12345', accountNumber: '777888999', openingBalance: 4210.50, closingBalance: 5210.50 },
];

const mockBankTransactions: BankTransaction[] = [
  { id: 'txn_b_1', accountId: 'acc_1', date: '2024-07-25', transactionType: 'ACH', name: 'Client Alpha', memo: 'Invoice #1001 payment', amount: 5000, status: 'reconciled' },
  { id: 'txn_b_2', accountId: 'acc_1', date: '2024-07-25', transactionType: 'DEBIT', name: 'Cloud Hosting Inc.', memo: 'Monthly server fee', amount: -150, status: 'reconciled' },
  { id: 'txn_b_3', accountId: 'acc_1', date: '2024-07-24', transactionType: 'TRANSFER', name: 'Stripe Payout', memo: 'Merchant settle', amount: 850.75, status: 'reconciled' },
  { id: 'txn_b_4', accountId: 'acc_1', date: '2024-07-23', transactionType: 'DEBIT', name: 'SaaS Tools Co.', memo: 'Subscription', amount: -75.99, status: 'unreconciled' },
  { id: 'txn_b_5', accountId: 'acc_1', date: '2024-07-22', transactionType: 'XFER', name: 'Self Transfer', memo: 'To acc_2', amount: -10000, status: 'reconciled' },
  { id: 'txn_b_6', accountId: 'acc_1', date: '2024-07-21', transactionType: 'DEBIT', name: 'Shell Oil', memo: 'Fuel', amount: -55.45, status: 'unreconciled' },
];

const emptyAccountForm: Omit<BankAccount, 'id'> & { openingBalance: number | ''; closingBalance: number | '' } = {
    name: '',
    bank: '',
    type: 'Business',
    institutionNumber: '',
    transitNumber: '',
    accountNumber: '',
    address: '',
    phone: '',
    accountManager: '',
    openingBalance: '',
    closingBalance: '',
};

export function BankStatementsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get('accountId');

  const [mockAccounts, setMockAccounts] = React.useState<BankAccount[]>(initialMockAccounts);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = React.useState(false);
  const [newAccount, setNewAccount] = React.useState(emptyAccountForm);
  
  const [transactionToReconcile, setTransactionToReconcile] = React.useState<BankTransaction | null>(null);
  
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payableBills, setPayableBills] = React.useState<PayableBill[]>([]);
  
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [bankTransactions, setBankTransactions] = React.useState<BankTransaction[]>(mockBankTransactions);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [taxTypes, setTaxTypes] = React.useState<TaxType[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    if (!user) {
        setIsLoadingData(false);
        return;
    }
    setIsLoadingData(true);
    try {
        const [income, expenses, invs, bills, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories, fetchedFolders, fetchedIndustries, fetchedContacts, fetchedTaxTypes] = await Promise.all([
            getIncomeTransactions(user.uid),
            getExpenseTransactions(user.uid),
            getInvoices(user.uid),
            getPayableBills(user.uid),
            getCompanies(user.uid),
            getExpenseCategories(user.uid),
            getIncomeCategories(user.uid),
            getContactFolders(user.uid),
            getIndustries(user.uid),
            getContacts(),
            getTaxTypes(user.uid)
        ]);
        setIncomeLedger(income);
        setExpenseLedger(expenses);
        setInvoices(invs.filter(i => i.originalAmount - i.amountPaid > 0.01));
        setPayableBills(bills);
        setCompanies(fetchedCompanies);
        setExpenseCategories(fetchedExpenseCategories);
        setIncomeCategories(fetchedIncomeCategories);
        setContactFolders(fetchedFolders);
        setCustomIndustries(fetchedIndustries);
        setContacts(fetchedContacts);
        setTaxTypes(fetchedTaxTypes);
    } catch (error: any) {
        console.error("Bank Hub Load Error:", error);
    } finally {
        setIsLoadingData(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlaidContinue = () => {
    setIsLinkDialogOpen(false);
    toast({
        title: "Connecting to Plaid...",
        description: "In a real application, the secure Plaid Link flow would start now."
    });
  };

  const suggestedMatches = React.useMemo(() => {
    if (!transactionToReconcile) return [];
    const results: any[] = [];
    const amount = Math.abs(transactionToReconcile.amount);
    
    const allLedger = [...incomeLedger, ...expenseLedger];
    allLedger.forEach(entry => {
        if (Math.abs(entry.totalAmount - amount) < 0.01) {
            results.push({ ...entry, matchType: 'ledger', confidence: entry.date === transactionToReconcile.date ? 'High' : 'Medium' });
        }
    });

    if (transactionToReconcile.amount > 0) {
        invoices.forEach(inv => {
            const balance = inv.originalAmount - inv.amountPaid;
            if (Math.abs(balance - amount) < 0.01) {
                results.push({ ...inv, matchType: 'invoice', confidence: 'High' });
            }
        });
    }

    if (transactionToReconcile.amount < 0) {
        payableBills.forEach(bill => {
            if (Math.abs(bill.totalAmount - amount) < 0.01) {
                results.push({ ...bill, matchType: 'bill', confidence: 'High' });
            }
        });
    }
    
    return results.sort((a,b) => (a.confidence === 'High' ? -1 : 1));
  }, [transactionToReconcile, incomeLedger, expenseLedger, invoices, payableBills]);

  const handleMatch = async (match: any) => {
    if (!transactionToReconcile || !user || !selectedAccount) return;

    try {
        if (match.matchType === 'ledger') {
            await reconcileLedgerEntry(match.id, 'incomeCategory' in match ? 'income' : 'expense', transactionToReconcile.id);
        } else if (match.matchType === 'invoice') {
            await reconcileInvoicePayment(user.uid, match.id, Math.abs(transactionToReconcile.amount), transactionToReconcile.date, transactionToReconcile.id, selectedAccount.name);
        } else if (match.matchType === 'bill') {
            await reconcileBillPayment(user.uid, match.id, transactionToReconcile.date, transactionToReconcile.id, selectedAccount.name);
        }

        setBankTransactions(prev => prev.map(tx => tx.id === transactionToReconcile.id ? { ...tx, status: 'reconciled' } : tx));
        setTransactionToReconcile(null);
        toast({ title: 'Matched & Reconciled', description: 'The audit trail has been established.' });
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Reconciliation Failed', description: error.message });
    }
  };
  
  const handleMarkAsPersonal = (transaction: BankTransaction) => {
      setBankTransactions(prev => prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'personal' } : tx));
      toast({ title: 'Transaction Marked as Personal' });
  };

  const handleOpenNewAccountDialog = () => {
      setNewAccount(emptyAccountForm);
      setIsNewAccountOpen(true);
  };

  const handleSaveNewAccount = () => {
      if (!newAccount.name || !newAccount.bank || !newAccount.institutionNumber || !newAccount.transitNumber || !newAccount.accountNumber || newAccount.openingBalance === '' || newAccount.closingBalance === '') {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields correctly.' });
          return;
      }
      const newMockAccount: BankAccount = {
          id: `acc_${Date.now()}`,
          ...newAccount,
          openingBalance: Number(newAccount.openingBalance),
          closingBalance: Number(newAccount.closingBalance)
      };
      setMockAccounts(prev => [...prev, newMockAccount]);
      setIsNewAccountOpen(false);
      toast({ title: 'Account Added', description: 'New account node has been registered.' });
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    setContacts(prev => isEditing ? prev.map(c => c.id === savedContact.id ? savedContact : c) : [savedContact, ...prev]);
    setIsContactFormOpen(false);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !accountIdParam) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const newTxns: BankTransaction[] = lines.slice(1).filter(line => line.trim()).map((line, index) => {
            const parts = line.split(',');
            const dateStr = parts[0]?.trim().replace(/^"|"$/g, '') || format(new Date(), 'yyyy-MM-dd');
            const typeStr = parts[1]?.trim().replace(/^"|"$/g, '') || 'N/A';
            const nameStr = parts[2]?.trim().replace(/^"|"$/g, '') || 'Unknown';
            const memoStr = parts[3]?.trim().replace(/^"|"$/g, '') || '';
            const amountStr = parts[4]?.trim().replace(/^"|"$/g, '') || '0';
            
            return {
                id: `up_${Date.now()}_${index}`,
                accountId: accountIdParam,
                date: dateStr,
                transactionType: typeStr,
                name: nameStr,
                memo: memoStr,
                amount: parseFloat(amountStr),
                status: 'unreconciled'
            };
        });
        
        setBankTransactions(prev => [...newTxns, ...prev]);
        toast({ title: 'Statement Ingested', description: `Added ${newTxns.length} transactions to the registry.` });
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const selectedAccount = mockAccounts.find(acc => acc.id === accountIdParam);
  const transactions = bankTransactions.filter(txn => txn.accountId === accountIdParam);

  const handleSelectAccount = (id: string) => {
      router.push(`/accounting/bank-statements?accountId=${id}`);
  };

  const handleBackToAccounts = () => {
      router.push(`/accounting/bank-statements`);
  };

  const commonDialogs = (
    <React.Fragment>
        <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
            <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black bg-background">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <ShieldCheck className="h-8 w-8" />
                        <div className="space-y-0.5">
                            <DialogTitle className="text-2xl font-headline uppercase tracking-tight">The Philosophy of Evidence</DialogTitle>
                            <DialogDescription className="text-sm font-medium">Reconciliation: Bridging the Signal and the Node.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <ScrollArea className="flex-1 bg-white">
                    <div className="max-w-4xl mx-auto p-12 space-y-12">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Zap className="h-5 w-5 text-primary" /></div>
                                <h3 className="text-2xl font-bold">1. What is Reconciliation?</h3>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-base">
                                <p>
                                    In the Ogeemo World, your bank statement is an <strong>External Signal</strong>—it is proof that money moved in the physical world. Your General Ledger is an <strong>Internal Node</strong>—it is your record of why that money moved.
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
                                <h3 className="text-2xl font-bold">2. Step-by-Step Instructions</h3>
                            </div>
                            <div className="space-y-10">
                                {[
                                    { s: "0", t: "Retrieve & Upload Your Data", d: "Log in to your bank portal and download your monthly statement as a CSV file. In Ogeemo, click 'Upload CSV Statement' to ingest these raw facts." },
                                    { s: "1", t: "The Connection (Plaid or Manual)", d: "Alternatively, click 'Link Bank' to use Ogeemo's secure Plaid integration for automated sync." },
                                    { s: "2", t: "Identify Unreconciled Signals", d: "Review the list. Items marked with a red 'Unreconciled' badge are mysteries that need a business reason for the CRA." },
                                    { s: "3", t: "Trigger the Matching Engine", d: "Click 'Reconcile Signal'. Ogeemo scans your invoices, bills, and previous entries to find a matching value and date." },
                                    { s: "4", t: "Verify Match or Create Node", d: "Select a suggestion to link it instantly, or click 'Create New Verified Entry' to build a new node directly from the signal." },
                                    { s: "5", t: "Achieve the Audit Shield", d: "Once reconciled, the node is locked. It now contains a bank reference ID, making it a verified fact in your audit trail." }
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
                                <h3 className="text-2xl font-bold">3. Why does this matter?</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="border-primary/10 bg-primary/5 shadow-none p-6">
                                    <h4 className="font-bold text-lg flex items-center gap-2 mb-3">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        The Audit Shield
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        A reconciled transaction is <strong>pre-verified</strong> with a unique bank ID, protecting you from the auditor's assumption that expenses are personal.
                                    </p>
                                </Card>
                                <Card className="border-primary/10 bg-primary/5 shadow-none p-6">
                                    <h4 className="font-bold text-lg flex items-center gap-2 mb-3">
                                        <Bot className="h-5 w-5 text-primary" />
                                        Live Intelligence
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Reconciliation ensures your <strong>Financial Snapshot</strong> is 100% accurate, with zero administrative gaps in your cash position.
                                    </p>
                                </Card>
                            </div>
                        </section>
                        <div className="bg-muted p-10 rounded-3xl border-2 border-dashed text-center space-y-4">
                            <p className="text-lg font-bold text-primary uppercase tracking-[0.2em]">The Ogeemo Mandate</p>
                            <p className="text-base text-muted-foreground italic leading-relaxed max-w-2xl mx-auto">
                                "Reconcile your primary checking account at least once a week. It takes 5 minutes but saves 5 days of stress during tax season."
                            </p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
                    <Button onClick={() => setIsInfoDialogOpen(false)} className="w-full sm:w-auto h-14 px-12 font-bold shadow-xl text-lg">Return to Financial Registry</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Link2 className="h-6 w-6" />
                        <DialogTitle>Connect Financial Institution</DialogTitle>
                    </div>
                    <DialogDescription>Securely synchronize bank signals using Plaid.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="flex items-start gap-4 p-4 border rounded-xl bg-primary/5">
                        <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Ogeemo never sees or stores your credentials. Connections are encrypted end-to-end via Plaid's secure portal.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePlaidContinue} className="w-full h-12 text-lg font-bold">Continue to Plaid</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
            <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col p-0 text-black">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <DialogTitle>Register Account Node</DialogTitle>
                    <DialogDescription>Add a new financial account to your registry.</DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Account Name</Label><Input value={newAccount.name} onChange={e => setNewAccount(p => ({...p, name: e.target.value}))} placeholder="e.g., Primary Savings" /></div>
                        <div className="space-y-2"><Label>Bank Name</Label><Input value={newAccount.bank} onChange={e => setNewAccount(p => ({...p, bank: e.target.value}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newAccount.type} onValueChange={(v: any) => setNewAccount(p => ({...p, type: v}))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Business">Business</SelectItem>
                                    <SelectItem value="Personal">Personal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label>Opening Balance ($)</Label><Input type="number" step="0.01" value={newAccount.openingBalance} onChange={e => setNewAccount(p => ({...p, openingBalance: e.target.value === '' ? '' : Number(e.target.value)}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Closing Balance ($)</Label><Input type="number" step="0.01" value={newAccount.closingBalance} onChange={e => setNewAccount(p => ({...p, closingBalance: e.target.value === '' ? '' : Number(e.target.value)}))} /></div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Inst. #</Label><Input value={newAccount.institutionNumber} onChange={e => setNewAccount(p => ({...p, institutionNumber: e.target.value}))} /></div>
                        <div className="space-y-2"><Label>Transit #</Label><Input value={newAccount.transitNumber} onChange={e => setNewAccount(p => ({...p, transitNumber: e.target.value}))} /></div>
                        <div className="space-y-2"><Label>Account #</Label><Input value={newAccount.accountNumber} onChange={e => setNewAccount(p => ({...p, accountNumber: e.target.value}))} /></div>
                    </div>
                </div>
                <DialogFooter className="p-6 border-t bg-muted/10"><Button variant="ghost" onClick={() => setIsNewAccountOpen(false)}>Cancel</Button><Button onClick={handleSaveNewAccount}>Register Node</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <ContactFormDialog
            isOpen={isContactFormOpen}
            onOpenChange={setIsContactFormOpen}
            contactToEdit={null}
            folders={contactFolders}
            onFoldersChange={setContactFolders}
            onSave={handleContactSave}
            companies={companies}
            onCompaniesChange={setCompanies}
            customIndustries={customIndustries}
            onCustomIndustriesChange={setCustomIndustries}
        />
    </React.Fragment>
  );

  if (!accountIdParam) {
      return (
        <div className="p-4 sm:p-6 space-y-6 text-black min-h-full">
            <AccountingPageHeader pageTitle="Bank Accounts" />
            <header className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-3xl font-bold font-headline text-primary">Financial Registry</h1>
                    <Button variant="ghost" size="icon" className="mt-1" onClick={() => setIsInfoDialogOpen(true)}>
                        <Info className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    Select a secure cloud node to begin the reconciliation process.
                </p>
            </header>

            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Connected Accounts</CardTitle>
                            <CardDescription>Click an account to manage transactions and build evidence.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleOpenNewAccountDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Add Registry Node
                            </Button>
                            <Button onClick={() => setIsLinkDialogOpen(true)}>
                                <Link2 className="mr-2 h-4 w-4" /> Secure Bank Link
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mockAccounts.map(account => (
                            <Card 
                                key={account.id} 
                                className="cursor-pointer hover:border-primary hover:shadow-md transition-all group border-muted"
                                onClick={() => handleSelectAccount(account.id)}
                            >
                                <CardContent className="p-6 flex justify-between items-center">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-5 w-5 text-primary" />
                                            <h3 className="font-bold text-lg">{account.name}</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{account.bank} • ...{account.accountNumber.slice(-4)}</p>
                                        <Badge variant={account.type === 'Business' ? 'default' : 'secondary'} className="text-[10px] uppercase">{account.type}</Badge>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-xs text-muted-foreground">Open: {formatCurrency(account.openingBalance)}</p>
                                        <p className="text-sm font-bold font-mono text-primary">Close: {formatCurrency(account.closingBalance)}</p>
                                        <p className="text-[10px] uppercase font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
                                            Manage <ArrowRight className="h-3 w-3" />
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Zap className="h-4 w-4" /> One-Click Reconciliation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                High-fidelity matching between bank signals and your BKS General Ledger ensures zero administrative gaps.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> The Audit Shield
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Reconciled nodes are pre-verified, protecting your business from the auditor's assumption of personal use.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Bot className="h-4 w-4" /> Data Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Integrated with the Ogeemo Spider Web to automatically detect and suggest matches for invoices and bills.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {commonDialogs}
        </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 text-black bg-background min-h-screen">
        <AccountingPageHeader pageTitle={`Transactions: ${selectedAccount?.name}`} />
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleBackToAccounts}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Accounts
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">{selectedAccount?.name}</h1>
                    <p className="text-muted-foreground text-sm">{selectedAccount?.bank} • ...{selectedAccount?.accountNumber.slice(-4)}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-10">
                    <Upload className="mr-2 h-4 w-4" /> Upload CSV Statement
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                <div className="flex gap-4">
                    <div className="bg-muted px-4 py-2 rounded-lg border border-border text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Opening Balance</p>
                        <p className="font-mono font-bold text-muted-foreground">{formatCurrency(selectedAccount?.openingBalance || 0)}</p>
                    </div>
                    <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/20 text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Closing Balance</p>
                        <p className="font-mono font-bold text-primary">{formatCurrency(selectedAccount?.closingBalance || 0)}</p>
                    </div>
                </div>
            </div>
        </header>

        <Card className="shadow-xl overflow-hidden border-black">
            <CardHeader className="bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Transaction Registry</CardTitle>
                        <CardDescription>View external bank signals for matching.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow>
                            <TableHead className="w-32">Date</TableHead>
                            <TableHead className="w-32">Transaction</TableHead>
                            <TableHead>Counterparty (Name)</TableHead>
                            <TableHead>Memo / Details</TableHead>
                            <TableHead className="text-right w-40">Amount</TableHead>
                            <TableHead className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(txn => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-xs font-bold font-mono">{txn.date}</TableCell>
                          <TableCell className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">{txn.transactionType}</TableCell>
                          <TableCell className="font-bold text-sm">{txn.name}</TableCell>
                          <TableCell className="text-xs italic text-muted-foreground truncate max-w-xs">{txn.memo}</TableCell>
                          <TableCell className={cn("text-right font-mono font-black text-lg", txn.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                              {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setTransactionToReconcile(txn)}>
                                        <GitMerge className="mr-2 h-4 w-4 text-primary" />Reconcile Signal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleMarkAsPersonal(txn)}>
                                        <UserCheck className="mr-2 h-4 w-4" />Mark as Personal
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={6} className="h-64 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                      <FileSpreadsheet className="h-12 w-12" />
                                      <div className="space-y-1">
                                          <p className="font-bold">No transactions ingested.</p>
                                          <p className="text-xs">Upload a CSV statement to begin reconciliation.</p>
                                      </div>
                                  </div>
                              </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-3 justify-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.3em]">Operational Node: {selectedAccount?.id} • Verified Registry</p>
            </CardFooter>
        </Card>

        <Dialog open={!!transactionToReconcile} onOpenChange={() => setTransactionToReconcile(null)}>
            <DialogContent className="sm:max-w-2xl flex flex-col p-0 overflow-hidden text-black shadow-2xl">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <GitMerge className="h-6 w-6" />
                        <DialogTitle className="text-xl font-headline uppercase tracking-tight">Reconciliation Workspace</DialogTitle>
                    </div>
                    <DialogDescription>
                        Match this bank signal to an existing internal Ogeemo node.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 max-h-[70vh]">
                    <div className="p-6 space-y-6">
                        <Card className="bg-muted/30 border-2 shadow-inner">
                            <CardHeader className="py-3 px-4 border-b bg-white/50">
                                <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Landmark className="h-3 w-3" /> External Bank Signal
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div className="space-y-1 min-w-0">
                                    <p className="font-bold text-lg truncate">{transactionToReconcile?.name}</p>
                                    <p className="text-xs text-muted-foreground italic truncate">{transactionToReconcile?.memo}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono"><CalendarIcon className="h-3 w-3"/> {transactionToReconcile?.date}</p>
                                </div>
                                <p className={cn("text-2xl font-mono font-black shrink-0", (transactionToReconcile?.amount || 0) < 0 ? 'text-red-600' : 'text-green-600')}>
                                    {formatCurrency(transactionToReconcile?.amount || 0)}
                                </p>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Internal Spider Web Suggestions
                            </h4>
                            
                            {isLoadingData ? <div className="flex justify-center p-8"><LoaderCircle className="h-8 w-8 animate-spin text-primary"/></div> : (
                                <div className="space-y-3">
                                    {suggestedMatches.length > 0 ? suggestedMatches.map((match, i) => (
                                        <div key={`${match.id}-${i}`} className="flex items-center justify-between p-4 border rounded-xl hover:bg-primary/5 transition-all group cursor-pointer bg-white" onClick={() => handleMatch(match)}>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-muted rounded-lg group-hover:bg-white transition-colors">
                                                    {match.matchType === 'invoice' ? <FileDigit className="h-5 w-5 text-blue-500" /> : match.matchType === 'bill' ? <PlusCircle className="h-5 w-5 text-orange-500" /> : <PlusCircle className="h-5 w-5 text-green-500" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm">{match.company || match.vendor || match.companyName}</p>
                                                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter font-bold h-4 px-1">{match.matchType}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">{match.description || `Invoice #${match.invoiceNumber}`}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div className="flex flex-col items-end">
                                                    <p className="font-mono text-sm font-bold">${Math.abs(match.totalAmount || (match.originalAmount - match.amountPaid)).toFixed(2)}</p>
                                                    <Badge className={cn("text-[8px] h-3 px-1 uppercase font-black", match.confidence === 'High' ? "bg-green-50" : "bg-amber-50")}>{match.confidence} Confidence</Badge>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10 space-y-3">
                                            <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
                                            <p className="text-sm font-medium text-muted-foreground">No automatic node matches found.</p>
                                            <p className="text-xs text-muted-foreground italic">No Ogeemo records match this amount and date.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                    <Button variant="ghost" onClick={() => setTransactionToReconcile(null)} className="h-12 px-6 font-bold">Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {commonDialogs}
    </div>
  );
}
