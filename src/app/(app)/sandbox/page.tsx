
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogHeader,
  DialogFooter,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LoaderCircle,
  ChevronsUpDown,
  Check,
  Calendar as CalendarIcon,
  Plus,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { format, set } from 'date-fns';
import { cn, formatTime } from '@/lib/utils';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTasksForUser, addTask, type Event as TaskEvent } from '@/services/project-service';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


interface TimeLogEntry {
    id: number;
    date: string;
    startTime: { hour: string; minute: string };
    endTime: { hour: string; minute: string };
    description: string;
}

const emptyLogEntry: Omit<TimeLogEntry, 'id'> = {
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: { hour: '9', minute: '0' },
    endTime: { hour: '17', minute: '0' },
    description: '',
};

function LogTimeDialog({ isOpen, onOpenChange, workerId: initialWorkerId, workers, onTimeLogged }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    workerId: string | null;
    workers: Worker[];
    onTimeLogged: () => void;
}) {
    const [timeEntries, setTimeEntries] = useState<TimeLogEntry[]>([{ id: Date.now(), ...emptyLogEntry }]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(initialWorkerId);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        setSelectedWorkerId(initialWorkerId);
        if (isOpen) {
            setTimeEntries([{ id: Date.now(), ...emptyLogEntry }]);
        }
    }, [isOpen, initialWorkerId]);

    const handleAddEntry = () => { setTimeEntries(prev => [...prev, { id: Date.now(), ...emptyLogEntry }]); };
    const handleRemoveEntry = (id: number) => { setTimeEntries(prev => prev.filter(entry => entry.id !== id)); };
    const handleEntryChange = (id: number, field: keyof TimeLogEntry, value: any) => { setTimeEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry)); };
    const handleTimeChange = (id: number, timeField: 'startTime' | 'endTime', part: 'hour' | 'minute', value: string) => {
        setTimeEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [timeField]: { ...entry[timeField], [part]: value } } : entry));
    };

    const handleSaveAllLogs = async () => {
        if (!user || !selectedWorkerId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an employee.' });
            return;
        }
        if (timeEntries.length === 0) {
            toast({ variant: 'destructive', title: 'No Entries', description: 'Please add at least one time entry to log.' });
            return;
        }

        setIsSaving(true);
        try {
            let successfulLogs = 0;
            for (const entry of timeEntries) {
                if (!entry.date) continue;
                const logDate = new Date(entry.date);
                const startTime = set(logDate, { hours: parseInt(entry.startTime.hour), minutes: parseInt(entry.startTime.minute) });
                const endTime = set(logDate, { hours: parseInt(entry.endTime.hour), minutes: parseInt(entry.endTime.minute) });
                if (endTime <= startTime) continue;
                const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
                await addTask({
                    title: `Time Log: ${workers.find(e => e.id === selectedWorkerId)?.name}`,
                    description: entry.description,
                    start: startTime,
                    end: endTime,
                    duration: durationSeconds,
                    workerId: selectedWorkerId,
                    userId: user.uid,
                    status: 'done',
                    isBillable: false,
                    position: 0,
                });
                successfulLogs++;
            }
            if (successfulLogs > 0) {
                toast({ title: "Time Logged Successfully", description: `${successfulLogs} time entries have been saved.` });
                onTimeLogged();
                onOpenChange(false);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: format(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes), label: `:${minutes.toString().padStart(2, '0')}` }; });
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Log Time Card Entry</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2 max-w-sm">
                        <Label>Employee / Contractor</Label>
                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">{selectedWorkerId ? workers.find(e => e.id === selectedWorkerId)?.name : "Select a worker..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>No worker found.</CommandEmpty><CommandGroup>{workers.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedWorkerId(c.id); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                    {timeEntries.map((entry) => (
                        <div key={entry.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1.5fr_2fr_auto] gap-4 items-end border p-4 rounded-lg">
                            <div className="space-y-2"><Label htmlFor={`log-date-${entry.id}`}>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !entry.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{entry.date ? format(new Date(entry.date), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entry.date ? new Date(entry.date) : undefined} onSelect={(date) => date && handleEntryChange(entry.id, 'date', format(date, 'yyyy-MM-dd'))} initialFocus /></PopoverContent></Popover></div>
                            <div className="space-y-2"><Label>Start Time</Label><div className="flex gap-2"><Select value={entry.startTime.hour} onValueChange={(v) => handleTimeChange(entry.id, 'startTime', 'hour', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><Select value={entry.startTime.minute} onValueChange={(v) => handleTimeChange(entry.id, 'startTime', 'minute', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div></div>
                            <div className="space-y-2"><Label>End Time</Label><div className="flex gap-2"><Select value={entry.endTime.hour} onValueChange={(v) => handleTimeChange(entry.id, 'endTime', 'hour', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><Select value={entry.endTime.minute} onValueChange={(v) => handleTimeChange(entry.id, 'endTime', 'minute', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div></div>
                            <div className="space-y-2"><Label htmlFor={`log-description-${entry.id}`}>Description (Optional)</Label><Input id={`log-description-${entry.id}`} placeholder="e.g., Regular shift" value={entry.description} onChange={(e) => handleEntryChange(entry.id, 'description', e.target.value)} /></div>
                            <div><Button variant="ghost" size="icon" onClick={() => handleRemoveEntry(entry.id)} disabled={timeEntries.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                        </div>
                    ))}
                    <Button variant="outline" onClick={handleAddEntry}><Plus className="mr-2 h-4 w-4" /> Add Another Entry</Button>
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSaveAllLogs} disabled={isSaving}>{isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Log All Entries ({timeEntries.length})</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SandboxPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [allEntries, setAllEntries] = useState<TaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showTestCard, setShowTestCard] = useState(false);
  const [showTest2Card, setShowTest2Card] = useState(false);
  
  const [testWorker, setTestWorker] = useState<string>('');
  const [testDate, setTestDate] = useState<Date | undefined>(new Date());
  const [testDescription, setTestDescription] = useState('');
  const [testDuration, setTestDuration] = useState({ hours: '', minutes: '' });

  const [test2SelectedWorkerId, setTest2SelectedWorkerId] = useState<string | null>(null);
  const [isTest2WorkerPopoverOpen, setIsTest2WorkerPopoverOpen] = useState(false);
  
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedWorkers, entries] = await Promise.all([
            getWorkers(user.uid),
            getTasksForUser(user.uid),
        ]);
        setWorkers(fetchedWorkers);
        const timeLogEntries = entries.filter(entry => (entry.duration || 0) > 0 && entry.workerId);
        setAllEntries(timeLogEntries);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleLogTestEntry = async () => {
    if (!user) return;
    const durationHours = Number(testDuration.hours) || 0;
    const durationMinutes = Number(testDuration.minutes) || 0;
    const totalDurationSeconds = (durationHours * 3600) + (durationMinutes * 60);

    if (!testWorker || !testDate || totalDurationSeconds <= 0) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a worker, date, and enter a valid duration.' });
        return;
    }

    try {
        const startTime = set(testDate, { hours: 9, minutes: 0 }); // Default to 9 AM
        const endTime = new Date(startTime.getTime() + totalDurationSeconds * 1000);
        await addTask({
            title: testDescription || `Manual Time Entry`,
            description: testDescription,
            start: startTime,
            end: endTime,
            duration: totalDurationSeconds,
            workerId: testWorker,
            userId: user.uid,
            status: 'done',
            isBillable: false,
            position: 0,
        });
        toast({ title: "Test Entry Logged", description: "The time log has been added successfully." });
        setTestDescription('');
        setTestDuration({ hours: '', minutes: '' });
        await loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const test2WorkerEntries = useMemo(() => {
    if (!test2SelectedWorkerId) return [];
    return allEntries.filter(entry => entry.workerId === test2SelectedWorkerId);
  }, [allEntries, test2SelectedWorkerId]);

  const test2TotalDuration = useMemo(() => {
    return test2WorkerEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
  }, [test2WorkerEntries]);

  const handleWorkerSaved = () => {
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Testing Time Logs
          </h1>
        </header>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>One Frame to control them all.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Button onClick={() => setIsLogTimeDialogOpen(true)}>Log a Time Entry</Button>
                <Button onClick={() => setIsWorkerFormOpen(true)}>Add Worker</Button>
                <Button variant="outline" onClick={() => setShowTestCard(p => !p)}>Test</Button>
                <Button variant="outline" onClick={() => setShowTest2Card(p => !p)}>Test 2</Button>
            </div>

            {showTestCard && (
              <Card>
                  <CardHeader><CardTitle>Test Card</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="test-worker">Worker</Label><Select value={testWorker} onValueChange={setTestWorker}><SelectTrigger id="test-worker"><SelectValue placeholder="Select a worker" /></SelectTrigger><SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label htmlFor="test-date">Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{testDate ? format(testDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={testDate} onSelect={setTestDate} initialFocus /></PopoverContent></Popover></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="test-description">Description</Label><Input id="test-description" value={testDescription} onChange={e => setTestDescription(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Duration</Label><div className="flex items-center gap-2"><Input type="number" placeholder="Hours" value={testDuration.hours} onChange={e => setTestDuration(p => ({...p, hours: e.target.value}))} /><Input type="number" placeholder="Minutes" value={testDuration.minutes} onChange={e => setTestDuration(p => ({...p, minutes: e.target.value}))} /></div></div>
                  </CardContent>
                   <CardFooter><Button onClick={handleLogTestEntry}>Log Test Entry</Button></CardFooter>
              </Card>
            )}

            {showTest2Card && (
              <Card className="mt-6">
                <CardHeader><CardTitle>Worker-Specific Report</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-w-xs space-y-2">
                    <Label>Select Worker to View Report</Label>
                    <Popover open={isTest2WorkerPopoverOpen} onOpenChange={setIsTest2WorkerPopoverOpen}>
                      <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{test2SelectedWorkerId ? workers.find(w => w.id === test2SelectedWorkerId)?.name : "Select worker..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"><Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>No worker found.</CommandEmpty><CommandGroup>{workers.map(w => (<CommandItem key={w.id} value={w.name} onSelect={() => { setTest2SelectedWorkerId(w.id); setIsTest2WorkerPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", test2SelectedWorkerId === w.id ? "opacity-100" : "opacity-0")} />{w.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                    </Popover>
                  </div>
                  {test2SelectedWorkerId && (
                    <div className="mt-4"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Duration</TableHead></TableRow></TableHeader><TableBody>{test2WorkerEntries.length > 0 ? test2WorkerEntries.map(entry => (<TableRow key={entry.id}><TableCell>{entry.start ? format(new Date(entry.start), 'yyyy-MM-dd') : 'N/A'}</TableCell><TableCell>{entry.description || entry.title}</TableCell><TableCell className="text-right font-mono">{formatTime(entry.duration || 0)}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No time entries found for this worker.</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell colSpan={2} className="font-bold">Total Time</TableCell><TableCell className="text-right font-bold font-mono">{formatTime(test2TotalDuration)}</TableCell></TableRow></TableFooter></Table></div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
      <LogTimeDialog isOpen={isLogTimeDialogOpen} onOpenChange={setIsLogTimeDialogOpen} workerId={null} workers={workers} onTimeLogged={loadData} />
      <WorkerFormDialog isOpen={isWorkerFormOpen} onOpenChange={setIsWorkerFormOpen} onWorkerSave={handleWorkerSaved} />
    </>
  );
}

    