
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    LoaderCircle, 
    Save, 
    ChevronsUpDown, 
    Check, 
    Plus, 
    X, 
    Info, 
    Clock, 
    Play, 
    Pause, 
    Trash2, 
    MoreVertical, 
    Pencil, 
    MessageSquare, 
    RefreshCw, 
    BellRing, 
    Mail, 
    Inbox,
    CheckCircle, 
    User, 
    Square,
    Calendar as CalendarIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { type Project, type Event as TaskEvent, type TimeSession, type StoredTimerState } from '@/types/calendar-types';
import { type Contact } from '@/services/contact-service';
import { addTask, getProjects, addProject, updateProject, getTaskById, updateTask, deleteTask } from '@/services/project-service';
import { getContacts } from '@/services/contact-service';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatTime } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/dropdown-menu";
import { getIndustries, type Industry } from '@/services/industry-service';
import { getUserProfile, type UserProfile } from '@/services/user-profile-service';
import { format as formatDate, set, addMinutes, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';
import { CustomCalendar } from '../ui/custom-calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const TIMER_STORAGE_KEY = 'activeTimeManagerEntry';

export function TimeManagerView() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [projects, setProjects] = React.useState<Project[]>([]);
    const [contacts, setContacts] = React.useState<Contact[]>([]);
    const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
    const [companies, setCompanies] = React.useState<Company[]>([]);
    const [workers, setWorkers] = React.useState<Worker[]>([]);
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);

    // Form state
    const [subject, setSubject] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);
    const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(null);
    const [isBillable, setIsBillable] = React.useState(false);
    const [billableRate, setBillableRate] = React.useState<number | ''>(100);
    
    // Scheduling state
    const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
    const [startHour, setStartHour] = React.useState<string | undefined>(undefined);
    const [startMinute, setStartMinute] = React.useState<string | undefined>(undefined);
    const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
    const [endHour, setEndHour] = React.useState<string | undefined>(undefined);
    const [endMinute, setEndMinute] = React.useState<string | undefined>(undefined);
    const [isAllDay, setIsAllDay] = React.useState(false);
    
    const [isStartPickerOpen, setIsStartPickerOpen] = React.useState(false);
    const [isEndPickerOpen, setIsEndPickerOpen] = React.useState(false);

    // Dialog state
    const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false);
    const [contactAction, setContactAction] = React.useState<string>('select');
    const [isProjectPopoverOpen, setIsProjectPopoverOpen] = React.useState(false);
    const [projectAction, setProjectAction] = React.useState<string>('select');
    const [newProjectName, setNewProjectName] = React.useState('');
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = React.useState(false);
    
    const [eventToEdit, setEventToEdit] = React.useState<TaskEvent | null>(null);
    
    // Timer state
    const [timerState, setTimerState] = React.useState<StoredTimerState | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
    const [sessions, setSessions] = React.useState<TimeSession[]>([]);
    const [currentSessionNotes, setCurrentSessionNotes] = React.useState('');
    
    // Session Edit state
    const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = React.useState(false);
    const [sessionToEdit, setSessionToEdit] = React.useState<TimeSession | null>(null);
    const [editSessionHours, setEditSessionHours] = React.useState<number | ''>('');
    const [editSessionMinutes, setEditSessionMinutes] = React.useState<number | ''>('');
    const [editSessionNotes, setEditSessionNotes] = React.useState('');
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const hasStartedTimerRef = useRef(false);
    const subjectInputRef = useRef<HTMLInputElement>(null);

    // Initial client-side setup
    useEffect(() => {
        const now = new Date();
        setStartDate(now);
        setStartHour(formatDate(now, 'HH'));
        setStartMinute(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'));
        
        // End time is left empty by default as requested
        setEndDate(undefined);
        setEndHour(undefined);
        setEndMinute(undefined);
    }, []);

    const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: formatDate(set(new Date(), { hours: i }), 'h a') })), []);
    const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes).padStart(2, '0'), label: `:${String(minutes).padStart(2, '0')}` }; }), []);
    
    const totalAccumulatedSeconds = useMemo(() => sessions.reduce((acc, session) => acc + session.durationSeconds, 0), [sessions]);
    const totalTime = useMemo(() => totalAccumulatedSeconds + elapsedSeconds, [totalAccumulatedSeconds, elapsedSeconds]);

    const createAndSaveNewEvent = useCallback(async (): Promise<TaskEvent | null> => {
        if (!user) return null;
        const eventData: Omit<TaskEvent, 'id'> = {
            title: subject.trim() || "Untitled Session",
            description: notes,
            status: 'inProgress',
            position: 0,
            projectId: selectedProjectId,
            contactId: selectedContactId,
            workerId: selectedWorkerId || user.uid,
            isBillable: isBillable,
            billableRate: isBillable ? Number(billableRate) || 0 : 0,
            userId: user.uid,
        };
        try {
            const newEvent = await addTask(eventData);
            setEventToEdit(newEvent);
            return newEvent;
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to start session", description: error.message });
            return null;
        }
    }, [user, subject, notes, selectedProjectId, selectedContactId, selectedWorkerId, isBillable, billableRate, toast]);

    const handleStartTimer = useCallback(async () => {
        let currentEvent = eventToEdit;
        if (!currentEvent) currentEvent = await createAndSaveNewEvent();
        if (currentEvent) {
            const storedState: StoredTimerState = {
                eventId: currentEvent.id,
                notes: currentEvent.title,
                isActive: true,
                isPaused: false,
                startTime: Date.now(),
                pauseTime: null,
                totalPausedDuration: 0,
            };
            localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(storedState));
            window.dispatchEvent(new Event('storage'));
        }
    }, [eventToEdit, createAndSaveNewEvent]);
    
    const handlePauseTimer = useCallback(() => {
        const savedStateRaw = localStorage.getItem(TIMER_STORAGE_KEY);
        if (savedStateRaw) {
            const savedState: StoredTimerState = JSON.parse(savedStateRaw);
            if (savedState.isActive && !savedState.isPaused) {
                const newState = { ...savedState, isPaused: true, pauseTime: Date.now() };
                localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newState));
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, []);

    const handleResumeTimer = useCallback(() => {
        const savedStateRaw = localStorage.getItem(TIMER_STORAGE_KEY);
        if (savedStateRaw) {
            const savedState: StoredTimerState = JSON.parse(savedStateRaw);
            if (savedState.isActive && savedState.isPaused) {
                const pausedDuration = Math.floor((Date.now() - savedState.pauseTime!) / 1000);
                const newState: StoredTimerState = {
                    ...savedState,
                    isPaused: false,
                    pauseTime: null,
                    totalPausedDuration: savedState.totalPausedDuration + pausedDuration,
                };
                localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newState));
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, []);

    const handleSaveEvent = useCallback(async (andClose: boolean = false) => {
        if (!user || !subject.trim()) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter a subject for the event.' });
            return;
        }
        let start: Date | null = null;
        let end: Date | null = null;
        let isScheduled = false;
        if (startDate) {
            if (isAllDay) {
                start = startOfDay(startDate);
                end = endOfDay(endDate || startDate);
            } else {
                const hour = startHour ? parseInt(startHour) : new Date().getHours();
                const minute = startMinute ? parseInt(startMinute) : new Date().getMinutes();
                start = set(startDate, { hours: hour, minutes: minute });
                const finalEndDate = endDate || startDate;
                const finalEndHour = endHour ? parseInt(endHour) : hour;
                const finalEndMinute = endMinute ? parseInt(endMinute) : minute;
                end = set(finalEndDate, { hours: finalEndHour, minutes: finalEndMinute });
                if (end <= start) end = addMinutes(start, 30);
            }
            isScheduled = true;
        }
        const eventData: Partial<Omit<TaskEvent, 'id' | 'userId'>> = {
            title: subject,
            description: notes,
            start,
            end,
            isScheduled,
            status: isScheduled ? 'todo' : 'inProgress',
            projectId: selectedProjectId === 'inbox' ? null : selectedProjectId,
            contactId: selectedContactId,
            workerId: selectedWorkerId || user.uid,
            duration: totalTime,
            sessions: sessions,
            isBillable: isBillable,
            billableRate: isBillable ? (Number(billableRate) || 0) : 0,
        };
        try {
            if (eventToEdit) {
                await updateTask(eventToEdit.id, eventData);
                toast({ title: "Event Updated" });
            } else {
                const newEvent = await addTask({ ...eventData as Omit<TaskEvent, 'id'>, userId: user.uid });
                setEventToEdit(newEvent);
                toast({ title: "Event Saved" });
            }
            if (andClose) router.back();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to save event', description: error.message });
        }
    }, [user, subject, notes, startDate, startHour, startMinute, endDate, endHour, endMinute, isAllDay, selectedProjectId, selectedContactId, selectedWorkerId, isBillable, billableRate, sessions, eventToEdit, toast, router, totalTime]);

    const handleSaveAndNew = async () => {
        await handleSaveEvent(false);
        const now = new Date();
        setSubject(""); setNotes(""); setSelectedProjectId(null); setSelectedContactId(null);
        setIsBillable(false); setBillableRate(100); setStartDate(now);
        setStartHour(formatDate(now, 'HH')); setStartMinute(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'));
        
        setEndDate(undefined); setEndHour(undefined); setEndMinute(undefined);
        setIsAllDay(false);
        setSessions([]); setEventToEdit(null);
        localStorage.removeItem(TIMER_STORAGE_KEY);
        window.dispatchEvent(new Event('storage'));
        router.replace('/master-mind');
        setTimeout(() => subjectInputRef.current?.focus(), 100);
    };

    const handleLogCurrentSession = async () => {
        if (!timerState?.isActive || elapsedSeconds <= 0) {
            toast({ variant: 'destructive', title: 'No Time to Log', description: 'The timer is not running or has no elapsed time.' });
            return;
        }
        const newSession: TimeSession = {
            id: `session_${Date.now()}`,
            startTime: new Date(timerState.startTime),
            endTime: new Date(),
            durationSeconds: elapsedSeconds,
            notes: currentSessionNotes,
        };
        setSessions(prev => [...prev, newSession]);
        setCurrentSessionNotes('');
        localStorage.removeItem(TIMER_STORAGE_KEY);
        window.dispatchEvent(new Event('storage'));
        await handleSaveEvent(false);
        toast({ title: 'Session Logged' });
    };

    const handleOpenEditSession = (session: TimeSession) => {
        setSessionToEdit(session);
        setEditSessionHours(Math.floor(session.durationSeconds / 3600));
        setEditSessionMinutes(Math.floor((session.durationSeconds % 3600) / 60));
        setEditSessionNotes(session.notes || '');
        setIsEditSessionDialogOpen(true);
    };

    const handleSaveSession = () => {
        if (!sessionToEdit) return;
        const newDurationSeconds = (Number(editSessionHours) * 3600) + (Number(editSessionMinutes) * 60);
        if (newDurationSeconds <= 0) return;
        setSessions(prev => prev.map(s => s.id === sessionToEdit.id ? { ...sessionToEdit, durationSeconds: newDurationSeconds, notes: editSessionNotes } : s));
        setIsEditSessionDialogOpen(false);
    };

    const handleDeleteEvent = async () => {
        if (!eventToEdit) return;
        try {
            await deleteTask(eventToEdit.id);
            toast({ title: 'Event Deleted' });
            router.back();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete event', description: error.message });
        }
    };

    const handleOpenGmail = () => {
        const selectedContact = contacts.find(c => c.id === selectedContactId);
        const recipient = selectedContact?.email || "";
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(notes)}`, '_blank', 'noopener,noreferrer');
    };

    const loadInitialData = React.useCallback(async () => {
        if (!user) { setIsLoadingData(false); return; }
        setIsLoadingData(true);
        try {
            const [proj, cont, fold, comp, ind, wrks] = await Promise.all([
                getProjects(user.uid), getContacts(), ensureSystemFolders(user.uid), getCompanies(user.uid), getIndustries(user.uid), getWorkers(user.uid)
            ]);
            setProjects(proj); setContacts(cont); setContactFolders(fold); setCompanies(comp); setCustomIndustries(ind); setWorkers(wrks);
            setSelectedWorkerId(user.uid);
            const eventIdParam = searchParams.get('eventId');
            if (eventIdParam) {
                const eventData = await getTaskById(eventIdParam);
                if (eventData) {
                    setEventToEdit(eventData); setSubject(eventData.title); setNotes(eventData.description || "");
                    setSelectedProjectId(eventData.projectId || null); setSelectedContactId(eventData.contactId || null);
                    setSelectedWorkerId(eventData.workerId || user.uid); setIsBillable(eventData.isBillable || false);
                    setBillableRate(eventData.billableRate || 0); setSessions(eventData.sessions || []);
                    if (eventData.start) {
                        const sDate = new Date(eventData.start);
                        setStartDate(sDate); setStartHour(String(sDate.getHours()).padStart(2, '0')); setStartMinute(String(sDate.getMinutes()).padStart(2, '0'));
                    }
                    if (eventData.end) {
                        const eDate = new Date(eventData.end);
                        setEndDate(eDate); setEndHour(String(eDate.getHours()).padStart(2, '0')); setEndMinute(String(eDate.getMinutes()).padStart(2, '0'));
                    }
                }
            } else {
                const sParam = searchParams.get('start');
                if (searchParams.get('title')) setSubject(searchParams.get('title')!);
                if (searchParams.get('notes')) setNotes(searchParams.get('notes')!);
                if (searchParams.get('contactId')) setSelectedContactId(searchParams.get('contactId'));
                if (searchParams.get('projectId')) setSelectedProjectId(searchParams.get('projectId'));
                if (sParam) {
                    const sDate = parseISO(sParam);
                    if (isValid(sDate)) {
                        setStartDate(sDate); setStartHour(String(sDate.getHours()).padStart(2, '0')); setStartMinute(String(sDate.getMinutes()).padStart(2, '0'));
                    }
                }
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoadingData(false);
        }
    }, [user, searchParams, toast]);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);
    
    useEffect(() => {
        if (searchParams.get('startTimer') === 'true' && eventToEdit && !hasStartedTimerRef.current) {
            hasStartedTimerRef.current = true;
            handleStartTimer();
        }
    }, [searchParams, eventToEdit, handleStartTimer]);

    const syncWithGlobalTimer = useCallback(() => {
        try {
            const savedStateRaw = localStorage.getItem(TIMER_STORAGE_KEY);
            if (savedStateRaw) {
                const savedState: StoredTimerState = JSON.parse(savedStateRaw);
                if (eventToEdit && savedState.eventId === eventToEdit.id) {
                    setTimerState(savedState);
                    if (savedState.isActive) {
                        const now = Date.now();
                        const pausedDuration = savedState.isPaused && savedState.pauseTime ? Math.floor((now - savedState.pauseTime) / 1000) : 0;
                        const elapsed = Math.floor((now - savedState.startTime) / 1000) - savedState.totalPausedDuration - pausedDuration;
                        setElapsedSeconds(elapsed > 0 ? elapsed : 0);
                    }
                } else { setTimerState(null); setElapsedSeconds(0); }
            } else { setTimerState(null); setElapsedSeconds(0); }
        } catch (e) {}
    }, [eventToEdit]);
    
    useEffect(() => {
        syncWithGlobalTimer();
        window.addEventListener('storage', syncWithGlobalTimer);
        const interval = setInterval(syncWithGlobalTimer, 1000);
        return () => { window.removeEventListener('storage', syncWithGlobalTimer); clearInterval(interval); };
    }, [syncWithGlobalTimer]);
    
    const handleCreateProject = async () => {
        if (!user || !newProjectName.trim()) return;
        try {
            const newProject = await addProject({ name: newProjectName, userId: user.uid, status: 'planning', createdAt: new Date() });
            setProjects(prev => [newProject, ...prev]); setSelectedProjectId(newProject.id);
            setProjectAction('select'); setNewProjectName(''); toast({ title: 'Project Created' });
        } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
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

    const selectedWorker = workers.find(w => w.id === selectedWorkerId) || workers.find(w => w.id === user?.uid);

    if (isLoadingData) return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center h-full text-black">
                <header className="w-full max-w-5xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 items-center w-full relative gap-4">
                        <div className="flex justify-center md:justify-start items-center gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button asChild variant="outline" size="icon" className="h-9 w-9"><Link href="/master-mind/instructions"><Info className="h-4 w-4" /></Link></Button></TooltipTrigger>
                                    <TooltipContent><p>Instructions</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open('https://mail.google.com/mail/u/0/#inbox', '_blank')}><Inbox className="h-4 w-4" /></Button></TooltipTrigger>
                                    <TooltipContent><p>Open Gmail Inbox</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" onClick={handleOpenGmail}><Mail className="h-4 w-4" /></Button></TooltipTrigger>
                                    <TooltipContent><p>Compose Gmail</p></TooltipContent>
                                </Tooltip>
                                {!timerState?.isActive ? (
                                    <Button onClick={handleStartTimer} className="h-9"><Play className="mr-2 h-4 w-4" /> Start Timer</Button>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary h-9">
                                        <Clock className="h-3.5 w-3.5 animate-pulse" /><span className="font-mono font-bold text-xs">{formatTime(elapsedSeconds)}</span><Separator orientation="vertical" className="h-3 mx-0.5" />
                                        {timerState.isPaused ? (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleResumeTimer}><Play className="h-3 w-3" /></Button>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handlePauseTimer}><Pause className="h-3 w-3" /></Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-destructive" onClick={handleLogCurrentSession}><Square className="h-2.5 w-2.5 fill-current" /></Button>
                                    </div>
                                )}
                            </TooltipProvider>
                        </div>
                        <div className="text-center px-4">
                            <h1 className="text-3xl font-bold font-headline text-primary">Command Centre</h1>
                            <p className="text-sm text-muted-foreground mt-1">Flagship engine for orchestration.</p>
                        </div>
                        <div className="flex justify-center md:justify-end items-center gap-2">
                            {eventToEdit && <Button variant="outline" size="icon" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="h-4 w-4" /></Button>}
                            <Button variant="outline" className="h-9" onClick={handleSaveAndNew}><Plus className="mr-2 h-4 w-4" /> Save & New</Button>
                            <Button className="h-9" onClick={() => handleSaveEvent(true)}><Save className="mr-2 h-4 w-4" /> Save & Close</Button>
                            <Button variant="ghost" size="icon" onClick={() => router.back()}><X className="h-5 w-5" /></Button>
                        </div>
                    </div>
                </header>

                <div className="w-full max-w-4xl space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject Title *</Label>
                                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} ref={subjectInputRef} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <RadioGroup onValueChange={setContactAction} value={contactAction} className="flex space-x-2">
                                            <div className="flex items-center space-x-1"><RadioGroupItem value="select" id="sc" /><Label htmlFor="sc" className="text-xs">Select</Label></div>
                                            <div className="flex items-center space-x-1"><RadioGroupItem value="add" id="ac" /><Label htmlFor="ac" className="text-xs">Add New</Label></div>
                                        </RadioGroup>
                                        {contactAction === 'select' ? (
                                            <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                                <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between mt-2 text-xs truncate">{selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : "Select contact..."}<ChevronsUpDown className="h-3 w-3 opacity-50" /></Button></PopoverTrigger>
                                                <PopoverContent className="w-full p-0"><Command><CommandInput placeholder="Search..." /><CommandList><CommandEmpty>No results.</CommandEmpty><CommandGroup>{contacts.map(c => (<CommandItem key={c.id} onSelect={() => { setSelectedContactId(c.id); setIsContactPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                            </Popover>
                                        ) : <Button variant="outline" onClick={() => setIsContactFormOpen(true)} className="w-full mt-2 text-xs">New Contact</Button>}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-sm">Project</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <RadioGroup onValueChange={setProjectAction} value={projectAction} className="flex space-x-2">
                                            <div className="flex items-center space-x-1"><RadioGroupItem value="select" id="sp" /><Label htmlFor="sp" className="text-xs">Select</Label></div>
                                            <div className="flex items-center space-x-1"><RadioGroupItem value="add" id="ap" /><Label htmlFor="ap" className="text-xs">Add New</Label></div>
                                        </RadioGroup>
                                        {projectAction === 'select' ? (
                                            <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                                                <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between mt-2 text-xs truncate">{selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : "Select project..."}<ChevronsUpDown className="h-3 w-3 opacity-50" /></Button></PopoverTrigger>
                                                <PopoverContent className="w-full p-0"><Command><CommandInput placeholder="Search..." /><CommandList><CommandEmpty>No results.</CommandEmpty><CommandGroup>{projects.map(p => (<CommandItem key={p.id} onSelect={() => { setSelectedProjectId(p.id); setIsProjectPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")}/>{p.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                            </Popover>
                                        ) : <div className="flex gap-1 mt-2"><Input placeholder="Name..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="text-xs h-8"/><Button onClick={handleCreateProject} size="sm" className="h-8">Create</Button></div>}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-sm">Worker</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between mt-6 text-xs truncate">
                                                    {selectedWorker ? selectedWorker.name : "Select worker..."}
                                                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search workers..." />
                                                    <CommandList>
                                                        <CommandEmpty>No worker found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem onSelect={() => { setSelectedWorkerId(user?.uid || null); setIsWorkerPopoverOpen(false); }}>
                                                                <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === user?.uid ? "opacity-100" : "opacity-0")}/>
                                                                Me (Admin)
                                                            </CommandItem>
                                                            {workers.map(w => (
                                                                <CommandItem key={w.id} onSelect={() => { setSelectedWorkerId(w.id); setIsWorkerPopoverOpen(false); }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === w.id ? "opacity-100" : "opacity-0")}/>
                                                                    {w.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-2"><Label htmlFor="notes">Details</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="p-4"><CardTitle className="text-sm">Scheduling</CardTitle></CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <div className="flex items-center space-x-2"><Checkbox id="all-day" checked={isAllDay} onCheckedChange={(v) => setIsAllDay(!!v)} /><Label htmlFor="all-day">All-day</Label></div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Start</Label>
                                        <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
                                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-xs font-normal">{startDate ? formatDate(startDate, "PP") : "Date"}</Button></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={startDate} onSelect={d => { setStartDate(d); setIsStartPickerOpen(false); }} initialFocus /></PopoverContent>
                                        </Popover>
                                        <div className="flex gap-1"><Select value={startHour} onValueChange={setStartHour} disabled={isAllDay}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><Select value={startMinute} onValueChange={setStartMinute} disabled={isAllDay}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">End</Label>
                                        <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
                                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-xs font-normal">{endDate ? formatDate(endDate, "PP") : "Date"}</Button></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={endDate} onSelect={d => { setEndDate(d); setIsEndPickerOpen(false); }} initialFocus /></PopoverContent>
                                        </Popover>
                                        <div className="flex gap-1">
                                            <Select value={endHour || ""} onValueChange={setEndHour} disabled={isAllDay}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Hr" />
                                                </SelectTrigger>
                                                <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Select value={endMinute || ""} onValueChange={setEndMinute} disabled={isAllDay}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Min" />
                                                </SelectTrigger>
                                                <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="p-4"><CardTitle className="text-sm">Billing Status</CardTitle></CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <RadioGroup value={isBillable ? 'billable' : 'non-billable'} onValueChange={(v) => setIsBillable(v === 'billable')} className="flex space-x-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="non-billable" id="rb1"/><Label htmlFor="rb1">Non-Billable</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="billable" id="rb2"/><Label htmlFor="rb2">Billable</Label></div>
                                </RadioGroup>
                                {isBillable && (
                                    <div className="space-y-2 max-w-xs animate-in fade-in-50">
                                        <Label htmlFor="rate" className="text-xs">Hourly Rate ($/hr)</Label>
                                        <Input id="rate" type="number" value={billableRate} onChange={(e) => setBillableRate(e.target.value === '' ? '' : Number(e.target.value))} placeholder="100.00" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="p-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm">Time Logs & Sessions</CardTitle>
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Total Session Time</span>
                                <span className="font-mono text-lg font-bold text-primary">{formatTime(totalTime)}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <div className="flex items-center gap-2 mb-4">
                                {!timerState?.isActive ? (
                                    <Button onClick={handleStartTimer} className="flex-1">
                                        <Play className="mr-2 h-4 w-4" /> Start New Session
                                    </Button>
                                ) : (
                                    <>
                                        {timerState.isPaused ? (
                                            <Button onClick={handleResumeTimer} variant="outline" className="flex-1">
                                                <Play className="mr-2 h-4 w-4" /> Resume Session
                                            </Button>
                                        ) : (
                                            <Button onClick={handlePauseTimer} variant="outline" className="flex-1">
                                                <Pause className="mr-2 h-4 w-4" /> Pause Session
                                            </Button>
                                        )}
                                        <Button onClick={handleLogCurrentSession} variant="destructive" className="flex-1">
                                            <Square className="mr-2 h-4 w-4" /> Stop & Log
                                        </Button>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Label htmlFor="sn" className="text-xs">Active Session Notes</Label>
                                    <Textarea id="sn" value={currentSessionNotes} onChange={e => setCurrentSessionNotes(e.target.value)} rows={2} className="text-sm" placeholder="What are you working on right now?" />
                                </div>
                                <Button onClick={handleLogCurrentSession} variant="outline" size="sm" disabled={!timerState?.isActive} className="h-10">
                                    Log Session
                                </Button>
                            </div>
                            <ScrollArea className="h-48 border rounded-md">
                                <div className="p-2 space-y-1">
                                    {sessions.length > 0 ? sessions.map(s => (
                                        <div key={s.id} className="flex justify-between items-center p-3 bg-muted rounded-md text-xs border border-transparent hover:border-primary/20 transition-colors">
                                            <div>
                                                <p className="font-bold text-primary">{formatTime(s.durationSeconds)}</p>
                                                <p className="text-muted-foreground mt-0.5">{s.notes || 'No notes for this session.'}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditSession(s)}>
                                                    <Pencil className="h-3.5 w-3.5"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>
                                                    <Trash2 className="h-3.5 w-3.5"/>
                                                </Button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-50">
                                            <Clock className="h-8 w-8 mb-2" />
                                            <p>No sessions recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <ContactFormDialog isOpen={isContactFormOpen} onOpenChange={setIsContactFormOpen} contactToEdit={null} folders={contactFolders} onFoldersChange={setContactFolders} onSave={handleContactSave} companies={companies} onCompaniesChange={setCompanies} customIndustries={customIndustries} onCustomIndustriesChange={setCustomIndustries} />
            <Dialog open={isEditSessionDialogOpen} onOpenChange={setIsEditSessionDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Recorded Session</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Hours</Label>
                                <Input type="number" value={editSessionHours} onChange={e => setEditSessionHours(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Minutes</Label>
                                <Input type="number" value={editSessionMinutes} onChange={e => setEditSessionMinutes(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Session Notes</Label>
                            <Textarea value={editSessionNotes} onChange={e => setEditSessionNotes(e.target.value)} rows={4} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditSessionDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSession}>Apply Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this entire entry?</AlertDialogTitle><AlertDialogDescription>This will remove the event and all recorded time sessions. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Delete Permanently</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
