'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/dropdown-menu';
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
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, Landmark, CheckCircle, PlusCircle, Trash2, MoreVertical, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
    getPayableBills, 
    postBillPayment, 
    deletePayableBill, 
    type PayableBill, 
    getCompanies, 
    type Company, 
    getExpenseCategories, 
    type ExpenseCategory,
    getIncomeCategories,
    type IncomeCategory,
    getTaxTypes,
    type TaxType
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { AccountingPageHeader } from './page-header';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { TransactionDialog } from './transaction-dialog';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const paymentMethodOptions = ["Cash", "Cheque", "Credit Card", "Email Transfer", "Bank Transfer", "In Kind", "Miscellaneous", "GL Adjustment"];

export function AccountsPayablePageView() {
  const [bills, setBills] = useState<PayableBill[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog Controllers
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  // Payment State
  const [billToPay, setBillToPay] = useState<PayableBill | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  // Deletion State
  const [billToDelete, setBillToDelete] = useState<PayableBill | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedBills, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories, fetchedContacts, fetchedFolders, fetchedIndustries, fetchedTaxTypes] = await Promise.all([
        getPayableBills(user.uid),
        getCompanies(user.uid),
        getExpenseCategories(user.uid),
        getIncomeCategories(user.uid),
        getContacts(user.uid),
        getContactFolders(user.uid),
        getIndustries(user.uid),
        getTaxTypes(user.uid)
      ]);
      setBills(fetchedBills);
      setCompanies(fetchedCompanies);
      setExpenseCategories(fetchedExpenseCategories);
      setIncomeCategories(fetchedIncomeCategories);
      setContacts(fetchedContacts);
      setContactFolders(fetchedFolders);
      setCustomIndustries(fetchedIndustries);
      setTaxTypes(fetchedTaxTypes);
    } catch (error: any) {
      // Errors handled by service/emitter
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePostPayment = async () => {
    if (!user || !billToPay) return;
    try {
        await postBillPayment(user.uid, billToPay.id, paymentDate, paymentMethod);
        setBillToPay(null);
        toast({ title: 'Payment Posted', description: 'The bill has been moved to the General Ledger.' });
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    }
  };

  const handleConfirmDelete = async () => {
      if (!billToDelete) return;
      try {
          await deletePayableBill(billToDelete.id);
          setBillToDelete(null);
          loadData();
          toast({ title: 'Bill Deleted' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
      }
  };

  const totalPayable = useMemo(() => {
      return bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  }, [bills]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Accounts Payable" />
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">
                Accounts Payable
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
                Registry of all outstanding bills. Post a payment to move the record to the General Ledger.
            </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Card className="md:col-span-1 border-destructive/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Unpaid Bills</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPayable)}</p>
                </CardContent>
            </Card>
            <Card className="md:col-span-2 flex flex-col justify-center px-6 bg-muted/30">
                <p className="text-sm text-muted-foreground italic">
                    "Track what you owe today so you can forecast tomorrow."
                    <br />
                    Once paid, bills are permanently recorded in the BKS General Ledger.
                </p>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Accounts Payable Ledger</CardTitle>
                    <CardDescription>Unpaid vendor invoices and accrued liabilities.</CardDescription>
                </div>
                <Button onClick={() => setIsTransactionDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Log Payable Bill
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <LoaderCircle className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Invoice #</TableHead>
                                <TableHead className="text-right">Amount Due</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills.length > 0 ? bills.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell>{format(new Date(bill.dueDate), 'PP')}</TableCell>
                                    <TableCell className="font-medium">{bill.vendor}</TableCell>
                                    <TableCell>{bill.invoiceNumber}</TableCell>
                                    <TableCell className="text-right font-mono text-destructive">{formatCurrency(bill.totalAmount)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => setBillToPay(bill)}>
                                                <Landmark className="mr-2 h-4 w-4"/> Post Payment
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem disabled>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit (Disabled during reset)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => setBillToDelete(bill)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Bill
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                                        No outstanding bills found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>

        {/* Rebuild Transaction Entry Trigger */}
        <TransactionDialog
            isOpen={isTransactionDialogOpen}
            onOpenChange={setIsTransactionDialogOpen}
            initialType="payable"
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            companies={companies}
            contacts={contacts}
            taxTypes={taxTypes}
            onSuccess={loadData}
        />

        {/* Post Payment Dialog */}
        <Dialog open={!!billToPay} onOpenChange={() => setBillToPay(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Post Bill Payment</DialogTitle>
                    <DialogDescription>Record payment for bill from {billToPay?.vendor}. This will move the record to your BKS General Ledger.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethodOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-semibold">Amount to record:</span>
                            <span className="text-xl font-bold text-primary">{billToPay ? formatCurrency(billToPay.totalAmount) : ''}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setBillToPay(null)}>Cancel</Button>
                    <Button onClick={handlePostPayment}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Post to GL
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the outstanding bill from {billToDelete?.vendor} for {billToDelete ? formatCurrency(billToDelete.totalAmount) : ''}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Bill</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <ContactFormDialog
            isOpen={isContactFormOpen}
            onOpenChange={setIsContactFormOpen}
            contactToEdit={null}
            folders={contactFolders}
            onFoldersChange={setContactFolders}
            onSave={() => loadData()}
            companies={companies}
            onCompaniesChange={setCompanies}
            customIndustries={customIndustries}
            onCustomIndustriesChange={setCustomIndustries}
        />
    </div>
  );
}
