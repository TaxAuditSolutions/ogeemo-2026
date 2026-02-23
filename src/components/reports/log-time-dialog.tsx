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
import { LoaderCircle, Plus, ChevronsUpDown, Check, User, Users, Calendar as CalendarIcon, Clock, Info, Square, Mic, Save } from 'lucide-react';
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

    const selectedWorkerDisplay = workers.find(w => w.id === selectedWorkerId);
    const selectedContactDisplay = contacts.find(c => c.id === selectedContactId);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 shrink-0 border-b bg-muted/10 text-center sm:text-center">
                    <DialogTitle className="text-3xl font-bold font-headline text-primary">
                        {entryToEdit ? 'Edit' : 'Log'} Time Card Entry
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        A high-fidelity retrospective recording of an operational work session.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="max-w-5xl mx-auto p-8 space-y-10">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                    <User className="h-4 w-4" /> Worker Attribution (Payroll) *
                                </Label>
                                <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-12 w-full justify-between px-4 text-base" disabled={!!entryToEdit}>
                                            <span className="truncate">
                                                {selectedWorkerDisplay ? selectedWorkerDisplay.name : "Select a worker..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search workers..." />
                                            <CommandList>
                                                <CommandEmpty>No worker found.</CommandEmpty>
                                                <CommandGroup>
                                                    {workers.map(w => (
                                                        <CommandItem key={w.id} value={w.name} onSelect={() => { setSelectedWorkerId(w.id); setIsWorkerPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === w.id ? "opacity-100" : "opacity-0")}/>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">{w.name}</span>
                                                                {w.workerIdNumber && <span className="text-[10px] text-muted-foreground uppercase">ID: {w.workerIdNumber}</span>}
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
                                    <Users className="h-4 w-4" /> Client Association
                                </Label>
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-12 w-full justify-between px-4 text-base">
                                            <span className="truncate">
                                                {selectedContactDisplay ? (selectedContactDisplay.businessName ? `${selectedContactDisplay.name} - ${selectedContactDisplay.businessName}` : selectedContactDisplay.name) : "Internal / General Operations"}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <CommandInput placeholder="Search contacts..." />
                                            <CommandList>
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem onSelect={() => { setSelectedContactId(null); setIsContactPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", !selectedContactId ? "opacity-100" : "opacity-0")}/>
                                                        Internal / General Operations
                                                    </CommandItem>
                                                    {contacts.map(c => (
                                                        <CommandItem key={c.id} value={`${c.name} - ${c.businessName || ''}`} onSelect={() => { setSelectedContactId(c.id); setIsContactPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")}/>
                                                            <span className="font-medium">{c.name}</span>
                                                            {c.businessName && <span className="ml-2 text-muted-foreground">- {c.businessName}</span>}
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

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div className="space-y-2">
                                <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> Operational Date *
                                </Label>
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("h-12 w-full justify-start text-left font-normal px-4 text-base", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {date ? format(date, "PPPP") : <span>Pick a date</span>}
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
                                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={startTime.minute} onValueChange={(v) => setStartTime(p => ({...p, minute: v}))}>
                                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
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
                                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={endTime.minute} onValueChange={(v) => setEndTime(p => ({...p, minute: v}))}>
                                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-sm uppercase font-bold text-primary">Operational Summary (Subject)</Label>
                                <Input id="subject" placeholder="What was the main focus of this work session?" className="h-12 text-lg font-semibold" value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm uppercase font-bold text-primary">Breakdown of Tasks (Details) *</Label>
                                <Textarea id="description" placeholder="Detailed log of specific actions performed..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className="text-base leading-relaxed" />
                            </div>
                        </div>

                        <Separator />

                        <section className="p-8 border-2 border-primary/10 rounded-2xl bg-primary/5 shadow-inner">
                            <Label className="text-lg font-bold text-primary mb-6 block">Billing Configuration</Label>
                            <RadioGroup value={isBillable ? 'billable' : 'non-billable'} onValueChange={(v) => setIsBillable(v === 'billable')} className="flex space-x-12">
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="non-billable" id="rb1" className="h-5 w-5" />
                                    <Label htmlFor="rb1" className="text-base font-bold cursor-pointer">Non-Billable</Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="billable" id="rb2" className="h-5 w-5" />
                                    <Label htmlFor="rb2" className="text-base font-bold cursor-pointer">Billable to Client</Label>
                                </div>
                            </RadioGroup>
                            
                            {isBillable && (
                                <div className="mt-10 space-y-3 max-w-xs animate-in fade-in slide-in-from-top-4 duration-300">
                                    <Label htmlFor="rate" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Hourly Billable Rate ($/hr)</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xl">$</span>
                                        <Input 
                                            id="rate" 
                                            type="number" 
                                            value={billableRate} 
                                            onChange={(e) => setBillableRate(e.target.value === '' ? '' : Number(e.target.value))} 
                                            className="h-14 pl-10 text-2xl font-mono font-bold border-primary/20 shadow-sm" 
                                            placeholder="100.00" 
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic pl-1">This rate will be used to automatically calculate the total for client invoices.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground italic font-medium max-w-md">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Info className="h-5 w-5 text-primary" />
                        </div>
                        <span>This entry will be synchronized with the master Worker Time Log registry for payroll and billing automation.</span>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-14 px-8 text-lg">Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="h-14 px-12 font-bold shadow-2xl text-xl">
                            {isSaving ? <LoaderCircle className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                            {entryToEdit ? 'Update Entry' : 'Log Time Entry'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
