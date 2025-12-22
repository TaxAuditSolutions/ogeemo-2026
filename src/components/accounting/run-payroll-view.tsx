
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  CheckCircle,
  FileSpreadsheet,
  Users,
  DollarSign,
  LoaderCircle,
  Calculator,
  Trash2,
  MoreVertical,
  Edit,
  Plus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { getWorkers, type Worker, savePayrollRun, deleteWorker, addWorker, updateWorker, deleteWorkers } from '@/services/payroll-service';
import { getTasksForUser, type Event as TaskEvent } from '@/services/project-service';
import { useRouter } from 'next/navigation';
import { WorkerFormDialog } from './WorkerFormDialog';
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
                        The payroll for the period of{' '}
                        {payPeriod?.from ? format(payPeriod.from, 'LLL dd, y') : ''} to{' '}
                        {payPeriod?.to ? format(payPeriod.to, 'LLL dd, y') : ''} has been processed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-left p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-semibold mb-2">What Happened:</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>A new payroll run record has been saved to your history.</li>
                            <li>Expense transactions for each employee's gross pay have been posted to your ledger.</li>
                            <li>A new liability for payroll remittances has been created.</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                    <Button onClick={onStartNew}>Run Another Payroll</Button>
                    <Button variant="outline" asChild>
                        <Link href="/accounting/payroll/history">View Payroll History</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/accounting/payroll">Back to Payroll Hub</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export function RunPayrollView() {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [allTasks, setAllTasks] = useState<TaskEvent[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [payPeriod, setPayPeriod] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const [payrollStatus, setPayrollStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);


  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const hasStartedTimerRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const [fetchedEmployees, fetchedTasks] = await Promise.all([
            getWorkers(user.uid),
            getTasksForUser(user.uid)
        ]);
        setAllTasks(fetchedTasks);
        setEmployees(fetchedEmployees.map(e => ({
            ...e,
            grossPay: e.payType === 'salary' ? parseFloat((e.payRate / 24).toFixed(2)) : undefined,
        })));
        setSelectedEmployeeIds([]);
    } catch (error) {
        console.error("Failed to load payroll data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load employee or task data.' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const selectedEmployees = useMemo(() => {
    return employees.filter((e) => selectedEmployeeIds.includes(e.id));
  }, [employees, selectedEmployeeIds]);

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };
  
  const handleCalculateHours = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || employee.payType !== 'hourly' || !payPeriod?.from || !payPeriod?.to) return;
    
    const tasksInPeriod = allTasks.filter(task =>
        task.workerId === employeeId &&
        task.start &&
        isWithinInterval(new Date(task.start), { start: payPeriod.from!, end: payPeriod.to! })
    );

    const totalSeconds = tasksInPeriod.reduce((sum, task) => sum + (task.duration || 0), 0);
    const totalHours = totalSeconds / 3600;

    const grossPay = totalHours * employee.payRate;

    setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, hoursWorked: totalHours, grossPay: parseFloat(grossPay.toFixed(2)) } : emp));
    toast({ title: "Hours Calculated", description: `${totalHours.toFixed(2)} hours logged for ${employee.name}.` });
  };


  const handlePayValueChange = (employeeId: string, field: 'grossPay' | 'deductions', value: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === employeeId) {
          const numberValue = value === '' ? undefined : parseFloat(value);
          const updatedEmp = { ...emp, [field]: numberValue };
          
          const gross = updatedEmp.grossPay || 0;
          const deductions = updatedEmp.deductions || 0;
          updatedEmp.netPay = gross - deductions;
          
          return updatedEmp;
        }
        return emp;
      })
    );
  };

  const payrollSummary = useMemo(() => {
    return selectedEmployees.map((emp) => {
      const grossPay = emp.grossPay || 0;
      const deductions = emp.deductions || 0;
      const netPay = grossPay - deductions;
      return { ...emp, grossPay, deductions, netPay };
    });
  }, [selectedEmployees]);

  const totalGrossPay = useMemo(() => payrollSummary.reduce((sum, emp) => sum + emp.grossPay, 0), [payrollSummary]);
  const totalDeductions = useMemo(() => payrollSummary.reduce((sum, emp) => sum + emp.deductions, 0), [payrollSummary]);
  const totalNetPay = useMemo(() => payrollSummary.reduce((sum, emp) => sum + emp.netPay, 0), [payrollSummary]);
  
  const handleRunPayroll = async () => {
    if (!user || !payPeriod?.from || !payPeriod.to || selectedEmployees.length === 0) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a pay period and at least one employee.'});
      return;
    }

    setPayrollStatus('processing');
    try {
        await savePayrollRun({
            userId: user.uid,
            payPeriodStart: payPeriod.from,
            payPeriodEnd: payPeriod.to,
            payDate: new Date(),
            totalGrossPay,
            totalDeductions,
            totalNetPay,
            employeeCount: selectedEmployees.length,
            details: selectedEmployees.map(emp => ({
                employeeId: emp.id,
                employeeName: emp.name,
                grossPay: emp.grossPay || 0,
                deductions: emp.deductions || 0,
                netPay: emp.netPay || 0,
            })),
        });

      setPayrollStatus('completed');
      toast({
        title: 'Payroll Submitted',
        description: `Payroll for ${selectedEmployees.length} employees has been processed.`,
      });
    } catch (error: any) {
        setPayrollStatus('idle');
        toast({ variant: 'destructive', title: 'Payroll Failed', description: error.message });
    }
  };
  
    const handleOpenWorkerForm = (worker: Worker | null) => {
        setWorkerToEdit(worker);
        setIsWorkerFormOpen(true);
    };

    const handleWorkerSaved = async () => {
        setIsWorkerFormOpen(false);
        setWorkerToEdit(null);
        await loadData(); // Refresh the list
    };

    const handleConfirmDelete = async () => {
        if (!workerToDelete) return;
        try {
            await deleteWorker(workerToDelete.id);
            toast({ title: 'Worker Deleted' });
            await loadData(); // Refresh the list
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setWorkerToDelete(null);
        }
    };
    
    const handleToggleSelectAll = () => {
        if (selectedEmployeeIds.length === employees.length) {
            setSelectedEmployeeIds([]);
        } else {
            setSelectedEmployeeIds(employees.map(e => e.id));
        }
    };
    
    const handleDeleteSelected = async () => {
        if (selectedEmployeeIds.length === 0) return;
        setIsBulkDeleteAlertOpen(true);
    };

    const handleConfirmBulkDelete = async () => {
        if (!user) return;
        const originalEmployees = [...employees];
        setEmployees(prev => prev.filter(e => !selectedEmployeeIds.includes(e.id)));

        try {
            await deleteWorkers(selectedEmployeeIds);
            toast({ title: `${selectedEmployeeIds.length} worker(s) deleted.` });
            setSelectedEmployeeIds([]);
        } catch (error: any) {
            setEmployees(originalEmployees);
            toast({ variant: 'destructive', title: 'Bulk delete failed', description: error.message });
        } finally {
            setIsBulkDeleteAlertOpen(false);
        }
    };

  const handleStartNewPayroll = () => {
    setPayrollStatus('idle');
    setSelectedEmployeeIds([]);
  };
  
  if (isLoading) {
      return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>
  }

  if (payrollStatus === 'completed') {
    return <PayrollSuccessView onStartNew={handleStartNewPayroll} payPeriod={payPeriod} />
  }

  return (
    <>
    <div className="p-4 sm:p-6 space-y-6">
      <header className="relative text-center">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <Button asChild variant="outline">
            <Link href="/accounting/payroll">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payroll Hub
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">
          Run Payroll
        </h1>
        <p className="text-muted-foreground">
          Follow the steps below to process payroll for your employees.
        </p>
      </header>

      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
             <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                  Step 1: Pay Period & Employees
                </CardTitle>
                <CardDescription>Select the pay period and the employees you wish to include in this run.</CardDescription>
             </div>
             <Button variant="outline" onClick={() => handleOpenWorkerForm(null)}>
                <Users className="mr-2 h-4 w-4" />
                Manage Workers
             </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pay Period</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !payPeriod && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {payPeriod?.from ? (
                    payPeriod.to ? (
                      <>
                        {format(payPeriod.from, 'LLL dd, y')} -{' '}
                        {format(payPeriod.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(payPeriod.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={payPeriod?.from}
                  selected={payPeriod}
                  onSelect={setPayPeriod}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <Label>Select Employees to Pay</Label>
                {selectedEmployeeIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete Selected ({selectedEmployeeIds.length})
                    </Button>
                )}
            </div>
            <div className="space-y-2 rounded-md border p-4">
                <div className="flex items-center space-x-2 justify-between border-b pb-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all-employees"
                            checked={selectedEmployeeIds.length === employees.length && employees.length > 0}
                            onCheckedChange={handleToggleSelectAll}
                        />
                        <Label htmlFor="select-all-employees" className="font-semibold">Select All</Label>
                    </div>
                </div>
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-2 justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onCheckedChange={() => handleSelectEmployee(emp.id)}
                    />
                    <label
                      htmlFor={`emp-${emp.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                    >
                      {emp.name}
                    </label>
                    <span className="text-xs text-muted-foreground capitalize">
                      ({emp.payType})
                    </span>
                  </div>
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleOpenWorkerForm(emp)}><Edit className="mr-2 h-4 w-4" />Edit Worker</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setWorkerToDelete(emp)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Worker</DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Step 2: Enter Payroll Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="w-48">Gross Pay</TableHead>
                <TableHead className="w-48">Deductions</TableHead>
                <TableHead className="w-48 text-right">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={emp.grossPay ?? ''}
                          onChange={(e) =>
                            handlePayValueChange(emp.id, 'grossPay', e.target.value)
                          }
                          className="w-32"
                        />
                        {emp.payType === 'hourly' && (
                            <Button variant="outline" size="sm" onClick={() => handleCalculateHours(emp.id)}>
                                <Calculator className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                     {emp.hoursWorked !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">{emp.hoursWorked.toFixed(2)} hrs logged</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={emp.deductions ?? ''}
                      onChange={(e) =>
                        handlePayValueChange(
                          emp.id,
                          'deductions',
                          e.target.value
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(emp.netPay || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Step 3: Payroll Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollSummary.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(emp.grossPay)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ({formatCurrency(emp.deductions)})
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatCurrency(emp.netPay)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Totals</TableCell>
                <TableCell className="text-right font-bold font-mono">
                  {formatCurrency(totalGrossPay)}
                </TableCell>
                <TableCell className="text-right font-bold font-mono">
                  ({formatCurrency(totalDeductions)})
                </TableCell>
                <TableCell className="text-right font-bold font-mono">
                  {formatCurrency(totalNetPay)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
        <CardFooter className="flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground text-center">
            By clicking "Submit Payroll", you are confirming the amounts are correct.
          </p>
          <Button
            size="lg"
            onClick={handleRunPayroll}
            disabled={selectedEmployees.length === 0 || payrollStatus === 'processing'}
          >
            {payrollStatus === 'processing' ? (
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-5 w-5" />
            )}
            {payrollStatus === 'processing'
              ? 'Processing...'
              : `Submit Payroll for ${selectedEmployees.length} Employee(s)`}
          </Button>
        </CardFooter>
      </Card>
    </div>

    <WorkerFormDialog 
        isOpen={isWorkerFormOpen} 
        onOpenChange={(isOpen) => {
            setIsWorkerFormOpen(isOpen);
            if (!isOpen) {
                setWorkerToEdit(null); // Clear editing state when dialog closes
            }
        }}
        workerToEdit={workerToEdit}
        onWorkerSave={async (data) => {
            if (!user) return;
            await addWorker({ ...data, userId: user.uid });
            handleWorkerSaved();
        }}
        onWorkerUpdate={async (id, data) => {
            await updateWorker(id, data);
            handleWorkerSaved();
        }}
    />
    
    <AlertDialog open={!!workerToDelete} onOpenChange={setWorkerToDelete}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{workerToDelete?.name}". This action cannot be undone.</AlertDialogDescription>
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
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {selectedEmployeeIds.length} worker(s). This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
