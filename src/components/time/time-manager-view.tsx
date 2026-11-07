
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    LoaderCircle, 
    Save, 
    Plus, 
    Info, 
    Clock, 
    Play, 
    Pause, 
    Trash2, 
    Pencil, 
    MessageSquare, 
    RefreshCw, 
    BellRing, 
    Mail, 
    Inbox,
    User, 
    Square,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { type Event as TaskEvent, type TimeSession, type StoredTimerState } from '@/types/calendar-types';
import { addTask, updateProject, getTaskById, updateTask, deleteTask } from '@/services/project-service';
import { getFolders as getContactFolders } from '@/services/contact-folder-service';
import { Textarea } from '../ui/textarea';
import { cn, formatTime } from '@/lib/utils';
import { computeDurationAndSource, type DurationSource } from '@/lib/duration-source';
import { useActivityForm } from '@/hooks/use-activity-form';
import { useActivityReferenceData } from '@/hooks/use-activity-reference-data';
import { ActivityFormFields } from '@/components/time/activity-form-fields';
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
import { getUserProfile, type UserProfile } from '@/core/user-profile-service';
import { parseISO, isValid } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { AgendaForm } from '@/components/meetings/agenda-form';
import { ArrowLeft } from 'lucide-react';

const TIMER_STORAGE_KEY = 'activeTimeManagerEntry';

type TimerWindow = Window & {
    __ogeemoTimerState?: StoredTimerState | null;
};

const broadcastTimerState = (nextState: StoredTimerState | null) => {
    const timerWindow = window as TimerWindow;

    if (nextState) {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(nextState));
        timerWindow.__ogeemoTimerState = nextState;
    } else {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        timerWindow.__ogeemoTimerState = null;
    }

    window.dispatchEvent(new CustomEvent('timer-state-changed', { detail: nextState }));
};

export function TimeManagerView() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const refData = useActivityReferenceData();
    // A brand-new activity opens on the calendar's next free slot. Editing an
    // existing event (?eventId) or arriving from a calendar click (?start)
    // keeps the time it came with.
    const form = useActivityForm({
        suggestSlot: !searchParams.get('eventId') && !searchParams.get('start'),
        calendarEvents: refData.events,
        calendarReady: !refData.isLoadingEvents,
    });
    const {
        subject, setSubject,
        notes, setNotes,
        activityType, setActivityType,
        status, setStatus,
        selectedProjectId, setSelectedProjectId,
        selectedContactId, setSelectedContactId,
        selectedWorkerId, setSelectedWorkerId,
        isBillable, setIsBillable,
        billableRate, setBillableRate,
        setIsScheduleEnabled,
        setStartDate,
        setStartHour,
        setStartMinute,
        setEndDate,
        setEndHour,
        setEndMinute,
        startDateTouchedRef,
        startTimeTouchedRef,
        scheduledSpanSeconds,
        buildEventData,
        resetForm,
    } = form;
    const [isLoadingData, setIsLoadingData] = React.useState(true);

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
    
    const [isAgendaFormOpen, setIsAgendaFormOpen] = useState(false);

    const hasStartedTimerRef = useRef(false);
    const subjectInputRef = useRef<HTMLInputElement>(null);

    // Displayed duration + provenance. Actual sessions/timer always win; the
    // scheduled span is a labelled non-billable placeholder until work exists
    // (beta feedback: scheduled time silently showed up as billable time).
    const { durationSeconds: calculatedDuration, source: durationSource } = useMemo(
        () => computeDurationAndSource({ sessions, elapsedSeconds, scheduledSpanSeconds }),
        [sessions, elapsedSeconds, scheduledSpanSeconds]
    );

    const totalTime = calculatedDuration;

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
            activityType,
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
    }, [user, subject, notes, selectedProjectId, selectedContactId, selectedWorkerId, isBillable, billableRate, activityType, toast]);

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
            broadcastTimerState(storedState);
        }
    }, [eventToEdit, createAndSaveNewEvent]);
    
    const handlePauseTimer = useCallback(() => {
        const savedStateRaw = localStorage.getItem(TIMER_STORAGE_KEY);
        if (savedStateRaw) {
            const savedState: StoredTimerState = JSON.parse(savedStateRaw);
            if (savedState.isActive && !savedState.isPaused) {
                const newState = { ...savedState, isPaused: true, pauseTime: Date.now() };
                broadcastTimerState(newState);
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
                broadcastTimerState(newState);
            }
        }
    }, []);

    const handleSaveEvent = useCallback(async (andClose: boolean = false, sessionOverride?: { sessions: TimeSession[]; durationSeconds: number; durationSource: DurationSource | null }) => {
        if (!user || !subject.trim()) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter a subject for the event.' });
            return;
        }
        // When logging a session, the caller passes the just-logged sessions
        // array explicitly: React state has not flushed yet at this point, so
        // reading `sessions` from this closure would silently drop the new
        // session (stale state -> session never persisted -> duration
        // recalculated from the schedule on reopen).
        const eventData = buildEventData({
            duration: sessionOverride?.durationSeconds ?? calculatedDuration,
            durationSource: sessionOverride?.durationSource ?? durationSource,
            sessions: sessionOverride?.sessions ?? sessions,
        });
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
    }, [user, subject, buildEventData, sessions, eventToEdit, toast, router, calculatedDuration, durationSource]);

    const handleSaveAndNew = async () => {
        await handleSaveEvent(false);
        // Re-read the calendar so the next suggestion skips the slot just saved.
        await refData.reloadEvents();
        resetForm();
        setSessions([]); setEventToEdit(null);
        broadcastTimerState(null);
        router.replace('/event-manager');
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
        const sessionsWithNew = [...sessions, newSession];
        setSessions(sessionsWithNew);
        setCurrentSessionNotes('');
        broadcastTimerState(null);
        // Persist the just-logged session explicitly (state hasn't flushed yet),
        // with duration derived from the updated session list.
        const computed = computeDurationAndSource({ sessions: sessionsWithNew, elapsedSeconds: 0, scheduledSpanSeconds });
        await handleSaveEvent(false, { sessions: sessionsWithNew, durationSeconds: computed.durationSeconds, durationSource: computed.source });
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
        const selectedContact = refData.contacts.find(c => c.id === selectedContactId);
        const recipient = selectedContact?.email || "";
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(notes)}`, '_blank', 'noopener,noreferrer');
    };

    const loadInitialData = React.useCallback(async () => {
        if (!user) { setIsLoadingData(false); return; }
        setIsLoadingData(true);
        try {
            setSelectedWorkerId(user.uid);
            const eventIdParam = searchParams.get('eventId');
            if (eventIdParam) {
                const eventData = await getTaskById(eventIdParam);
                if (eventData) {
                    setEventToEdit(eventData); setSubject(eventData.title); setNotes(eventData.description || "");
                    setActivityType(eventData.activityType || 'task');
                    setStatus(eventData.status || 'todo');
                    setIsScheduleEnabled(Boolean(eventData.start || eventData.isScheduled));
                    setSelectedProjectId(eventData.projectId || null); setSelectedContactId(eventData.contactId || null);
                    setSelectedWorkerId(eventData.workerId || user.uid); setIsBillable(eventData.isBillable || false);
                    setBillableRate(eventData.billableRate || 0); setSessions(eventData.sessions || []);
                    if (eventData.start) {
                        const sDate = new Date(eventData.start);
                        startDateTouchedRef.current = true; startTimeTouchedRef.current = true;
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
                        // Calendar/CRM handoff: honor the clicked *date*, but
                        // the TIME always defaults to the computer's clock
                        // (beta directive) - startHour/startMinute stay
                        // untouched, so they refresh to *now* whenever the
                        // scheduling section opens or a save happens.
                        startDateTouchedRef.current = true;
                        setStartDate(sDate);
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

    if (isLoadingData || refData.isLoading) return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;

    if (isAgendaFormOpen) {
        return (
            <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl text-black">
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Meeting Agenda</h1>
                        <p className="text-muted-foreground mt-1">Plan and organize your meeting.</p>
                    </div>
                    <Button variant="outline" onClick={() => setIsAgendaFormOpen(false)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Activity Manager
                    </Button>
                </div>
                <AgendaForm onSuccess={() => setIsAgendaFormOpen(false)} />
            </div>
        );
    }

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center h-full text-black">
                <header className="w-full max-w-4xl flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">Activity Manager</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {eventToEdit ? 'Update the details of this activity.' : 'Create a new activity. You can update any details later.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button asChild variant="outline" size="icon" className="h-9 w-9"><Link href="/learn/guides/activity-manager"><Info className="h-4 w-4" /></Link></Button></TooltipTrigger>
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
                                {timerState?.isActive ? (
                                    <div
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary h-9"
                                        title="Session timer running - use the Time Sessions card below to pause or log it."
                                    >
                                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                                        <span className="font-mono font-bold text-xs">{formatTime(elapsedSeconds)}</span>
                                        {timerState.isPaused ? (
                                            <>
                                                <Separator orientation="vertical" className="h-3 mx-0.5" />
                                                <span className="text-[10px] font-bold uppercase">Paused</span>
                                            </>
                                        ) : null}
                                    </div>
                                ) : null}
                            </TooltipProvider>
                        </div>
                </header>

                <div className="w-full max-w-4xl space-y-6">
                    <Card className="shadow-md border-black/5">
                        <CardContent className="pt-6">
                            <ActivityFormFields form={form} data={refData} subjectInputRef={subjectInputRef} onOpenAgenda={() => setIsAgendaFormOpen(true)} />
                        </CardContent>
                        <CardFooter className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {eventToEdit && (
                                    <Button variant="outline" className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Activity
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button variant="outline" onClick={handleSaveAndNew}><Plus className="mr-2 h-4 w-4" /> Save & New</Button>
                                <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
                                <Button onClick={() => handleSaveEvent(true)}><Save className="mr-2 h-4 w-4" /> {eventToEdit ? 'Save Changes' : 'Create Activity'}</Button>
                            </div>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 flex flex-row items-start justify-between gap-4">
                            <div className="min-w-0">
                                <CardTitle className="text-sm">Time Sessions</CardTitle>
                                <CardDescription className="mt-1 text-xs">
                                    Start a session to record work on this event. Sessions feed the Time Log reports.
                                </CardDescription>
                            </div>
                            <div className="shrink-0 flex flex-wrap items-start justify-end gap-3 sm:gap-4">
                                {timerState?.isActive ? (
                                    <>
                                        <div className="text-right" title={timerState.isPaused ? 'Session paused' : 'Session timer running on this event'}>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Active session</span>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className={cn("h-2 w-2 rounded-full", timerState.isPaused ? "bg-amber-500" : "bg-green-500 animate-pulse")} />
                                                <span className={cn("font-mono text-lg font-bold", timerState.isPaused ? "text-amber-600" : "text-green-600")}>
                                                    {formatTime(elapsedSeconds)}
                                                </span>
                                            </div>
                                            {timerState.isPaused ? (
                                                <span className="text-[10px] font-bold uppercase text-amber-600">Paused</span>
                                            ) : null}
                                        </div>
                                        <Separator orientation="vertical" className="h-10 mx-0.5" />
                                    </>
                                ) : null}
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                        {durationSource === 'scheduled' ? 'Scheduled (not yet worked)' : 'Total on this event'}
                                    </span>
                                    <div className={cn('font-mono text-lg font-bold', durationSource === 'scheduled' ? 'text-muted-foreground' : 'text-primary')}>{formatTime(calculatedDuration)}</div>
                                    {durationSource === 'scheduled' && (
                                        <p className="text-[10px] text-muted-foreground">Planned time only — not billable until a session is logged.</p>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <div className="flex items-center gap-2 mb-4">
                                {!timerState?.isActive ? (
                                    <>
                                        <Button onClick={handleStartTimer} className="flex-1">
                                            <Play className="mr-2 h-4 w-4" /> Start New Session
                                        </Button>
                                        <Button asChild variant="outline" className="flex-1">
                                            <Link href="/reports/time-log">
                                                View Time Reports <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </>
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
                                    <Textarea id="sn" value={currentSessionNotes} onChange={e => setCurrentSessionNotes(e.target.value)} rows={2} className="text-sm" placeholder="Describe the current session you are working on" />
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
                                        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-muted-foreground">
                                            <Clock className="h-8 w-8 opacity-60" />
                                            <p className="text-xs font-medium text-foreground">No sessions on this event yet.</p>
                                            <p className="text-xs">Press <strong>Start New Session</strong> above and your time will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
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
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
