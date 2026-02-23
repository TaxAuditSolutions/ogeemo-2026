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
import { LoaderCircle, Plus, ChevronsUpDown, Check, User, Users, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatTime } from '@/lib/utils';
import { format, set } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Worker } from '@/services/payroll-service';
import { type Contact, getContacts } from '@/services/contact-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { CustomCalendar } from '../ui/custom-calendar';

interface LogTimeDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    workers: Worker[]; 
    onTimeLogged: () => void;
    entryToEdit?: TimeLog | null;
    preselectedWorkerId?: string | null;
    preselectedContactId?: string | null;
}

export function LogTimeDialog({
    isOpen,
    onOpenChange,
    workers,
    onTimeLogged,
    entryToEdit = null,
    preselectedWorkerId = null,
    preselectedContactId = null,
}: LogTimeDialogProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [startTime, setStartTime] = useState({ hour: '09', minute: '00' });
    const [endTime, setEndTime] = useState({ hour: '17', minute: '00' });
    const [subject, setSubject] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [isBillable, setIsBillable] = useState(false);
    const [billableRate, setBillableRate] = useState<number | ''>(100);
    const [contacts, setContacts] = useState<Contact[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && user) {
            getContacts(user.uid).then(setContacts);
            
            if (entryToEdit) {
                const start = new Date(entryToEdit.startTime);
                const end = new Date(entryToEdit.endTime);
                setDate(start);
                setStartTime({ hour: String(start.getHours()).padStart(2, '0'), minute: String(start.getMinutes()).padStart(2, '0') });
                setEndTime({ hour: String(end.getHours()).padStart(2, '0'), minute: String(end.getMinutes()).padStart(2, '0') });
                setSubject(entryToEdit.subject || '');
                setNotes(entryToEdit.notes || '');
                setSelectedWorkerId(entryToEdit.workerId);
                setSelectedContactId(entryToEdit.contactId || null);
                setIsBillable(entryToEdit.isBillable || false);
                setBillableRate(entryToEdit.billableRate || 0);
            } else {
                setDate(new Date());
                setStartTime({ hour: '09', minute: '00' });
                setEndTime({ hour: '17', minute: '00' });
                setSubject('');
                setNotes('');
                setSelectedWorkerId(preselectedWorkerId || user.uid);
                setSelectedContactId(preselectedContactId);
                setIsBillable(false);
                setBillableRate(100);
            }
        }
    }, [isOpen, entryToEdit, preselectedWorkerId, preselectedContactId, user]);

    const handleSave = async () => {
        if (!user || !selectedWorkerId || !date) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a worker and a date.' });
            return;
        }

        if (!notes.trim()) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide details of the work done.' });
            return;
        }

        const selectedWorker = workers.find(w => w.id === selectedWorkerId);
        if (!selectedWorker) {
             toast({ variant: 'destructive', title: 'Invalid Worker', description: 'Could not find the selected worker.' });
            return;
        }

        const selectedContact = contacts.find(c => c.id === selectedContactId);

        const finalStartTime = set(date, { hours: parseInt(startTime.hour), minutes: parseInt(startTime.minute), seconds: 0, milliseconds: 0 });
        const finalEndTime = set(date, { hours: parseInt(endTime.hour), minutes: parseInt(endTime.minute), seconds: 0, milliseconds: 0 });

        if (finalEndTime <= finalStartTime) {
            toast({ variant: 'destructive', title: 'Invalid Times', description: 'End time must be after start time.' });
            return;
        }

        const durationSeconds = (finalEndTime.getTime() - finalStartTime.getTime()) / 1000;

        setIsSaving(true);
        try {
            const baseData = {
                workerId: selectedWorkerId,
                workerName: selectedWorker.name,
                contactId: selectedContactId,
                contactName: selectedContact?.name || null,
                startTime: finalStartTime,
                endTime: finalEndTime,
                durationSeconds,
                subject: subject.trim(),
                notes: notes,
                isBillable,
                billableRate: isBillable ? Number(billableRate) || 0 : 0,
            };

            if (entryToEdit) {
                await updateTimeLog(entryToEdit.id, baseData);
                toast({ title: "Time Log Updated" });
            } else {
                 const logData = {
                    ...baseData,
                    userId: user.uid,
                    status: 'unprocessed' as const,
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

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    const selectedContact = contacts.find(c => c.id === selectedContactId);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 shrink-0 border-b bg-muted/10 text-center sm:text-center">
                    <DialogTitle className="text-2xl font-bold font-headline text-primary">
                        {entryToEdit ? 'Edit' : 'Log'} Time Card Entry
                    </DialogTitle>
                    <DialogDescription>
                        A high-fidelity retrospective recording of an operational work session.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="p-8 space-y-8">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                    <User className="h-4 w-4" /> Worker (Payroll) *
                                </Label>
                                <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-11 w-full justify-between" disabled={!!entryToEdit}>
                                            <span className="truncate">
                                                {selectedWorker ? selectedWorker.name : "Select a worker..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search workers..." />
                                            <CommandList>
                                                <CommandEmpty>No worker found.</CommandEmpty>
                                                <CommandGroup>
                                                    {workers.map(w => (
                                                        <CommandItem key={w.id} value={w.name} onSelect={() => { setSelectedWorkerId(w.id); setIsWorkerPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === w.id ? "opacity-100" : "opacity-0")}/>
                                                            <div className="flex flex-col">
                                                                <span>{w.name}</span>
                                                                {w.workerIdNumber && <span className="text-[10px] text-muted-foreground">ID: {w.workerIdNumber}</span>}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Client Attribution
                                </Label>
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-11 w-full justify-between">
                                            <span className="truncate">
                                                {selectedContact ? selectedContact.name : "Internal / No Client"}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search clients..." />
                                            <CommandList>
                                                <CommandEmpty>No client found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem onSelect={() => { setSelectedContactId(null); setIsContactPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", !selectedContactId ? "opacity-100" : "opacity-0")}/>
                                                        Internal / No Client
                                                    </CommandItem>
                                                    {contacts.map(c => (
                                                        <CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedContactId(c.id); setIsContactPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")}/>
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </section>

                        <Separator />

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> Activity Date *
                                </Label>
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("h-11 w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CustomCalendar mode="single" selected={date} onSelect={(d) => { setDate(d); setIsDatePickerOpen(false); }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> Start Time
                                    </Label>
                                    <div className="flex gap-1">
                                        <Select value={startTime.hour} onValueChange={(v) => setStartTime(p => ({...p, hour: v}))}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={startTime.minute} onValueChange={(v) => setStartTime(p => ({...p, minute: v}))}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> End Time
                                    </Label>
                                    <div className="flex gap-1">
                                        <Select value={endTime.hour} onValueChange={(v) => setEndTime(p => ({...p, hour: v}))}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={endTime.minute} onValueChange={(v) => setEndTime(p => ({...p, minute: v}))}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-sm uppercase font-bold text-primary">Subject / Summary</Label>
                                <Input id="subject" placeholder="High-level description of the work session..." className="h-11" value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm uppercase font-bold text-primary">Operational Details *</Label>
                                <Textarea id="description" placeholder="Comprehensive breakdown of tasks performed..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
                            </div>
                        </div>

                        <Separator />

                        <section className="p-6 border-2 border-primary/10 rounded-2xl bg-primary/5">
                            <Label className="text-sm uppercase font-bold text-primary mb-4 block">Billing Configuration</Label>
                            <RadioGroup value={isBillable ? 'billable' : 'non-billable'} onValueChange={(v) => setIsBillable(v === 'billable')} className="flex space-x-8">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="non-billable" id="rb1"/>
                                    <Label htmlFor="rb1" className="font-semibold cursor-pointer">Non-Billable</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="billable" id="rb2"/>
                                    <Label htmlFor="rb2" className="font-semibold cursor-pointer">Billable</Label>
                                </div>
                            </RadioGroup>
                            {isBillable && (
                                <div className="mt-6 space-y-2 max-w-xs animate-in fade-in-50">
                                    <Label htmlFor="rate" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Hourly Billable Rate ($/hr)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                                        <Input id="rate" type="number" value={billableRate} onChange={(e) => setBillableRate(e.target.value === '' ? '' : Number(e.target.value))} className="h-11 pl-8 font-mono font-bold" placeholder="100.00" />
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground italic font-medium">
                        <Info className="h-4 w-4 text-primary" />
                        Synchronizing with the Worker Time Log registry.
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="h-11 px-8 font-bold shadow-lg">
                            {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {entryToEdit ? 'Save Changes' : 'Log Operational Time'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
