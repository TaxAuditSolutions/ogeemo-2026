
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { LoaderCircle, Plus, ChevronsUpDown, Check, User, Users, Calendar as CalendarIcon, Clock, Info, Square, Mic, Save, UserPlus, X } from 'lucide-react';
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
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';

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
    const [endTime, set鎖Time] = useState({ hour: '17', minute: '00' });
    const [subject, setSubject] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [isBillable, setIsBillable] = useState(false);
    const [billableRate, setBillableRate] = useState<number | ''>(100);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isContactFormOpen, setIsContactFormOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();

    const loadDropdownData = useCallback(async () => {
        if (!user) return;
        setIsLoadingData(true);
        try {
            const [fetchedContacts, fetchedFolders, fetchedCompanies, fetchedIndustries] = await Promise.all([
                getContacts(user.uid),
                getContactFolders(user.uid),
                getCompanies(user.uid),
                getIndustries(user.uid),
            ]);
            setContacts(fetchedContacts);
            setContactFolders(fetchedFolders);
            setCompanies(fetchedCompanies);
            setCustomIndustries(fetchedIndustries);
        } catch (error: any) {
            console.error("Failed to load dialog support data:", error);
        } finally {
            setIsLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen && user) {
            loadDropdownData();
            
            if (entryToEdit) {
                const start = new Date(entryToEdit.startTime);
                const end = new Date(entryToEdit.endTime);
                setDate(start);
                setStartTime({ hour: String(start.getHours()).padStart(2, '0'), minute: String(start.getMinutes()).padStart(2, '0') });
                set鎖Time({ hour: String(end.getHours()).padStart(2, '0'), minute: String(end.getMinutes()).padStart(2, '0') });
                setSubject(entryToEdit.subject || '');
                setNotes(entryToEdit.notes || '');
                setSelectedWorkerId(entryToEdit.workerId);
                setSelectedContactId(entryToEdit.contactId || null);
                setIsBillable(entryToEdit.isBillable || false);
                setBillableRate(entryToEdit.billableRate || 0);
            } else {
                setDate(new Date());
                setStartTime({ hour: '09', minute: '00' });
                set鎖Time({ hour: '17', minute: '00' });
                setSubject('');
                setNotes('');
                setSelectedWorkerId(preselectedWorkerId || user.uid);
                setSelectedContactId(preselectedContactId);
                setIsBillable(false);
                setBillableRate(100);
            }
        }
    }, [isOpen, entryToEdit, preselectedWorkerId, preselectedContactId, user, loadDropdownData]);

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

    const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
        if (isEditing) {
            setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
        } else {
            setContacts(prev => [...prev, savedContact]);
        }
        setSelectedContactId(savedContact.id);
        setIsContactFormOpen(false);
    };

    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: format(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes).padStart(2, '0'), label: `:${String(minutes).padStart(2, '0')}` }; });

    const selectedWorkerDisplay = workers.find(w => w.id === selectedWorkerId);
    const selectedContactDisplay = contacts.find(c => c.id === selectedContactId);

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 shrink-0 border-b bg-muted/10 text-center sm:text-center">
                    <DialogTitle className="text-2xl font-bold font-headline text-primary">
                        {entryToEdit ? 'Edit' : 'Log'} Time Card Entry
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        High-fidelity retrospective recording of an operational work session.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="max-w-5xl mx-auto p-6 space-y-3">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                                    <User className="h-3 w-3" /> Worker Attribution (Payroll) *
                                </Label>
                                <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-10 w-full justify-between px-3 text-sm" disabled={!!entryToEdit}>
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
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                                    <Users className="h-3 w-3" /> Client Association
                                </Label>
                                <div className="flex gap-2">
                                    <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" className="h-10 flex-1 justify-between px-3 text-sm">
                                                <span className="truncate">
                                                    {selectedContactDisplay ? (selectedContactDisplay.businessName ? `${selectedContactDisplay.name} - ${selectedContactDisplay.businessName}` : selectedContactDisplay.name) : "Select/Add Contact"}
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                                <CommandInput placeholder="Search contacts..." />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => { setIsContactPopoverOpen(false); setIsContactFormOpen(true); }}>
                                                            <UserPlus className="mr-2 h-4 w-4" /> Add New Contact
                                                        </Button>
                                                    </CommandEmpty>
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
                                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsContactFormOpen(true)}>
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                                    <CalendarIcon className="h-3 w-3" /> Operational Date *
                                </Label>
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("h-10 w-full justify-start text-left font-normal px-3 text-sm", !date && "text-muted-foreground")}>
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
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                                        <Clock className="h-3 w-3" /> Start Time
                                    </Label>
                                    <div className="flex gap-1">
                                        <Select value={startTime.hour} onValueChange={(v) => setStartTime(p => ({...p, hour: v}))}>
                                            <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={startTime.minute} onValueChange={(v) => setStartTime(p => ({...p, minute: v}))}>
                                            <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                                        <Clock className="h-3 w-3" /> End Time
                                    </Label>
                                    <div className="flex gap-1">
                                        <Select value={endTime.hour} onValueChange={(v) => set鎖Time(p => ({...p, hour: v}))}>
                                            <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={endTime.minute} onValueChange={(v) => set鎖Time(p => ({...p, minute: v}))}>
                                            <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="space-y-2">
                            <div className="space-y-1">
                                <Label htmlFor="subject" className="text-[10px] uppercase font-bold text-primary">Operational Summary (Subject)</Label>
                                <Input id="subject" placeholder="What was the main focus of this work session?" className="h-10 text-base font-semibold" value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="description" className="text-[10px] uppercase font-bold text-primary">Breakdown of Tasks (Details) *</Label>
                                <Textarea id="description" placeholder="Detailed log of specific actions performed..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="text-sm leading-relaxed" />
                            </div>
                        </div>

                        <section className="p-3 border rounded-xl bg-primary/5 shadow-inner">
                            <Label className="text-xs font-bold text-primary mb-2 block uppercase tracking-wider">Billing Configuration</Label>
                            <RadioGroup value={isBillable ? 'billable' : 'non-billable'} onValueChange={(v) => setIsBillable(v === 'billable')} className="flex space-x-8">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="non-billable" id="rb1" className="h-4 w-4" />
                                    <Label htmlFor="rb1" className="text-sm font-bold cursor-pointer">Non-Billable</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="billable" id="rb2" className="h-4 w-4" />
                                    <Label htmlFor="rb2" className="text-sm font-bold cursor-pointer">Billable to Client</Label>
                                </div>
                            </RadioGroup>
                            
                            {isBillable && (
                                <div className="mt-2 space-y-1 max-w-[200px] animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Label htmlFor="rate" className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Hourly Rate ($/hr)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                                        <Input 
                                            id="rate" 
                                            type="number" 
                                            value={billableRate} 
                                            onChange={(e) => setBillableRate(e.target.value === '' ? '' : Number(e.target.value))} 
                                            className="h-9 pl-7 text-base font-mono font-bold border-primary/20" 
                                            placeholder="100.00" 
                                        />
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground italic font-medium max-w-md">
                        <div className="p-1 bg-primary/10 rounded-lg">
                            <Info className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>Synchronization with the master Worker Time Log registry is automated.</span>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-12 px-6">Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="h-12 px-10 font-bold shadow-xl text-lg">
                            {isSaving ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            {entryToEdit ? 'Update Entry' : 'Log Time Entry'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <ContactFormDialog
            isOpen={isContactFormOpen}
            onOpenChange={setIsContactFormOpen}
            contactToEdit={null}
            folders={contactFolders}
            onFoldersChange={setContactFolders}
            onSave={handleContactSave}
            companies={companies}
            onCompaniesChange={setCompanies}
            customIndustries={customIndustries}
            onCustomIndustriesChange={setCustomIndustries}
        />
        </>
    );
}
