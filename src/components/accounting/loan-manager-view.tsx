
'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Pencil, Trash2, LoaderCircle, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/context/auth-context";
import { getLoans, addLoan, updateLoan, deleteLoan, type Loan } from "@/services/accounting-service";
import { format } from "date-fns";

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const emptyLoanForm = {
    loanType: 'payable' as 'payable' | 'receivable',
    counterparty: '',
    originalAmount: '',
    outstandingBalance: '',
    interestRate: '',
    termMonths: '',
    monthlyPayment: '',
    startDate: '',
};

export function LoanManagerView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [formData, setFormData] = useState(emptyLoanForm);

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const fetchedLoans = await getLoans(user.uid);
        setLoans(fetchedLoans);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to load loans", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { loansPayable, loansReceivable, totalPayable, totalReceivable } = useMemo(() => {
    const payables = loans.filter(l => l.loanType === 'payable');
    const receivables = loans.filter(l => l.loanType === 'receivable');
    return {
        loansPayable: payables,
        loansReceivable: receivables,
        totalPayable: payables.reduce((sum, l) => sum + l.outstandingBalance, 0),
        totalReceivable: receivables.reduce((sum, l) => sum + l.outstandingBalance, 0),
    };
  }, [loans]);

  const handleOpenDialog = (loan?: Loan) => {
    if (loan) {
        setLoanToEdit(loan);
        setFormData({
            ...loan,
            originalAmount: String(loan.originalAmount),
            outstandingBalance: String(loan.outstandingBalance),
            interestRate: String(loan.interestRate || ''),
            termMonths: String(loan.termMonths || ''),
            monthlyPayment: String(loan.monthlyPayment || ''),
        });
    } else {
        setLoanToEdit(null);
        setFormData(emptyLoanForm);
    }
    setIsFormOpen(true);
  };
  
  const handleSave = async () => {
    if (!user) return;
    const { loanType, counterparty, originalAmount, outstandingBalance, startDate, interestRate, termMonths, monthlyPayment } = formData;
    
    if (!counterparty.trim() || !originalAmount || !outstandingBalance || !startDate) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all required fields.' });
        return;
    }
    
    const dataToSave = {
        loanType,
        counterparty: counterparty.trim(),
        originalAmount: parseFloat(originalAmount),
        outstandingBalance: parseFloat(outstandingBalance),
        startDate,
        interestRate: parseFloat(interestRate) || 0,
        termMonths: parseInt(termMonths) || 0,
        monthlyPayment: parseFloat(monthlyPayment) || 0,
    };

    try {
        if (loanToEdit) {
            await updateLoan(loanToEdit.id, dataToSave);
            setLoans(prev => prev.map(l => l.id === loanToEdit.id ? { ...loanToEdit, ...dataToSave } : l));
            toast({ title: 'Loan Updated' });
        } else {
            const newLoan = await addLoan({ ...dataToSave, userId: user.uid });
            setLoans(prev => [newLoan, ...prev]);
            toast({ title: 'Loan Added' });
        }
        setIsFormOpen(false);
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!loanToDelete) return;
    try {
        await deleteLoan(loanToDelete.id);
        setLoans(prev => prev.filter(l => l.id !== loanToDelete.id));
        toast({ title: 'Loan Deleted', variant: 'destructive' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setLoanToDelete(null);
    }
  };

  const renderLoanTable = (loanData: Loan[], type: 'Payable' | 'Receivable') => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                {type === 'Payable' ? <TrendingDown className="h-5 w-5 text-red-500" /> : <TrendingUp className="h-5 w-5 text-green-500" />}
                Loans {type}
            </CardTitle>
            <CardDescription>
                {type === 'Payable' ? 'Money your business owes to others.' : 'Money others owe to your business.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{type === 'Payable' ? 'Lender' : 'Borrower'}</TableHead>
                        <TableHead className="text-right">Original Amount</TableHead>
                        <TableHead className="text-right">Outstanding Balance</TableHead>
                        <TableHead className="text-right">Interest Rate</TableHead>
                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loanData.length > 0 ? loanData.map(loan => (
                        <TableRow key={loan.id}>
                            <TableCell className="font-medium">{loan.counterparty}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(loan.originalAmount)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(loan.outstandingBalance)}</TableCell>
                            <TableCell className="text-right">{loan.interestRate || 0}%</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => handleOpenDialog(loan)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setLoanToDelete(loan)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No loans of this type recorded.</TableCell></TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2} className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold font-mono">{formatCurrency(type === 'Payable' ? totalPayable : totalReceivable)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </CardContent>
    </Card>
  );

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Loan Manager" />
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">Loan Manager</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Track your business's loans, both payable and receivable.
          </p>
        </header>

        <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Loan
            </Button>
        </div>

        {isLoading ? <div className="flex justify-center h-48 items-center"><LoaderCircle className="h-8 w-8 animate-spin"/></div> : (
            <div className="grid grid-cols-1 gap-6">
                {renderLoanTable(loansPayable, 'Payable')}
                {renderLoanTable(loansReceivable, 'Receivable')}
            </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{loanToEdit ? 'Edit Loan' : 'Add New Loan'}</DialogTitle>
                <DialogDescription>
                    Enter the details of the loan. Required fields are marked with <span className="text-destructive">*</span>
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Loan Type <span className="text-destructive">*</span></Label>
                    <RadioGroup value={formData.loanType} onValueChange={(v) => setFormData(p => ({...p, loanType: v as 'payable' | 'receivable'}))} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="payable" id="type-payable"/><Label htmlFor="type-payable">Payable (You owe money)</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="receivable" id="type-receivable"/><Label htmlFor="type-receivable">Receivable (Owed to you)</Label></div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="counterparty">{formData.loanType === 'payable' ? 'Lender' : 'Borrower'} <span className="text-destructive">*</span></Label>
                    <Input id="counterparty" value={formData.counterparty} onChange={e => setFormData(p => ({...p, counterparty: e.target.value}))} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="originalAmount">Original Amount <span className="text-destructive">*</span></Label>
                        <Input id="originalAmount" type="number" placeholder="0.00" value={formData.originalAmount} onChange={e => setFormData(p => ({...p, originalAmount: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="outstandingBalance">Outstanding Balance <span className="text-destructive">*</span></Label>
                        <Input id="outstandingBalance" type="number" placeholder="0.00" value={formData.outstandingBalance} onChange={e => setFormData(p => ({...p, outstandingBalance: e.target.value}))} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
                    <Input id="startDate" type="date" value={formData.startDate} onChange={e => setFormData(p => ({...p, startDate: e.target.value}))} />
                </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="interestRate">Interest Rate (%)</Label>
                        <Input id="interestRate" type="number" placeholder="0.0" value={formData.interestRate} onChange={e => setFormData(p => ({...p, interestRate: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="termMonths">Term (Months)</Label>
                        <Input id="termMonths" type="number" placeholder="0" value={formData.termMonths} onChange={e => setFormData(p => ({...p, termMonths: e.target.value}))} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="monthlyPayment">Monthly Payment</Label>
                        <Input id="monthlyPayment" type="number" placeholder="0.00" value={formData.monthlyPayment} onChange={e => setFormData(p => ({...p, monthlyPayment: e.target.value}))} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Loan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!loanToDelete} onOpenChange={() => setLoanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the loan record for "{loanToDelete?.counterparty}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
