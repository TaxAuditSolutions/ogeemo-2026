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
    GitMerge, 
    X, 
    Pencil,
    ChevronDown,
    ChevronUp,
    Clock
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { AnimatePresence, motion } from 'framer-motion';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getWorkers, addWorker, updateWorker, savePayrollRun, deleteWorker, mergeWorkers, type Worker } from '@/services/payroll-service';
import { getTimeLogs } from '@/services/timelog-service';
import { getTasksForUser } from '@/services/project-service';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { cn } from '@/lib/utils';
import MergeWorkerDialog from './MergeWorkerDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type PayrollEmployee = Worker & {
    grossPay: number;
    deductions: number;
    netPay: number;
    hoursWorked: number;
};

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
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [workerToMerge, setWorkerToMerge] = useState<Worker | null>(null);
  
  // Expanded by default to ensure visibility
  const [isWorkerListOpen, setIsWorkerListOpen] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const [fetchedWorkers, fetchedTasks, fetchedLogs] = await Promise.all([
            getWorkers(user.uid),
            getTasksForUser(user.uid),
            getTimeLogs(user.uid)
        ]);
        setWorkersList(fetchedWorkers);
        setAllTasks(fetchedTasks);
        setAllTimeLogs(fetchedLogs);
        setSelectedEmployeeIds([]);
    } catch (e: any) { 
        toast({ variant: 'destructive', title: 'Error', description: e.message }); 
    } finally { 
        setIsLoading(false); 
    }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const processedEmployees = useMemo((): PayrollEmployee[] => {
    return workersList.map(emp => {
        let totalSeconds = 0;
        
        if (startDate && endDate) {
            const start = startOfDay(startDate);
            const end = endOfDay(endDate);

            // Sum hours from calendar tasks
            const taskSeconds = allTasks
                .filter(t => t.workerId === emp.id && t.start && isWithinInterval(new Date(t.start), { start, end }))
                .reduce((sum, t) => sum + (t.duration || 0), 0);

            // Sum hours from manual time logs
            const logSeconds = allTimeLogs
                .filter(l => l.workerId === emp.id && l.startTime && isWithinInterval(new Date(l.startTime), { start, end }))
                .reduce((sum, l) => sum + (l.durationSeconds || 0), 0);

            totalSeconds = taskSeconds + logSeconds;
        }

        const totalHours = totalSeconds / 3600;
        
        let grossPay = 0;
        if (emp.payType === 'hourly') {
            grossPay = parseFloat((totalHours * emp.payRate).toFixed(2));
        } else {
            // Salary calculation: Annual Rate / 24 (bi-monthly)
            grossPay = parseFloat((emp.payRate / 24).toFixed(2));
        }

        const deductions = parseFloat((grossPay * 0.2).toFixed(2));

        return { 
            ...emp, 
            hoursWorked: totalHours, 
            grossPay,
            deductions,
            netPay: grossPay - deductions
        };
    });
  }, [workersList, allTasks, allTimeLogs, startDate, endDate]);

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

  const handleMergeClick = (worker: Worker) => {
      setWorkerToMerge(worker);
      setIsMergeDialogOpen(true);
  };

  const handleConfirmMerge = async (sourceId: string, targetId: string) => {
      try {
          await mergeWorkers(sourceId, targetId);
          toast({ title: "Records Merged" });
          loadData();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Merge Failed', description: error.message });
      } finally {
          setIsMergeDialogOpen(false);
          setWorkerToMerge(null);
      }
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

  if (isLoading) return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
  if (payrollStatus === 'completed') return <PayrollSuccessView onStartNew={() => setPayrollStatus('idle')} startDate={startDate} endDate={endDate} />;

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center h-full">
      <header className="text-center relative w-full max-w-5xl">
        <h1 className="text-3xl font-bold font-headline text-primary">Run Payroll</h1>
        <p className="text-muted-foreground">Select a pay period and workers to begin.</p>
        <div className="absolute top-0 right-0">
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
                                    onSelect={(d) => { setStartDate(d); setIsStartDateOpen(false); }}
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
                                    onSelect={(d) => { setEndDate(d); setIsEndDateOpen(false); }}
                                    disabled={(date) => startDate ? date < startDate : false}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-4" onClick={() => setIsWorkerListOpen(!isWorkerListOpen)}>
                    <div className="flex justify-between items-center w-full">
                        <CardTitle className="text-base flex items-center gap-2">
                            2. Select Workers
                            {isWorkerListOpen ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenWorkerForm(); }}>
                            <Plus className="h-4 w-4"/>
                        </Button>
                    </div>
                </CardHeader>
                <AnimatePresence initial={true}>
                    {isWorkerListOpen && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden border-t"
                        >
                            <CardContent className="p-0">
                                <Accordion type="multiple" className="w-full">
                                    {processedEmployees.map(emp => (
                                        <AccordionItem key={emp.id} value={emp.id} className="border-b px-4">
                                            <div className="flex items-center gap-3 py-2">
                                                <Checkbox 
                                                    checked={selectedEmployeeIds.includes(emp.id)} 
                                                    onCheckedChange={(checked) => setSelectedEmployeeIds(p => checked ? [...p, emp.id] : p.filter(id => id !== emp.id))}
                                                    id={`check-${emp.id}`}
                                                />
                                                <AccordionTrigger className="flex-1 py-0 hover:no-underline font-normal text-sm">
                                                    <div className="flex flex-col items-start text-left">
                                                        <span>{emp.name}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-2 w-2" />
                                                            {emp.hoursWorked.toFixed(2)} hrs in period
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>
                                            </div>
                                            <AccordionContent className="pt-0 pb-4 text-xs text-muted-foreground space-y-2">
                                                <div className="grid grid-cols-2 gap-2 pl-7">
                                                    <div>
                                                        <p className="font-semibold text-foreground">Email</p>
                                                        <p>{emp.email || 'No email set'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground">Worker ID</p>
                                                        <p>{emp.workerIdNumber || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground">Type</p>
                                                        <p className="capitalize">{emp.workerType}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground">Pay Rate</p>
                                                        <p>{formatCurrency(emp.payRate)}{emp.payType === 'hourly' ? '/hr' : '/yr'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pl-7 pt-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenWorkerForm(emp)} className="h-7 px-2 text-[10px]">
                                                        <Pencil className="mr-1 h-3 w-3"/> Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleMergeClick(emp)} className="h-7 px-2 text-[10px]">
                                                        <GitMerge className="mr-1 h-3 w-3"/> Merge
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteWorker(emp)} className="h-7 px-2 text-[10px] text-destructive">
                                                        <Trash2 className="mr-1 h-3 w-3"/> Delete
                                                    </Button>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                                {processedEmployees.length === 0 && (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        No workers found. Click the plus icon to add one.
                                    </div>
                                )}
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>3. Review & Submit</CardTitle>
                    <CardDescription>Pay is calculated based on hours logged in the selected period for hourly workers.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {selectedEmployees.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead className="text-right">Hours</TableHead>
                                    <TableHead className="text-right">Gross Pay</TableHead>
                                    <TableHead className="text-right">Deductions</TableHead>
                                    <TableHead className="text-right">Net Pay</TableHead>
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
                                        <TableCell className="text-right font-mono">{formatCurrency(emp.deductions)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(emp.netPay)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalGrossPay)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalDeductions)}</TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">{formatCurrency(totalNetPay)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    ) : <div className="h-full flex items-center justify-center text-muted-foreground p-12 text-center border-2 border-dashed rounded-lg"><p>No workers selected. Open the "Select Workers" list on the left to add them.</p></div>}
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

      {workerToMerge && (
        <MergeWorkerDialog
            isOpen={isMergeDialogOpen}
            onOpenChange={setIsMergeDialogOpen}
            sourceWorker={workerToMerge}
            allWorkers={workersList}
            onMergeConfirm={handleConfirmMerge}
        />
      )}

      <AlertDialog open={!!workerToDelete} onOpenChange={() => setWorkerToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the worker record for "{workerToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteWorker} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
