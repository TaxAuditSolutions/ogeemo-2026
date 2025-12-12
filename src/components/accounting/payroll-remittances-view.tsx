
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  FileText,
  Landmark,
  MoreVertical,
  CheckCircle,
  Clock,
  PlusCircle,
  LoaderCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getRemittances, addRemittance, updateRemittance, deleteRemittance, type PayrollRemittance } from '@/services/payroll-service';
import { addExpenseTransaction } from '@/services/accounting-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle } from '../ui/alert-dialog';


const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

const emptyRemittanceForm = {
    payPeriodStart: '',
    payPeriodEnd: '',
    dueDate: '',
    amount: '',
};

export function PayrollRemittancesView() {
  const [remittances, setRemittances] = useState<PayrollRemittance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState(emptyRemittanceForm);
  const [remittanceToDelete, setRemittanceToDelete] = useState<PayrollRemittance | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadRemittances();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadRemittances = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const data = await getRemittances(user.uid);
        setRemittances(data);
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load remittances.' });
    } finally {
        setIsLoading(false);
    }
  };

  const { totalRemitted, amountDue } = useMemo(() => {
    const totalRemitted = remittances.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.amount, 0);
    const amountDue = remittances.filter(r => r.status === 'Due').reduce((sum, r) => sum + r.amount, 0);
    return { totalRemitted, amountDue };
  }, [remittances]);

  const handleOpenForm = () => {
    setFormState(emptyRemittanceForm);
    setIsFormOpen(true);
  };
  
  const handleSaveRemittance = async () => {
    if (!user) return;
    const amountNum = parseFloat(formState.amount);
    if (!formState.payPeriodStart || !formState.payPeriodEnd || !formState.dueDate || !formState.amount || isNaN(amountNum) || amountNum <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields correctly.' });
        return;
    }
    
    try {
        const newRemittance = await addRemittance({
            ...formState,
            amount: amountNum,
            status: 'Due',
            userId: user.uid,
        });
        setRemittances(prev => [newRemittance, ...prev].sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
        toast({ title: 'Remittance Added' });
        setIsFormOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };
  
  const handleMarkAsPaid = async (remittance: PayrollRemittance) => {
    if (!user) return;
    const originalRemittances = [...remittances];
    const updatedRemittance = { ...remittance, status: 'Paid' as const, paidDate: format(new Date(), 'yyyy-MM-dd') };
    setRemittances(prev => prev.map(r => r.id === remittance.id ? updatedRemittance : r));

    try {
        await updateRemittance(remittance.id, { status: 'Paid', paidDate: format(new Date(), 'yyyy-MM-dd') });
        await addExpenseTransaction({
            date: format(new Date(), 'yyyy-MM-dd'),
            company: 'Canada Revenue Agency',
            description: `Payroll remittance for ${format(new Date(remittance.payPeriodStart), 'PP')} - ${format(new Date(remittance.payPeriodEnd), 'PP')}`,
            totalAmount: remittance.amount,
            category: '9060', // CRA line for Salaries, wages, and benefits
            type: 'business',
            userId: user.uid,
        });
        toast({ title: 'Payment Recorded', description: 'An expense transaction has been created.' });
    } catch (error: any) {
        setRemittances(originalRemittances);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not mark remittance as paid.' });
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!remittanceToDelete || !user) return;
    const originalRemittances = [...remittances];
    setRemittances(prev => prev.filter(r => r.id !== remittanceToDelete.id));

    try {
        await deleteRemittance(remittanceToDelete.id);
        toast({ title: 'Remittance Deleted' });
    } catch (error: any) {
        setRemittances(originalRemittances);
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setRemittanceToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <AccountingPageHeader pageTitle="Payroll Remittances" />
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Payroll Remittances
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Track and manage your payroll source deduction remittances to the
            CRA.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Remitted (YTD)</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRemitted)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Amount Due</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(amountDue)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Remittance History</CardTitle>
            <Button variant="outline" onClick={handleOpenForm}><PlusCircle className="mr-2 h-4 w-4"/> Add Remittance</Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Remittance Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {remittances.map((remittance) => (
                    <TableRow key={remittance.id}>
                        <TableCell className="font-medium">
                        {format(new Date(remittance.payPeriodStart), 'PP')} - {format(new Date(remittance.payPeriodEnd), 'PP')}
                        </TableCell>
                        <TableCell>
                        {format(new Date(remittance.dueDate), 'PP')}
                        </TableCell>
                        <TableCell>
                        <Badge variant={ remittance.status === 'Paid' ? 'secondary' : 'destructive'}>
                            {remittance.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                        {formatCurrency(remittance.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={remittance.status === 'Paid'} onSelect={() => handleMarkAsPaid(remittance)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => setRemittanceToDelete(remittance)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Remittance Liability</DialogTitle>
                <DialogDescription>Record a new remittance that is due to be paid.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="pay-period-start">Pay Period Start</Label>
                        <Input id="pay-period-start" type="date" value={formState.payPeriodStart} onChange={e => setFormState(p => ({...p, payPeriodStart: e.target.value}))}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="pay-period-end">Pay Period End</Label>
                        <Input id="pay-period-end" type="date" value={formState.payPeriodEnd} onChange={e => setFormState(p => ({...p, payPeriodEnd: e.target.value}))}/>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="due-date">Remittance Due Date</Label>
                    <Input id="due-date" type="date" value={formState.dueDate} onChange={e => setFormState(p => ({...p, dueDate: e.target.value}))}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="amount">Amount Due</Label>
                    <Input id="amount" type="number" placeholder="0.00" value={formState.amount} onChange={e => setFormState(p => ({...p, amount: e.target.value}))}/>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveRemittance}>Add Liability</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!remittanceToDelete} onOpenChange={() => setRemittanceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this remittance record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
