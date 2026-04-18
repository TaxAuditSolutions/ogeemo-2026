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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { 
    Calendar as CalendarIcon, 
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
    X, 
    Pencil,
    ChevronDown,
    ChevronUp,
    Clock,
    RefreshCw,
    UserPlus,
    Info,
    ExternalLink,
    Files
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import { type DateRange } from 'react-day-picker';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getWorkers, addWorker, updateWorker, savePayrollRun, deleteWorker, type Worker } from '@/services/payroll-service';
import { getTimeLogs } from '@/services/timelog-service';
import { getTasksForUser } from '@/services/project-service';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { getUserProfile, getUsers } from '@/core/user-profile-service';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type PayrollEmployee = Worker & {
    grossPay: number;
    deductions: number;
    netPay: number;
    hoursWorked: number;
};

// Global deduction rate for the prototype (20%)
const ESTIMATED_DEDUCTION_RATE = 0.20;

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const PayrollSuccessView = ({ onStartNew, startDate, endDate }: { onStartNew: () => void, startDate?: Date, endDate?: Date }) => {
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
                        Processed period: {startDate ? format(startDate, 'PP') : ''} - {endDate ? format(endDate, 'PP') : ''}
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
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allTimeLogs, setAllTimeLogs] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  const [payrollStatus, setPayrollStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        // Fetch all data points for global organization view
        const [fetchedWorkers, fetchedTasks, fetchedLogs, profiles] = await Promise.all([
            getWorkers(user.uid),
            getTasksForUser(), // Pull all organizational tasks
            getTimeLogs(),     // Pull all organizational logs
            getUsers()         // Pull all profiles for identity matching
        ]);

        const adminProfile = profiles.find(p => p.id === user.uid);
        const adminWorker: Worker = {
            id: user.uid,
            name: `${adminProfile?.displayName || user.displayName || 'Admin'} (Admin)`,
            email: user.email || '',
            workerType: 'employee',
            payType: 'salary',
            payRate: 0, 
            userId: user.uid,
            folderId: 'all',
        };

        const uniqueWorkers = [adminWorker, ...fetchedWorkers].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        setWorkersList(uniqueWorkers);
        setAllTasks(fetchedTasks);
        setAllTimeLogs(fetchedLogs);
        setUserProfiles(profiles);
    } catch (e: any) { 
        console.error("RunPayrollView: Failed to load data", e);
        toast({ variant: 'destructive', title: 'Error Loading Data', description: e.message }); 
    } finally { 
        setIsLoading(false); 
    }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Map of email to UID for precise log matching
  const emailToUidMap = useMemo(() => {
      const map = new Map<string, string>();
      userProfiles.forEach(p => {
          if (p.email) map.set(p.email.toLowerCase(), p.id);
      });
      return map;
  }, [userProfiles]);

  const processedEmployees = useMemo((): PayrollEmployee[] => {
    return workersList.map(emp => {
        let totalSeconds = 0;
        
        if (startDate && endDate) {
            const start = startOfDay(startDate);
            const end = endOfDay(endDate);
            
            // Resolve the worker's UID if it's a registry record
            const resolvedUid = emp.userId || (emp.email ? emailToUidMap.get(emp.email.toLowerCase()) : null);

            const taskSeconds = allTasks
                .filter(t => {
                    const matchId = t.workerId === emp.id || (resolvedUid && t.workerId === resolvedUid);
                    return matchId && t.start && isWithinInterval(new Date(t.start), { start, end });
                })
                .reduce((sum, t) => sum + (t.duration || 0), 0);

            const logSeconds = allTimeLogs
                .filter(l => {
                    const matchId = l.workerId === emp.id || (resolvedUid && l.workerId === resolvedUid);
                    return matchId && l.startTime && isWithinInterval(new Date(l.startTime), { start, end });
                })
                .reduce((sum, l) => sum + (l.durationSeconds || 0), 0);

            totalSeconds = taskSeconds + logSeconds;
        }

        const totalHours = totalSeconds / 3600;
        let grossPay = 0;
        const rate = Number(emp.payRate) || 0;

        if (emp.payType === 'hourly') {
            grossPay = parseFloat((totalHours * rate).toFixed(2));
        } else {
            grossPay = parseFloat((rate / 2).toFixed(2));
        }

        const deductions = parseFloat((grossPay * ESTIMATED_DEDUCTION_RATE).toFixed(2));

        return { 
            ...emp, 
            hoursWorked: totalHours, 
            grossPay: isNaN(grossPay) ? 0 : grossPay,
            deductions: isNaN(deductions) ? 0 : deductions,
            netPay: isNaN(grossPay - deductions) ? 0 : (grossPay - deductions)
        };
    });
  }, [workersList, allTasks, allTimeLogs, startDate, endDate, emailToUidMap]);

  const selectedEmployees = useMemo(() => processedEmployees.filter((e) => selectedEmployeeIds.includes(e.id)), [processedEmployees, selectedEmployeeIds]);

  const totalGrossPay = useMemo(() => selectedEmployees.reduce((sum, emp) => sum + emp.grossPay, 0), [selectedEmployees]);
  const totalDeductions = useMemo(() => selectedEmployees.reduce((sum, emp) => sum + emp.deductions, 0), [selectedEmployees]);
  const totalNetPay = useMemo(() => selectedEmployees.reduce((sum, emp) => sum + emp.netPay, 0), [selectedEmployees]);

  const handleOpenWorkerForm = (worker: Worker | null = null) => {
      setWorkerToEdit(worker);
      setIsWorkerFormOpen(true);
  };

  const handleWorkerSave = async (workerData: Omit<Worker, 'id' | 'userId'>) => {
      if (!user) return;
      try {
          await addWorker({ ...workerData, userId: user.uid });
          toast({ title: "Worker Added" });
          loadData();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      }
  };

  const handleWorkerUpdate = async (workerId: string, workerData: Partial<Omit<Worker, 'id' | 'userId'>>) => {
      try {
          await updateWorker(workerId, workerData);
          toast({ title: "Worker Updated" });
          loadData();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      }
  };

  const handleDeleteWorker = (worker: Worker) => {
      setWorkerToDelete(worker);
  };

  const handleConfirmDeleteWorker = async () => {
      if (!workerToDelete) return;
      try {
          await deleteWorker(workerToDelete.id);
          toast({ title: "Worker Deleted" });
          loadData();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
      } finally {
          setWorkerToDelete(null);
      }
  };

  const handleRemoveFromRun = (workerId: string) => {
      setSelectedEmployeeIds(prev => prev.filter(id => id !== workerId));
      toast({ title: "Worker Removed from Selection" });
  };

  const handleOpenReport = (emp: PayrollEmployee) => {
      const params = new URLSearchParams();
      params.set('selectedWorkerId', emp.id);
      if (startDate) params.set('from', startDate.toISOString());
      if (endDate) params.set('to', endDate.toISOString());
      router.push(`/reports/time-log?${params.toString()}`);
  };

  const handleRunPayroll = async () => {
      if (!user || !startDate || !endDate || selectedEmployeeIds.length === 0) {
          toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a period and at least one worker.' });
          return;
      }

      setPayrollStatus('processing');
      try {
          await savePayrollRun({
              userId: user.uid,
              payPeriodStart: startDate,
              payPeriodEnd: endDate,
              payDate: new Date(),
              totalGrossPay,
              totalDeductions,
              totalNetPay,
              employeeCount: selectedEmployeeIds.length,
              details: selectedEmployees.map(emp => ({
                  employeeId: emp.id,
                  employeeName: emp.name,
                  grossPay: emp.grossPay,
                  deductions: emp.deductions,
                  netPay: emp.netPay,
              }))
          });
          setPayrollStatus('completed');
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Payroll Failed', description: error.message });
          setPayrollStatus('idle');
      }
  };

  if (payrollStatus === 'completed') {
      return <PayrollSuccessView onStartNew={() => setPayrollStatus('idle')} startDate={startDate} endDate={endDate} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center h-full">
      <header className="text-center relative w-full max-w-5xl">
        <h1 className="text-3xl font-bold font-headline text-primary">Run Payroll</h1>
        <p className="text-muted-foreground">Select a pay period and workers to begin.</p>
        <div className="absolute top-0 right-0 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData} title="Refresh data">
                <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
            </Button>
            <Button asChild variant="ghost" size="icon">
                <Link href="/accounting"><X className="h-5 w-5"/></Link>
            </Button>
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader><CardTitle>1. Select Pay Period</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Start of Payroll Period</Label>
                        <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CustomCalendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(d) => { if(d) { setStartDate(d); setIsStartDateOpen(false); } }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>End of Payroll Period</Label>
                        <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={!startDate}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CustomCalendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={(d) => { if(d) { setEndDate(d); setIsEndDateOpen(false); } }}
                                    disabled={(date) => startDate ? date < startDate : false}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
                <CardHeader className="py-4 border-b">
                    <div className="flex justify-between items-center w-full">
                        <CardTitle className="text-base flex items-center gap-2">
                            2. Select Workers
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenWorkerForm()}>
                            <Plus className="h-4 w-4"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-12 text-center flex flex-col items-center gap-4">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading workers...</p>
                            </div>
                        ) : processedEmployees.length > 0 ? (
                            <div className="divide-y">
                                {processedEmployees.map(emp => (
                                    <div key={emp.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                                        <div className="pt-1">
                                            <Checkbox 
                                                checked={selectedEmployeeIds.includes(emp.id)} 
                                                onCheckedChange={(checked) => setSelectedEmployeeIds(p => checked ? [...p, emp.id] : p.filter(id => id !== emp.id))}
                                                id={`check-${emp.id}`}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Label htmlFor={`check-${emp.id}`} className="cursor-pointer">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-sm block truncate">{emp.name}</span>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        ID: {emp.workerIdNumber || 'Not Assigned'} • {emp.payType}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-primary flex items-center gap-1 mt-1">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {emp.hoursWorked.toFixed(2)} hrs tracked
                                                    </span>
                                                </div>
                                            </Label>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleOpenWorkerForm(emp)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit Record
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleDeleteWorker(emp)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center space-y-4">
                                <p className="text-sm text-muted-foreground italic">No workers found in your directory.</p>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/contacts">
                                        <UserPlus className="mr-2 h-4 w-4" /> Go to Worker Directory
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>3. Review & Submit</CardTitle>
                    <CardDescription>
                        Calculated pay for selected workers. Deductions are estimated at 20% for taxes and benefits.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {selectedEmployees.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead className="text-right">Hours</TableHead>
                                    <TableHead className="text-right">Gross Pay</TableHead>
                                    <TableHead className="text-right flex items-center justify-end gap-1">
                                        Deductions (20%)
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">Estimated 20% flat rate for Tax, EI, and CPP.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableHead>
                                    <TableHead className="text-right">Net Pay</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedEmployees.map(emp => (
                                    <TableRow key={emp.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{emp.name}</span>
                                                <span className="text-[10px] text-muted-foreground capitalize">{emp.payType}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{emp.hoursWorked.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(emp.grossPay)}</TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(emp.deductions)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(emp.netPay)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleOpenReport(emp)}>
                                                        <ExternalLink className="mr-2 h-4 w-4" /> Open Source Logs
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onSelect={() => router.push(`/document-manager?highlight=${emp.documentFolderId}`)}
                                                        disabled={!emp.documentFolderId}
                                                    >
                                                        <Files className="mr-2 h-4 w-4" /> View Employee Documents
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleOpenWorkerForm(emp)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Worker Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => handleRemoveFromRun(emp.id)} className="text-destructive">
                                                        <X className="mr-2 h-4 w-4" /> Remove from This Run
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalGrossPay)}</TableCell>
                                    <TableCell className="text-right font-bold text-muted-foreground">{formatCurrency(totalDeductions)}</TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">{formatCurrency(totalNetPay)}</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        </Table>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground p-12 text-center border-2 border-dashed rounded-lg">
                            <p>No workers selected. Use the "Select Workers" list on the left to add them to the run.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t p-6">
                    <Button className="w-full" size="lg" disabled={selectedEmployeeIds.length === 0 || payrollStatus === 'processing' || !startDate || !endDate} onClick={handleRunPayroll}>
                        {payrollStatus === 'processing' ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <Calculator className="mr-2 h-4 w-4"/>}
                        {payrollStatus === 'processing' ? 'Processing...' : `Submit Payroll for ${selectedEmployeeIds.length} Workers`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>

      <WorkerFormDialog 
          isOpen={isWorkerFormOpen} 
          onOpenChange={(isOpen) => {
              setIsWorkerFormOpen(isOpen);
              if (!isOpen) {
                  setWorkerToEdit(null);
              }
          }} 
          workerToEdit={workerToEdit} 
          onWorkerSave={handleWorkerSave} 
          onWorkerUpdate={handleWorkerUpdate}
      />

      <AlertDialog open={!!workerToDelete} onOpenChange={() => setWorkerToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the worker record for "{workerToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteWorker} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
