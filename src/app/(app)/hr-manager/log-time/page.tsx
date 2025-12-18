
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { addTask } from '@/services/project-service';
import { LoaderCircle, Clock, User, Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, set } from 'date-fns';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AccountingPageHeader } from '@/components/accounting/page-header';

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

export default function LogEmployeeTimePage() {
    const [employees, setEmployees] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [timeEntries, setTimeEntries] = useState<TimeLogEntry[]>([{ id: Date.now(), ...emptyLogEntry }]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isEmployeePopoverOpen, setIsEmployeePopoverOpen] = useState(false);
    const searchParams = useSearchParams();

    const { user } = useAuth();
    const { toast } = useToast();

    const loadEmployees = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedEmployees = await getWorkers(user.uid);
            setEmployees(fetchedEmployees);
            
            const workerIdFromUrl = searchParams.get('workerId');
            if (workerIdFromUrl && fetchedEmployees.some(w => w.id === workerIdFromUrl)) {
                setSelectedEmployeeId(workerIdFromUrl);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load employees', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast, searchParams]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const handleAddEntry = () => {
        setTimeEntries(prev => [...prev, { id: Date.now(), ...emptyLogEntry }]);
    };
    
    const handleRemoveEntry = (id: number) => {
        setTimeEntries(prev => prev.filter(entry => entry.id !== id));
    };

    const handleEntryChange = (id: number, field: keyof TimeLogEntry, value: any) => {
        setTimeEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
    };
    
    const handleTimeChange = (id: number, timeField: 'startTime' | 'endTime', part: 'hour' | 'minute', value: string) => {
        setTimeEntries(prev => prev.map(entry => {
            if (entry.id === id) {
                return { ...entry, [timeField]: { ...entry[timeField], [part]: value } };
            }
            return entry;
        }));
    };

    const handleSaveAllLogs = async () => {
        if (!user || !selectedEmployeeId) {
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
                if (!entry.date) {
                    toast({ variant: 'destructive', title: 'Invalid Entry', description: `Entry for "${entry.description}" is missing a date.`});
                    continue;
                }
                
                const logDate = new Date(entry.date);
                const startTime = set(logDate, { hours: parseInt(entry.startTime.hour), minutes: parseInt(entry.startTime.minute) });
                const endTime = set(logDate, { hours: parseInt(entry.endTime.hour), minutes: parseInt(entry.endTime.minute) });

                if (endTime <= startTime) {
                    toast({ variant: 'destructive', title: 'Invalid Times', description: `End time must be after start time for entry on ${entry.date}.` });
                    continue;
                }

                const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
                
                const taskData = {
                    title: `Time Log: ${employees.find(e => e.id === selectedEmployeeId)?.name}`,
                    description: entry.description,
                    start: startTime,
                    end: endTime,
                    duration: durationSeconds,
                    workerId: selectedEmployeeId,
                    userId: user.uid,
                    status: 'done' as const,
                    isBillable: false,
                    position: 0,
                };

                await addTask(taskData);
                successfulLogs++;
            }
            
            if (successfulLogs > 0) {
                toast({ title: "Time Logged Successfully", description: `${successfulLogs} time entries have been saved.` });
                setTimeEntries([{ id: Date.now(), ...emptyLogEntry }]);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: format(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes), label: `:${minutes.toString().padStart(2, '0')}` }; });


    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 flex flex-col items-center h-full">
            <header className="w-full max-w-4xl mb-6">
                <AccountingPageHeader pageTitle="Time Card Entry" hubPath="/hr-manager" hubLabel="HR Hub" />
            </header>
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardDescription>Select an employee and add one or more time entries. This will create time logs that can be used to calculate gross pay during a payroll run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 max-w-sm">
                        <Label>Employee / Contractor</Label>
                        <Popover open={isEmployeePopoverOpen} onOpenChange={setIsEmployeePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedEmployeeId ? employees.find(e => e.id === selectedEmployeeId)?.name : "Select a worker..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search workers..." />
                                    <CommandList>
                                        <CommandEmpty>No worker found.</CommandEmpty>
                                        <CommandGroup>
                                            {employees.map(emp => (
                                                <CommandItem key={emp.id} value={emp.name} onSelect={() => { setSelectedEmployeeId(emp.id); setIsEmployeePopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0")} />
                                                    {emp.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        {timeEntries.map((entry, index) => (
                            <div key={entry.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1.5fr_2fr_auto] gap-4 items-end border p-4 rounded-lg">
                                <div className="space-y-2">
                                    <Label htmlFor={`log-date-${entry.id}`}>Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !entry.date && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {entry.date ? format(new Date(entry.date), "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={entry.date ? new Date(entry.date) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        date.setUTCHours(12);
                                                        handleEntryChange(entry.id, 'date', format(date, 'yyyy-MM-dd'));
                                                    }
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <div className="flex gap-2">
                                        <Select value={entry.startTime.hour} onValueChange={(v) => handleTimeChange(entry.id, 'startTime', 'hour', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={entry.startTime.minute} onValueChange={(v) => handleTimeChange(entry.id, 'startTime', 'minute', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                 <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <div className="flex gap-2">
                                        <Select value={entry.endTime.hour} onValueChange={(v) => handleTimeChange(entry.id, 'endTime', 'hour', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                         <Select value={entry.endTime.minute} onValueChange={(v) => handleTimeChange(entry.id, 'endTime', 'minute', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor={`log-description-${entry.id}`}>Description (Optional)</Label>
                                    <Input id={`log-description-${entry.id}`} placeholder="e.g., Regular shift" value={entry.description} onChange={(e) => handleEntryChange(entry.id, 'description', e.target.value)} />
                                </div>
                                <div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveEntry(entry.id)} disabled={timeEntries.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                         <Button variant="outline" onClick={handleAddEntry}>
                            <Plus className="mr-2 h-4 w-4" /> Add Time Entry
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveAllLogs} disabled={isSaving || !selectedEmployeeId} className="w-full">
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Log All Entries ({timeEntries.length})
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
