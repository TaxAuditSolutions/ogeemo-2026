'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    ArrowUpDown,
    ArrowUpZA,
    ArrowDownAZ
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
    deleteIncomeTransaction, 
    type IncomeTransaction, 
    getExpenseTransactions, 
    deleteExpenseTransaction, 
    type ExpenseTransaction, 
    getInvoices,
    getPayableBills,
    type Invoice,
    type PayableBill,
    getCompanies, 
    getExpenseCategories, 
    getIncomeCategories, 
    type Company, 
    type ExpenseCategory, 
    type IncomeCategory,
    type TaxType,
    getTaxTypes,
    getInternalAccounts,
    addInternalAccount,
    deleteInternalAccount,
    type InternalAccount
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
import { CustomCalendar } from '../ui/custom-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><LoaderCircle className="h-10 w-10 animate-spin text-white" /></div>,
});

type BankTransaction = {
  id: string;
  accountId: string;
  date: string;
  transactionType: string;
  name: string;
  memo: string;
  amount: number;
};

const initialBankTransactions: BankTransaction[] = [
  { id: 'txn_b_1', accountId: 'acc_1', date: '2024-07-25', transactionType: 'ACH', name: 'Client Alpha', memo: 'Invoice #1001 payment', amount: 5000 },
  { id: 'txn_b_2', accountId: 'acc_1', date: '2024-07-25', transactionType: 'DEBIT', name: 'Cloud Hosting Inc.', memo: 'Monthly server fee', amount: -150 },
  { id: 'txn_b_3', accountId: 'acc_1', date: '2024-07-24', transactionType: 'TRANSFER', name: 'Stripe Payout', memo: 'Merchant settle', amount: 850.75 },
  { id: 'txn_b_4', accountId: 'acc_1', date: '2024-07-23', transactionType: 'DEBIT', name: 'SaaS Tools Co.', memo: 'Subscription', amount: -75.99 },
  { id: 'txn_b_5', accountId: 'acc_1', date: '2024-07-22', transactionType: 'XFER', name: 'Self Transfer', memo: 'To savings', amount: -10000 },
  { id: 'txn_b_6', accountId: 'acc_1', date: '2024-07-21', transactionType: 'DEBIT', name: 'Shell Oil', memo: 'Fuel', amount: -55.45 },
];

const emptyAccountForm = {
    name: '',
    bankName: '',
    businessType: 'Business' as "Business" | "Personal",
    institutionNumber: '',
    transitNumber: '',
    accountNumber: '',
};

export function BankStatementsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get('accountId');

  const [accounts, setAccounts] = React.useState<InternalAccount[]>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = React.useState(false);
  const [newAccount, setNewAccount] = React.useState(emptyAccountForm);
  
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [bankTransactions, setBankTransactions] = React.useState<BankTransaction[]>(initialBankTransactions);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [taxTypes, setTaxTypes] = React.useState<TaxType[]>([]);

  const [sortConfig, setSortConfig] = React.useState<{ key: keyof BankTransaction; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  const [searchQuery, setSearchQuery] = React.useState("");

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
        const [fetchedAccounts, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories, fetchedFolders, fetchedIndustries, fetchedContacts, fetchedTaxTypes] = await Promise.all([
            getInternalAccounts(user.uid),
            getCompanies(user.uid),
            getExpenseCategories(user.uid),
            getIncomeCategories(user.uid),
            getContactFolders(user.uid),
            getIndustries(user.uid),
            getContacts(),
            getTaxTypes(user.uid)
        ]);
        setAccounts(fetchedAccounts);
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

  const requestSort = (key: keyof BankTransaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const { selectedAccount, transactions, totalDebits, totalCredits, netDifference } = React.useMemo(() => {
    const acc = accounts.find(a => a.id === accountIdParam);
    let txs = bankTransactions.filter(txn => txn.accountId === accountIdParam);
    
    if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        txs = txs.filter(t => 
            t.name.toLowerCase().includes(term) || 
            t.memo.toLowerCase().includes(term) || 
            t.transactionType.toLowerCase().includes(term) ||
            t.amount.toFixed(2).includes(term) ||
            Math.abs(t.amount).toFixed(2).includes(term)
        );
    }

    const debits = txs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
    const credits = txs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const diff = credits + debits;

    if (sortConfig) {
        txs = [...txs].sort((a, b) => {
            let aValue: any = a[sortConfig.key];
            let bValue: any = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    return { 
        selectedAccount: acc,
        transactions: txs, 
        totalDebits: Math.abs(debits),
        totalCredits: credits,
        netDifference: diff
    };
  }, [bankTransactions, accountIdParam, accounts, sortConfig, searchQuery]);

  const handlePlaidContinue = () => {
    setIsLinkDialogOpen(false);
    toast({
        title: "Connecting to Plaid...",
        description: "In a real application, the secure Plaid Link flow would start now."
    });
  };

  const handleOpenNewAccountDialog = () => {
      setNewAccount(emptyAccountForm);
      setIsNewAccountOpen(true);
  };

  const handleSaveNewAccount = async () => {
      if (!user) return;
      if (!newAccount.name || !newAccount.bankName || !newAccount.institutionNumber || !newAccount.transitNumber || !newAccount.accountNumber) {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all identification fields.' });
          return;
      }
      
      try {
          const accountData: Omit<InternalAccount, 'id'> = {
              name: newAccount.name,
              bankName: newAccount.bankName,
              businessType: newAccount.businessType,
              institutionNumber: newAccount.institutionNumber,
              transitNumber: newAccount.transitNumber,
              accountNumber: newAccount.accountNumber,
              type: 'Bank',
              userId: user.uid,
          };
          const savedAccount = await addInternalAccount(accountData);
          setAccounts(prev => [...prev, savedAccount]);
          setIsNewAccountOpen(false);
          toast({ title: 'Account Registered', description: 'New account node is ready for ingestion.' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
      }
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
            };
        });
        
        setBankTransactions(prev => [...newTxns, ...prev]);
        toast({ title: 'Statement Ingested', description: `Detected ${newTxns.length} new signals in the CSV.` });
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

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
                                "Reconcile your primary chequing account at least once a week. It takes 5 minutes but saves 5 days of stress during tax season."
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
                        <div className="space-y-2"><Label>Account Nickname</Label><Input value={newAccount.name} onChange={e => setNewAccount(p => ({...p, name: e.target.value}))} placeholder="e.g., Primary Chequing" /></div>
                        <div className="space-y-2"><Label>Bank Name</Label><Input value={newAccount.bankName} onChange={e => setNewAccount(p => ({...p, bankName: e.target.value}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categorization</Label>
                            <Select value={newAccount.businessType} onValueChange={(v: any) => setNewAccount(p => ({...p, businessType: v}))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Business">Business Operations</SelectItem>
                                    <SelectItem value="Personal">Personal Identity</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
        <div className="p-4 sm:p-6 space-y-6 text-black min-h-full bg-muted/5">
            <AccountingPageHeader pageTitle="Bank Accounts" />
            <header className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Financial Registry</h1>
                    <Button variant="ghost" size="icon" className="mt-1" onClick={() => setIsInfoDialogOpen(true)}>
                        <Info className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    Select a secure cloud node to begin reviewing external financial signals.
                </p>
            </header>

            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Connected Accounts</CardTitle>
                            <CardDescription>Review external transactions before matching them in the General Ledger.</CardDescription>
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
                        {accounts.map(account => (
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
                                        <p className="text-xs text-muted-foreground">{account.bankName} • Ending in: {account.accountNumber?.slice(-4)}</p>
                                        <Badge variant={account.businessType === 'Business' ? 'default' : 'secondary'} className="text-[10px] uppercase">{account.businessType || 'N/A'}</Badge>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] uppercase font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
                                            View Activity <ArrowRight className="h-3 w-3" />
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {accounts.length === 0 && !isLoadingData && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl opacity-40">
                                <Landmark className="h-12 w-12 mx-auto mb-2" />
                                <p className="font-bold">No accounts registered.</p>
                                <p className="text-xs">Click "Add Registry Node" to establish your first connection.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Zap className="h-4 w-4" /> High-Fidelity Mirror
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Review external bank signals directly in Ogeemo. These records provide the physical world proof for your audit trail.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> GL-First Workflow
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Use this hub for information only. The act of reconciliation occurs in the General Ledger to ensure professional node parity.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Bot className="h-4 w-4" /> Data Triage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Ingest CSV statements or link via Plaid to build your Black Box of Evidence without redundant manual entry.
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
        <AccountingPageHeader pageTitle="Bank Statement" />
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleBackToAccounts} className="h-10">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="text-left">
                    <h1 className="text-3xl font-bold font-headline text-primary leading-none uppercase tracking-tight">Bank Statement</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        {selectedAccount?.name} • {selectedAccount?.bankName} • Ending in: {selectedAccount?.accountNumber?.slice(-4)}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-10 font-bold border-primary text-primary hover:bg-primary/5">
                    <Upload className="mr-2 h-4 w-4" /> Upload CSV Statement
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                <Button asChild variant="ghost" size="icon" className="h-10 w-10">
                    <Link href="/action-manager"><X className="h-5 w-5" /></Link>
                </Button>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Discovery Terminal</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search names, memos, or amount..." 
                        className="h-11 pl-10 bg-white border-black/20 focus-visible:ring-primary shadow-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="md:col-span-3 grid grid-cols-3 gap-3">
                <Card className="bg-red-50/50 border-red-100 shadow-sm py-2 px-4 border-2">
                    <p className="text-[9px] uppercase font-bold text-red-600 tracking-[0.2em] mb-0.5 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Total Debits
                    </p>
                    <p className="font-mono font-bold text-red-600 text-lg">({formatCurrency(totalDebits)})</p>
                </Card>
                <Card className="bg-green-50/50 border-green-100 shadow-sm py-2 px-4 border-2">
                    <p className="text-[9px] uppercase font-bold text-green-600 tracking-[0.2em] mb-0.5 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Total Credits
                    </p>
                    <p className="font-mono font-bold text-green-600 text-lg">{formatCurrency(totalCredits)}</p>
                </Card>
                <Card className="bg-primary/5 border-primary/10 shadow-sm py-2 px-4 border-2">
                    <p className="text-[9px] uppercase font-bold text-primary tracking-[0.2em] mb-0.5 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Net Activity
                    </p>
                    <p className={cn("font-mono font-bold text-lg", netDifference >= 0 ? "text-primary" : "text-destructive")}>
                        {netDifference >= 0 ? '+' : ''}{formatCurrency(netDifference)}
                    </p>
                </Card>
            </div>
        </div>

        <Card className="shadow-2xl overflow-hidden border-black">
            <CardHeader className="bg-muted/10 border-b py-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    External Transaction Mirror (Information Only)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-b-black">
                            <TableHead className="p-0 w-32">
                                <Button variant="ghost" onClick={() => requestSort('date')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Date {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0 w-32">
                                <Button variant="ghost" onClick={() => requestSort('transactionType')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Type {sortConfig?.key === 'transactionType' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0">
                                <Button variant="ghost" onClick={() => requestSort('name')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Counterparty {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0">
                                <Button variant="ghost" onClick={() => requestSort('memo')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Memo / Details {sortConfig?.key === 'memo' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0 text-right w-40">
                                <Button variant="ghost" onClick={() => requestSort('amount')} className="h-full w-full justify-end px-4 font-bold hover:bg-muted/50 rounded-none pr-8">
                                    Amount {sortConfig?.key === 'amount' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(txn => (
                        <TableRow key={txn.id} className="border-b-black/10 group">
                          <TableCell className="text-xs font-bold font-mono pl-4">{txn.date}</TableCell>
                          <TableCell className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">{txn.transactionType}</TableCell>
                          <TableCell className="font-bold text-sm">{txn.name}</TableCell>
                          <TableCell className="text-xs italic text-muted-foreground truncate max-w-xs">{txn.memo}</TableCell>
                          <TableCell className={cn("text-right font-mono font-black text-lg pr-8", txn.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                              {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={5} className="h-64 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                      <Search className="h-12 w-12" />
                                      <div className="space-y-1">
                                          <p className="font-bold">{searchQuery ? 'No matching records found.' : 'No signals ingested.'}</p>
                                          <p className="text-xs">{searchQuery ? 'Try a different search term or amount.' : 'Upload a CSV statement to begin reviewing activity.'}</p>
                                      </div>
                                  </div>
                              </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-3 justify-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.3em]">Operational Node: {selectedAccount?.id} • Evidence Mirror</p>
            </CardFooter>
        </Card>
        {commonDialogs}
    </div>
  );
}
