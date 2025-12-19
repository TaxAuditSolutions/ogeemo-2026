
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
import { addTimeLog, updateTimeLog, type TimeLog } from '@/services/timelog-service';
import { LoaderCircle, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, set, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Worker } from '@/services/payroll-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '../ui/textarea';


interface LogTimeDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    workers: Worker[];
    onTimeLogged: () => void;
    entryToEdit?: TimeLog | null;
    preselectedWorkerId?: string | null;
}

export function LogTimeDialog({ 
    isOpen, 
    onOpenChange, 
    workers, 
    onTimeLogged, 
    entryToEdit = null,
    preselectedWorkerId = null
}: LogTimeDialogProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [startTime, setStartTime] = useState({ hour: '09', minute: '00' });
    const [endTime, setEndTime] = useState({ hour: '17', minute: '00' });
    const [notes, setNotes] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (entryToEdit) {
                const start = new Date(entryToEdit.startTime);
                const end = new Date(entryToEdit.endTime);
                setDate(start);
                setStartTime({ hour: String(start.getHours()).padStart(2, '0'), minute: String(start.getMinutes()).padStart(2, '0') });
                setEndTime({ hour: String(end.getHours()).padStart(2, '0'), minute: String(end.getMinutes()).padStart(2, '0') });
                setNotes(entryToEdit.notes || '');
                setSelectedWorkerId(entryToEdit.workerId);
            } else {
                // Reset form for new entry, potentially with a preselected worker
                setDate(new Date());
                setStartTime({ hour: '09', minute: '00' });
                setEndTime({ hour: '17', minute: '00' });
                setNotes('');
                setSelectedWorkerId(preselectedWorkerId);
            }
        }
    }, [isOpen, entryToEdit, preselectedWorkerId]);

    const handleSave = async () => {
        if (!user || !selectedWorkerId || !date) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a worker and a date.' });
            return;
        }

        const selectedWorker = workers.find(w => w.id === selectedWorkerId);
        if (!selectedWorker) {
             toast({ variant: 'destructive', title: 'Invalid Worker', description: 'Could not find the selected worker.' });
            return;
        }

        const finalStartTime = set(date, { hours: parseInt(startTime.hour), minutes: parseInt(startTime.minute), seconds: 0, milliseconds: 0 });
        const finalEndTime = set(date, { hours: parseInt(endTime.hour), minutes: parseInt(endTime.minute), seconds: 0, milliseconds: 0 });

        if (finalEndTime <= finalStartTime) {
            toast({ variant: 'destructive', title: 'Invalid Times', description: 'End time must be after start time.' });
            return;
        }

        const durationSeconds = (finalEndTime.getTime() - finalStartTime.getTime()) / 1000;

        setIsSaving(true);
        try {
            if (entryToEdit) {
                const updatedData = {
                    workerId: selectedWorkerId,
                    workerName: selectedWorker.name,
                    startTime: finalStartTime,
                    endTime: finalEndTime,
                    durationSeconds,
                    notes: notes,
                };
                await updateTimeLog(entryToEdit.id, updatedData);
                toast({ title: "Time Log Updated" });
            } else {
                 const logData = {
                    workerId: selectedWorkerId,
                    workerName: selectedWorker.name,
                    startTime: finalStartTime,
                    endTime: finalEndTime,
                    durationSeconds,
                    notes: notes,
                    userId: user.uid,
                };
                await addTimeLog(logData);
                toast({ title: "Time Logged Successfully" });
            }
            onTimeLogged();
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: format(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes).padStart(2, '0'), label: `:${String(minutes).padStart(2, '0')}` }; });
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{entryToEdit ? 'Edit' : 'Log'} Time Card Entry</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                     <div className="space-y-2">
                        <Label>Employee / Contractor *</Label>
                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between" disabled={!!entryToEdit}>
                                    {selectedWorkerId ? workers.find(e => e.id === selectedWorkerId)?.name : "Select a worker..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>No worker found.</CommandEmpty><CommandGroup>{workers.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedWorkerId(c.id); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Date *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time *</Label>
                            <div className="flex gap-2">
                                <Select value={startTime.hour} onValueChange={(v) => setStartTime(p => ({...p, hour: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                <Select value={startTime.minute} onValueChange={(v) => setStartTime(p => ({...p, minute: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>End Time *</Label>
                            <div className="flex gap-2">
                                <Select value={endTime.hour} onValueChange={(v) => setEndTime(p => ({...p, hour: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                <Select value={endTime.minute} onValueChange={(v) => setEndTime(p => ({...p, minute: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Notes (Optional)</Label>
                        <Textarea id="description" placeholder="e.g., On-site client meeting, regular shift, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {entryToEdit ? 'Save Changes' : 'Log Time'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
