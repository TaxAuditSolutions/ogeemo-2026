
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoaderCircle, Save, ChevronsUpDown, Check, Plus, X, Info, Timer, Play, Pause, Trash2, MoreVertical, Pencil, MessageSquare, RefreshCw, BellRing, Mail, CheckCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { type Project, type Event as TaskEvent, type TimeSession } from '@/types/calendar-types';
import { type Contact } from '@/data/contacts';
import { addTask, getProjects, addProject, updateProject, getTaskById, updateTask, deleteTask } from '@/services/project-service';
import { getContacts, type FolderData } from '@/services/contact-service';
import { getFolders as getContactFolders } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
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
import { format as formatDate, set, addMinutes, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';
import { CustomCalendar } from '../ui/custom-calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getIndustries, type Industry } from '@/services/industry-service';


export interface StoredTimerState {
    eventId: string;
    notes: string;
    isActive: boolean;
    isPaused: boolean;
    startTime: number; // Timestamp
    pauseTime: number | null; // Timestamp
    totalPausedDuration: number; // in seconds
}

const TIMER_STORAGE_KEY = 'activeTimeManagerEntry';

export function TimeManagerView({ projects: initialProjects, contacts: initialContacts }: { projects: Project[], contacts: Contact[] }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [projects, setProjects] = React.useState<Project[]>(initialProjects);
    const [contacts, setContacts] = React.useState<Contact[]>(initialContacts);
    const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
    const [companies, setCompanies] = React.useState<Company[]>([]);
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);


    // Form state
    const [subject, setSubject] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);
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


    // Contact UI
    const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false);
    const [contactAction, setContactAction] = React.useState<string>('select');
    const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);

    // Project UI
    const [isProjectPopoverOpen, setIsProjectPopoverOpen] = React.useState(false);
    const [projectAction, setProjectAction] = React.useState<string>('select');
    const [newProjectName, setNewProjectName] = React.useState('');

    
    const [eventToEdit, setEventToEdit] = React.useState<TaskEvent | null>(null);
    
    // Timer State
    const [timerState, setTimerState] = React.useState<StoredTimerState | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
    const [sessions, setSessions] = React.useState<TimeSession[]>([]);
    const [currentSessionNotes, setCurrentSessionNotes] = React.useState('');
    
    // Session Edit
    const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = React.useState(false);
    const [sessionToEdit, setSessionToEdit] = React.useState<TimeSession | null>(null);
    const [editSessionHours, setEditSessionHours] = React.useState<number | ''>('');
    const [editSessionMinutes, setEditSessionMinutes] = React.useState<number | ''>('');
    const [editSessionNotes, setEditSessionNotes] = React.useState('');
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);

    const hasStartedTimerRef = useRef(false);

    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: formatDate(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes).padStart(2, '0'), label: `:${String(minutes).padStart(2, '0')}` }; });
    
    const totalAccumulatedSeconds = useMemo(() => {
        return sessions.reduce((acc, session) => acc + session.durationSeconds, 0);
    }, [sessions]);

    const totalTime = useMemo(() => {
        return totalAccumulatedSeconds + elapsedSeconds;
    }, [totalAccumulatedSeconds, elapsedSeconds]);

    const createAndSaveNewEvent = useCallback(async (): Promise<TaskEvent | null> => {
        if (!user || !subject.trim()) {
            toast({ variant: 'destructive', title: 'Subject Required', description: 'Please enter a subject before starting the timer.' });
            return null;
        }

        const eventData: Omit<TaskEvent, 'id'> = {
            title: subject,
            description: notes,
            status: 'inProgress',
            position: 0,
            projectId: selectedProjectId,
            contactId: selectedContactId,
            isBillable: isBillable,
            billableRate: isBillable ? Number(billableRate) || 0 : 0,
            userId: user.uid,
        };

        try {
            const newEvent = await addTask(eventData);
            setEventToEdit(newEvent);
            toast({ title: "Event Created", description: `"${newEvent.title}" has been saved and is now being tracked.` });
            return newEvent;
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to create event", description: error.message });
            return null;
        }
    }, [user, subject, notes, selectedProjectId, selectedContactId, isBillable, billableRate, toast]);

    const handleStartTimer = useCallback(async () => {
        let currentEvent = eventToEdit;
        if (!currentEvent) {
            currentEvent = await createAndSaveNewEvent();
        }

        if (currentEvent) {
            const now = Date.now();
            const storedState: StoredTimerState = {
                eventId: currentEvent.id,
                notes: currentEvent.title,
                isActive: true,
                isPaused: false,
                startTime: now,
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

                if (end <= start) {
                    end = addMinutes(start, 30);
                }
            }
            isScheduled = true;
        } else {
            toast({ variant: 'destructive', title: 'Date Required', description: 'A start date and time are required to save an event.' });
            return;
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
            duration: totalTime,
            sessions: sessions,
            isBillable: isBillable,
            billableRate: isBillable ? (Number(billableRate) || 0) : 0,
        };

        try {
            if (eventToEdit) {
                await updateTask(eventToEdit.id, eventData);
                toast({ title: "Event Updated", description: `"${eventData.title}" has been updated.` });
            } else {
                const newEvent = await addTask({ ...eventData as Omit<TaskEvent, 'id'>, userId: user.uid });
                setEventToEdit(newEvent);
                toast({ title: "Event Saved", description: `"${newEvent.title}" has been saved.` });
            }
            if (andClose) {
                router.back();
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to save event', description: error.message });
        }
    }, [user, subject, notes, startDate, startHour, startMinute, endDate, endHour, endMinute, isAllDay, selectedProjectId, selectedContactId, isBillable, billableRate, sessions, eventToEdit, toast, router, totalTime]);

    const handleLogCurrentSession = async () => {
        if (!timerState || !timerState.isActive || elapsedSeconds <= 0) {
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
        
        // Auto-save the event
        await handleSaveEvent(false);

        toast({ title: 'Session Logged', description: `${formatTime(elapsedSeconds)} has been logged and the event has been saved.` });
    };

    const handleOpenEditSession = (session: TimeSession) => {
        setSessionToEdit(session);
        const hours = Math.floor(session.durationSeconds / 3600);
        const minutes = Math.floor((session.durationSeconds % 3600) / 60);
        setEditSessionHours(hours);
        setEditSessionMinutes(minutes);
        setEditSessionNotes(session.notes || '');
        setIsEditSessionDialogOpen(true);
    };

    const handleSaveSession = () => {
        if (!sessionToEdit) return;

        const hours = Number(editSessionHours) || 0;
        const minutes = Number(editSessionMinutes) || 0;
        const newDurationSeconds = (hours * 3600) + (minutes * 60);

        if (newDurationSeconds <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Duration', description: 'Duration must be greater than zero.'});
            return;
        }

        const updatedSession = { ...sessionToEdit, durationSeconds: newDurationSeconds, notes: editSessionNotes };
        setSessions(prev => prev.map(s => s.id === sessionToEdit.id ? updatedSession : s));
        setIsEditSessionDialogOpen(false);
    };

    const handleDeleteEvent = async () => {
        if (!eventToEdit) {
            toast({ variant: 'destructive', title: 'No Event to Delete' });
            return;
        }
        
        try {
            await deleteTask(eventToEdit.id);
            toast({ title: 'Event Deleted', description: `"${eventToEdit.title}" has been permanently removed.` });
            router.back();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete event', description: error.message });
        }
    };


    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        try {
            setProjects(initialProjects);
            setContacts(initialContacts);

            const [fetchedFolders, fetchedCompanies, fetchedIndustries] = await Promise.all([
                getContactFolders(user.uid),
                getCompanies(user.uid),
                getIndustries(user.uid),
            ]);
            setContactFolders(fetchedFolders);
            setCompanies(fetchedCompanies);
            setCustomIndustries(fetchedIndustries);
            
            // Set a default date if one isn't passed from URL
            if (!searchParams.get('start') && !searchParams.get('eventId')) {
                setStartDate(new Date());
            }

            const sourceParam = searchParams.get('source');
            if (sourceParam === 'log-email') {
                setIsReviewMode(true);
            } else {
                setIsReviewMode(false);
            }

            const eventIdParam = searchParams.get('eventId');
            if (eventIdParam) {
                const eventData = await getTaskById(eventIdParam);
                if (eventData) {
                    setEventToEdit(eventData);
                    setSubject(eventData.title);
                    setNotes(eventData.description || "");
                    setSelectedProjectId(eventData.projectId || null);
                    setSelectedContactId(eventData.contactId || null);
                    setIsBillable(eventData.isBillable || false);
                    setBillableRate(eventData.billableRate || 0);
                    setSessions(eventData.sessions || []);
                    if (eventData.start && isValid(new Date(eventData.start))) {
                        const eventStartDate = new Date(eventData.start);
                        setStartDate(eventStartDate);
                        setStartHour(String(eventStartDate.getHours()).padStart(2, '0'));
                        setStartMinute(String(eventStartDate.getMinutes()).padStart(2, '0'));
                    } else {
                        setStartDate(new Date());
                        setStartHour(String(new Date().getHours()).padStart(2, '0'));
                        setStartMinute(String(new Date().getMinutes()).padStart(2, '0'));
                    }
                    if (eventData.end && isValid(new Date(eventData.end))) {
                        const eventEndDate = new Date(eventData.end);
                        setEndDate(eventEndDate);
                        setEndHour(String(eventEndDate.getHours()).padStart(2, '0'));
                        setEndMinute(String(eventEndDate.getMinutes()).padStart(2, '0'));
                    }
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load event data.' });
                }
            } else {
                const startParam = searchParams.get('start');
                const endParam = searchParams.get('end');
                const titleParam = searchParams.get('title');
                const notesParam = searchParams.get('notes');
                const contactIdParam = searchParams.get('contactId');
                const projectIdParam = searchParams.get('projectId');
                const isAllDayParam = searchParams.get('isAllDay');

                if (isAllDayParam === 'true') setIsAllDay(true);
                if (titleParam) setSubject(titleParam);
                if (notesParam) setNotes(notesParam);
                if (contactIdParam) setSelectedContactId(contactIdParam);
                if (projectIdParam) setSelectedProjectId(projectIdParam);
                
                if (startParam) {
                    const eventStartDate = parseISO(startParam);
                    if (isValid(eventStartDate)) {
                        setStartDate(eventStartDate);
                        setStartHour(String(eventStartDate.getHours()).padStart(2, '0'));
                        setStartMinute(String(eventStartDate.getMinutes()).padStart(2, '0'));
                    }
                }
                 if (endParam) {
                    const eventEndDate = parseISO(endParam);
                    if (isValid(eventEndDate)) {
                        setEndDate(eventEndDate);
                        setEndHour(String(eventEndDate.getHours()).padStart(2, '0'));
                        setEndMinute(String(eventEndDate.getMinutes()).padStart(2, '0'));
                    }
                }
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoadingData(false);
        }
    }, [user, searchParams, toast, initialProjects, initialContacts, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    useEffect(() => {
        const startTimerParam = searchParams.get('startTimer');
        if (startTimerParam === 'true' && eventToEdit && !hasStartedTimerRef.current) {
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
                } else {
                    setTimerState(null);
                    setElapsedSeconds(0);
                }
            } else {
                setTimerState(null);
                setElapsedSeconds(0);
            }
        } catch (e) {
            console.error("Error syncing with global timer:", e);
        }
    }, [eventToEdit]);
    
    useEffect(() => {
        syncWithGlobalTimer();
        window.addEventListener('storage', syncWithGlobalTimer);
        const interval = setInterval(syncWithGlobalTimer, 1000);
        return () => {
            window.removeEventListener('storage', syncWithGlobalTimer);
            clearInterval(interval);
        };
    }, [syncWithGlobalTimer]);
    
    const handleContactSave = (contact: Contact, isEditing: boolean) => {
        if (isEditing) {
            setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
        } else {
            setContacts(prev => [...prev, contact]);
        }
        setSelectedContactId(contact.id);
        setContactAction('select');
    };

    const handleCreateProject = async () => {
        if (!user || !newProjectName.trim()) {
            toast({ variant: 'destructive', title: 'Project name is required.' });
            return;
        }
        try {
            const newProject = await addProject({
                name: newProjectName,
                userId: user.uid,
                status: 'planning',
                createdAt: new Date(),
            });
            setProjects(prev => [newProject, ...prev]);
            setSelectedProjectId(newProject.id);
            setProjectAction('select');
            setNewProjectName('');
            toast({ title: 'Project Created', description: `Project "${newProject.name}" has been added.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to create project", description: error.message });
        }
    };
    
    if (isLoadingData) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center h-full">
                <header className="w-full max-w-5xl">
                    <div className="flex justify-between items-center relative">
                        <div className="flex-1 flex justify-start">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button asChild variant="outline">
                                            <Link href="/master-mind/instructions">
                                                <Info className="mr-2 h-4 w-4" /> Instructions
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Learn how to use this manager effectively.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="text-center absolute left-1/2 -translate-x-1/2">
                            <h1 className="text-2xl font-bold font-headline text-primary whitespace-nowrap">Time &amp; Event Scheduler</h1>
                            <p className="text-muted-foreground whitespace-nowrap">Your central hub for tasks and calendar entries.</p>
                        </div>
                        <div className="flex-1 flex justify-end items-center gap-2">
                            <TooltipProvider>
                                {eventToEdit && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" className="bg-card text-card-foreground hover:bg-card/90 border border-black" onClick={() => setIsDeleteDialogOpen(true)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Event
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Permanently delete this event and all its time logs.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button className="bg-card text-card-foreground hover:bg-card/90 border border-black" onClick={() => handleSaveEvent(true)}>
                                            <Save className="mr-2 h-4 w-4" /> Save &amp; Close
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Save all changes and close the manager.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button asChild variant="ghost" size="icon" onClick={() => router.back()}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="w-full max-w-4xl space-y-6">
                    {isReviewMode && (
                        <Card className="bg-primary/10 border-primary">
                            <CardHeader className="text-center">
                                <div className="flex justify-center items-center gap-2">
                                <CheckCircle className="h-6 w-6 text-primary" />
                                <CheckCircle className="h-6 w-6 text-primary" />
                                <CardTitle>Final Step: Review &amp; Schedule Your Logged Email</CardTitle>
                                </div>
                                <CardDescription>Confirm the details below are correct. You can add more information or adjust the schedule before saving.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject Title <span className="text-destructive">*</span></Label>
                                <Input id="subject" placeholder="What is the main task or event?" value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-base">Select a Contact</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="space-y-2">
                                            <RadioGroup onValueChange={(value) => setContactAction(value)} value={contactAction} className="flex space-x-4">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="select" id="select-contact" /><Label htmlFor="select-contact">Select/Search</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="add" id="add-contact" /><Label htmlFor="add-contact">Add New</Label></div>
                                            </RadioGroup>

                                            {contactAction === 'select' ? (
                                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" role="combobox" className="w-full justify-between mt-2">
                                                            {selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : "Select contact..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search contacts..." />
                                                            <CommandList>
                                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                                <CommandGroup>
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
                                            ) : (
                                                <Button variant="outline" onClick={() => setIsContactFormOpen(true)} className="w-full mt-2">
                                                    <Plus className="mr-2 h-4 w-4" /> Create New Contact
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-base">Select or Create a Project</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="space-y-2">
                                            <RadioGroup onValueChange={(value) => setProjectAction(value)} value={projectAction} className="flex space-x-4">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="select" id="select-project" /><Label htmlFor="select-project">Select/Search</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="add" id="add-project" /><Label htmlFor="add-project">Add New</Label></div>
                                            </RadioGroup>

                                            {projectAction === 'select' ? (
                                                <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" role="combobox" className="w-full justify-between mt-2">
                                                            {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : "Select project..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search projects..." /><CommandList><CommandEmpty>No project found.</CommandEmpty><CommandGroup>{projects.map(p => (<CommandItem key={p.id} value={p.name} onSelect={() => { setSelectedProjectId(p.id); setIsProjectPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")}/>{p.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                                </Popover>
                                            ) : (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Input
                                                        placeholder="Enter new project name..."
                                                        value={newProjectName}
                                                        onChange={e => setNewProjectName(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                                                    />
                                                    <Button onClick={handleCreateProject}><Plus className="mr-2 h-4 w-4"/> Create</Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes / Details</Label>
                                <Textarea id="notes" placeholder="Add more details about the work..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Scheduling</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="all-day" checked={isAllDay} onCheckedChange={(checked) => setIsAllDay(!!checked)} />
                                <Label htmlFor="all-day">All-day event</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
                                        <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{startDate ? formatDate(startDate, "PPP") : <span>Pick a start date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartPickerOpen(false); }} initialFocus /></PopoverContent>
                                    </Popover>
                                    <div className="flex gap-2">
                                        <Select value={startHour} onValueChange={setStartHour} disabled={isAllDay}><SelectTrigger><SelectValue placeholder="Hour"/></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                        <Select value={startMinute} onValueChange={setStartMinute} disabled={isAllDay}><SelectTrigger><SelectValue placeholder="Min"/></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
                                        <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{endDate ? formatDate(endDate, "PPP") : <span>Pick an end date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndPickerOpen(false); }} initialFocus /></PopoverContent>
                                    </Popover>
                                    <div className="flex gap-2">
                                        <Select value={endHour} onValueChange={setEndHour} disabled={isAllDay}><SelectTrigger><SelectValue placeholder="Hour"/></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                        <Select value={endMinute} onValueChange={setEndMinute} disabled={isAllDay}><SelectTrigger><SelectValue placeholder="Min"/></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Billing Status</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <RadioGroup value={isBillable ? 'billable' : 'non-billable'} onValueChange={(v) => setIsBillable(v === 'billable')} className="flex space-x-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="non-billable" id="r1"/><Label htmlFor="r1">Non-Billable</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="billable" id="r2"/><Label htmlFor="r2">Billable</Label></div>
                            </RadioGroup>
                            {isBillable && <div className="space-y-2"><Label htmlFor="rate">Billable Rate ($/hr)</Label><Input id="rate" type="number" value={billableRate} onChange={(e) => setBillableRate(e.target.value === '' ? '' : Number(e.target.value))} placeholder="100.00" /></div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Live Time Tracking</span>
                                <span className="font-mono text-lg text-primary">{formatTime(totalTime)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="flex gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="session-notes">Session Notes</Label>
                                    <Textarea id="session-notes" placeholder="What are you working on right now?" value={currentSessionNotes} onChange={e => setCurrentSessionNotes(e.target.value)} />
                                </div>
                                <div className="flex-shrink-0 flex gap-2">
                                     {!timerState || !timerState.isActive ? (
                                        <Button onClick={handleStartTimer}><Play className="mr-2 h-4 w-4" /> Start Timer</Button>
                                    ) : timerState.isPaused ? (
                                        <Button onClick={handleResumeTimer}><Play className="mr-2 h-4 w-4" /> Resume</Button>
                                    ) : (
                                        <Button onClick={handlePauseTimer} variant="secondary"><Pause className="mr-2 h-4 w-4" /> Pause</Button>
                                    )}
                                    <Button onClick={handleLogCurrentSession} variant="outline" disabled={!timerState || !timerState.isActive}>Log Session</Button>
                                </div>
                            </div>

                            <ScrollArea className="h-40 mt-4 border rounded-md">
                                <div className="p-4 space-y-2">
                                {sessions.length > 0 ? sessions.map(session => (
                                    <div key={session.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                                        <div>
                                            <p className="font-semibold text-sm">{formatTime(session.durationSeconds)}</p>
                                            <p className="text-xs text-muted-foreground">{session.notes}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditSession(session)}><Pencil className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setSessions(prev => prev.filter(s => s.id !== session.id))}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-center text-muted-foreground pt-4">No sessions logged for this event yet.</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
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
             <Dialog open={isEditSessionDialogOpen} onOpenChange={setIsEditSessionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Time Session</DialogTitle>
                        <DialogDescription>Adjust the duration and add notes for this session.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="edit-hours" className="text-xs">Hours</Label>
                                    <Input id="edit-hours" type="number" value={editSessionHours} onChange={(e) => setEditSessionHours(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="edit-minutes" className="text-xs">Minutes</Label>
                                    <Input id="edit-minutes" type="number" value={editSessionMinutes} onChange={(e) => setEditSessionMinutes(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea id="edit-notes" value={editSessionNotes} onChange={(e) => setEditSessionNotes(e.target.value)} placeholder="Add a description of the work done during this session..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditSessionDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSession}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this event and all of its logged time sessions. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">
                            Delete Event
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
