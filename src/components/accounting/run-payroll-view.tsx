
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  ArrowLeft,
  CheckCircle,
  FileSpreadsheet,
  Users,
  DollarSign,
  LoaderCircle,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { getEmployees, type Employee, savePayrollRun } from '@/services/payroll-service';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getActionChips, type ActionChipData } from '@/services/project-service';

type PayrollEmployee = Employee & {
    grossPay?: number;
    deductions?: number;
    netPay?: number;
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const PayrollSuccessView = ({ onStartNew, payPeriod }: { onStartNew: () => void, payPeriod?: DateRange }) => {
    const [navItems, setNavItems] = useState<ActionChipData[]>([]);
    const [isLoadingNav, setIsLoadingNav] = useState(true);
    const { user } = useAuth();
  
    const loadNavItems = useCallback(async () => {
      if (user) {
        setIsLoadingNav(true);
        try {
          const items = await getActionChips(user.uid, 'accountingQuickNavItems');
          setNavItems(items);
        } catch (error) {
          console.error("Failed to load quick nav items:", error);
        } finally {
          setIsLoadingNav(false);
        }
      } else {
        setIsLoadingNav(false);
      }
    }, [user]);

    useEffect(() => {
        loadNavItems();
        window.addEventListener('accountingChipsUpdated', loadNavItems);
        return () => window.removeEventListener('accountingChipsUpdated', loadNavItems);
    }, [loadNavItems]);

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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Quick Navigation 
                                {isLoadingNav ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {navItems.map(item => (
                                <DropdownMenuItem key={item.id} asChild>
                                <Link href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                                </DropdownMenuItem>
                            ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/accounting/manage-navigation">Manage Quick Nav</Link>
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardFooter>
            </Card>
        </div>
    );
};


export function RunPayrollView() {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [payPeriod, setPayPeriod] = useState<DateRange | undefined>({ from: new Date(), to: addDays(new Date(), 14) });
  const [payrollStatus, setPayrollStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
        if (!user) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        try {
            const fetchedEmployees = await getEmployees(user.uid);
            setEmployees(fetchedEmployees.map(e => ({
                ...e,
                grossPay: e.payType === 'salary' ? parseFloat((e.payRate / 24).toFixed(2)) : undefined,
            })));
            setSelectedEmployeeIds(fetchedEmployees.map(e => e.id));
        } catch (error) {
            console.error("Failed to load employees:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load employee data.' });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [user, toast]);

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

  const handleStartNewPayroll = () => {
    setPayrollStatus('idle');
    setSelectedEmployeeIds(employees.map((e) => e.id));
  };
  
  if (isLoading) {
      return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>
  }

  if (payrollStatus === 'completed') {
    return <PayrollSuccessView onStartNew={handleStartNewPayroll} payPeriod={payPeriod} />
  }

  return (
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
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Step 1: Pay Period & Employees
          </CardTitle>
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
            <Label>Select Employees to Pay</Label>
            <div className="space-y-2 rounded-md border p-4">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-2">
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
                    {emp.payType}
                  </span>
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
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={emp.grossPay ?? ''}
                      onChange={(e) =>
                        handlePayValueChange(emp.id, 'grossPay', e.target.value)
                      }
                    />
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
  );
}

      