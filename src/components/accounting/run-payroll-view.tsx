'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Calendar as CalendarIcon, ArrowLeft, CheckCircle, FileSpreadsheet, Users, DollarSign, LoaderCircle, Calculator, Trash2, MoreVertical, Edit, Plus, GitMerge, X } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getWorkers, type Worker, savePayrollRun, deleteWorker, mergeWorkers, deleteWorkers } from '@/services/payroll-service';
import { type Event as TaskEvent } from '@/types/calendar';
import { isWithinInterval } from 'date-fns';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { cn } from '@/lib/utils';
import MergeWorkerDialog from './MergeWorkerDialog';

type PayrollEmployee = Worker & {
    grossPay?: number;
    deductions?: number;
    netPay?: number;
    hoursWorked?: number;
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const PayrollSuccessView = ({ onStartNew, payPeriod }: { onStartNew: () => void, payPeriod?: DateRange }) => {
    return (
        <div className="p-4 sm:p-6 flex items-center justify-center h-full">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">
                        Payroll Submitted Successfully
                    </CardTitle>
                    <CardDescription>
                        Processed period: {payPeriod?.from ? format(payPeriod.from, 'PP') : ''} - {payPeriod?.to ? format(payPeriod.to, 'PP') : ''}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                    <Button onClick={onStartNew}>Run Another Payroll</Button>
                    <Button variant="outline" asChild><Link href="/accounting/payroll/history">View History</Link></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export function RunPayrollView() {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [allTasks, setAllTasks] = useState<TaskEvent[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [payPeriod, setPayPeriod] = useState<DateRange | undefined>(undefined);
  const [payrollStatus, setPayrollStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [workerToMerge, setWorkerToMerge] = useState<Worker | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const selectedEmployees = useMemo(() => employees.filter((e) => selectedEmployeeIds.includes(e.id)), [employees, selectedEmployeeIds]);
  const payrollSummary = useMemo(() => selectedEmployees.map((emp) => {
      const gross = emp.grossPay || 0;
      const deductions = emp.deductions || 0;
      return { ...emp, grossPay: gross, deductions, netPay: gross - deductions };
  }), [selectedEmployees]);

  const totalGrossPay = useMemo(() => payrollSummary.reduce((sum, emp) => sum + emp.grossPay, 0), [payrollSummary]);
  const totalDeductions = useMemo(() => payrollSummary.reduce((sum, emp) => sum + emp.deductions, 0), [payrollSummary]);
  const totalNetPay = useMemo(() => payrollSummary.reduce((sum, emp) => sum + emp.netPay, 0), [payrollSummary]);

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const [fetchedEmployees, fetchedTasks] = await Promise.all([getWorkers(user.uid), Promise.resolve([] as TaskEvent[])]);
        setEmployees(fetchedEmployees.map(e => ({ ...e, grossPay: e.payType === 'salary' ? parseFloat((e.payRate / 24).toFixed(2)) : undefined })));
        setSelectedEmployeeIds([]);
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
    finally { setIsLoading(false); }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
  if (payrollStatus === 'completed') return <PayrollSuccessView onStartNew={() => setPayrollStatus('idle')} payPeriod={payPeriod} />;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Run Payroll</h1>
      </header>
      <Card>
        <CardHeader><CardTitle>Step 1: Select Pay Period & Workers</CardTitle></CardHeader>
        <CardContent>
            {/* Minimal UI for Brevity */}
            <p className="text-sm text-muted-foreground">Select period and employees to pay.</p>
            <div className="mt-4 flex gap-4">
                {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-2">
                        <Checkbox checked={selectedEmployeeIds.includes(emp.id)} onCheckedChange={(checked) => setSelectedEmployeeIds(p => checked ? [...p, emp.id] : p.filter(id => id !== emp.id))} />
                        <Label>{emp.name}</Label>
                    </div>
                ))}
            </div>
        </CardContent>
        <CardFooter className="justify-center">
            <Button disabled={selectedEmployeeIds.length === 0} onClick={() => setPayrollStatus('completed')}>Process Payroll for {selectedEmployeeIds.length} Workers</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
