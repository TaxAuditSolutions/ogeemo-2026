
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { addTimeLog } from '@/services/timelog-service'; // UPDATED
import { LoaderCircle, Plus, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, set } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Worker } from '@/services/payroll-service';
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

interface LogTimeDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    workerId: string | null;
    workers: Worker[];
    onTimeLogged: () => void; // Callback to refresh the report
}

export function LogTimeDialog({ isOpen, onOpenChange, workerId: initialWorkerId, workers, onTimeLogged }: LogTimeDialogProps) {
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
        if (!user || !selectedWorkerId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an employee.' });
            return;
        }
        if (timeEntries.length === 0) {
            toast({ variant: 'destructive', title: 'No Entries', description: 'Please add at least one time entry to log.' });
            return;
        }

        const selectedWorker = workers.find(w => w.id === selectedWorkerId);
        if (!selectedWorker) {
            toast({ variant: 'destructive', title: 'Invalid Worker', description: 'Could not find the selected worker.' });
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
                const startTime = set(logDate, { hours: parseInt(entry.startTime.hour), minutes: parseInt(entry.startTime.minute), seconds: 0, milliseconds: 0 });
                const endTime = set(logDate, { hours: parseInt(entry.endTime.hour), minutes: parseInt(entry.endTime.minute), seconds: 0, milliseconds: 0 });

                if (endTime <= startTime) {
                    toast({ variant: 'destructive', title: 'Invalid Times', description: `End time must be after start time for entry on ${entry.date}.` });
                    continue;
                }

                const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
                
                const logData = {
                    workerId: selectedWorkerId,
                    workerName: selectedWorker.name,
                    startTime,
                    endTime,
                    durationSeconds,
                    notes: entry.description,
                    userId: user.uid,
                };

                await addTimeLog(logData);
                successfulLogs++;
            }
            
            if (successfulLogs > 0) {
                toast({ title: "Time Logged Successfully", description: `${successfulLogs} time entries have been saved.` });
                onTimeLogged(); // Call the callback to refresh the report
                onOpenChange(false); // Close the dialog
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
                    <DialogDescription>
                        Add one or more time entries for the selected worker. This will create time logs that can be used to calculate gross pay.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    
                    <div className="space-y-2 max-w-sm">
                        <Label>Employee / Contractor</Label>
                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedWorkerId ? workers.find(e => e.id === selectedWorkerId)?.name : "Select a worker..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>No worker found.</CommandEmpty><CommandGroup>{workers.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedWorkerId(c.id); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {timeEntries.map((entry) => (
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
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entry.date ? new Date(entry.date) : undefined} onSelect={(date) => date && handleEntryChange(entry.id, 'date', format(date, 'yyyy-MM-dd'))} initialFocus /></PopoverContent>
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
                        <Plus className="mr-2 h-4 w-4" /> Add Another Entry
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSaveAllLogs} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Log All Entries ({timeEntries.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
