'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Square, LogIn, LogOut, Landmark, MapPin, User, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Logo } from '../logo';
import { Separator } from '../ui/separator';
import { useAuth } from '@/context/auth-context';
import { getUserProfile, type UserProfile } from '@/services/user-profile-service';
import { addTimeLog, getTimeLogs, type TimeLog } from '@/services/timelog-service';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { cn } from '@/lib/utils';

const formatTimeDisplay = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const FIELD_TIMER_KEY = 'fieldAppTimerState';

interface TimerState {
    startTime: number;
    isPaused: boolean;
    pauseTime: number | null;
    totalPausedDuration: number;
    location: string;
}

export function FieldAppView() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [workerRecord, setWorkerRecord] = useState<Worker | null>(null);
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [isTimerPaused, setIsTimerPaused] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [location, setLocation] = useState('');
    const [todayLogs, setTodayLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [userProfile, allWorkers, logs] = await Promise.all([
                getUserProfile(user.uid),
                getWorkers(user.uid),
                getTimeLogs(user.uid)
            ]);
            setProfile(userProfile);
            setTodayLogs(logs.filter(l => isSameDay(new Date(l.startTime), new Date())));

            // Find matching worker record to get Worker ID Number
            const match = allWorkers.find(w => w.email === user.email);
            if (match) {
                setWorkerRecord(match);
            }

            // Load saved timer state
            const savedTimer = localStorage.getItem(FIELD_TIMER_KEY);
            if (savedTimer) {
                const state: TimerState = JSON.parse(savedTimer);
                setIsClockedIn(true);
                setIsTimerPaused(state.isPaused);
                setLocation(state.location);
                
                const now = Date.now();
                const pausedDuration = state.isPaused && state.pauseTime ? Math.floor((now - state.pauseTime) / 1000) : 0;
                const totalElapsed = Math.floor((now - state.startTime) / 1000) - state.totalPausedDuration - pausedDuration;
                setElapsedTime(totalElapsed > 0 ? totalElapsed : 0);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load worker session." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (isClockedIn && !isTimerPaused) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isClockedIn, isTimerPaused]);

    const handleClockIn = () => {
        if (!location.trim()) {
            toast({ variant: 'destructive', title: "Location Required", description: "Please enter your work location before clocking in." });
            return;
        }
        const startTime = Date.now();
        const state: TimerState = {
            startTime,
            isPaused: false,
            pauseTime: null,
            totalPausedDuration: 0,
            location
        };
        localStorage.setItem(FIELD_TIMER_KEY, JSON.stringify(state));
        setIsClockedIn(true);
        setIsTimerPaused(false);
        setElapsedTime(0);
        toast({ title: "Clocked In", description: `Shift started at ${location}.` });
    };

    const handlePauseResume = () => {
        const savedTimer = localStorage.getItem(FIELD_TIMER_KEY);
        if (!savedTimer) return;
        const state: TimerState = JSON.parse(savedTimer);

        if (isTimerPaused) {
            const pausedDuration = state.pauseTime ? Math.floor((Date.now() - state.pauseTime) / 1000) : 0;
            const newState = {
                ...state,
                isPaused: false,
                pauseTime: null,
                totalPausedDuration: state.totalPausedDuration + pausedDuration
            };
            localStorage.setItem(FIELD_TIMER_KEY, JSON.stringify(newState));
            setIsTimerPaused(false);
        } else {
            const newState = {
                ...state,
                isPaused: true,
                pauseTime: Date.now()
            };
            localStorage.setItem(FIELD_TIMER_KEY, JSON.stringify(newState));
            setIsTimerPaused(true);
        }
    };

    const handleClockOut = async () => {
        if (!user || isSubmitting) return;
        setIsSubmitting(true);

        const savedTimer = localStorage.getItem(FIELD_TIMER_KEY);
        if (!savedTimer) {
            setIsSubmitting(false);
            return;
        }
        const state: TimerState = JSON.parse(savedTimer);

        try {
            const endTime = new Date();
            const startTime = new Date(state.startTime);
            
            const logData: Omit<TimeLog, 'id'> = {
                workerId: user.uid,
                workerName: profile?.displayName || user.displayName || user.email || 'Worker',
                startTime,
                endTime,
                durationSeconds: elapsedTime,
                location: state.location,
                notes: `Mobile session logged via Field App at ${state.location}.`,
                userId: user.uid,
                status: 'unprocessed',
                isBillable: false,
            };

            await addTimeLog(logData);
            
            localStorage.removeItem(FIELD_TIMER_KEY);
            setIsClockedIn(false);
            setIsTimerPaused(false);
            setElapsedTime(0);
            setLocation('');
            
            toast({ title: "Clock Out Successful", description: "Your time has been saved to the database." });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Clock Out Failed", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/20">
            <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm">
                <Logo />
                <Button variant="ghost" size="sm" onClick={() => router.push('/action-manager')}>
                    <Landmark className="mr-2 h-4 w-4" /> Hub
                </Button>
            </header>

            <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
                <Card className="border-t-4 border-t-primary shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{profile?.displayName || user?.displayName || 'Worker'}</CardTitle>
                        <CardDescription className="flex flex-col gap-1">
                            <span>{user?.email}</span>
                            <span className="font-bold text-primary">ID: {workerRecord?.workerIdNumber || profile?.employeeNumber || 'Not Assigned'}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        {!isClockedIn && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="location">Work Location / Site Name</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="location" 
                                        placeholder="Where are you working today?" 
                                        className="pl-10"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30 relative">
                            {isClockedIn && (
                                <Badge className="absolute top-2 right-2 bg-green-500">Active</Badge>
                            )}
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Elapsed Work Time</p>
                            <p className={cn("text-5xl font-bold font-mono", isTimerPaused ? 'text-muted-foreground' : 'text-primary')}>
                                {formatTimeDisplay(elapsedTime)}
                            </p>
                            {isClockedIn && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                                    <MapPin className="h-3 w-3" /> {location}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {!isClockedIn ? (
                                <Button size="lg" className="col-span-2 h-14 text-lg shadow-md" onClick={handleClockIn}>
                                    <LogIn className="mr-2 h-5 w-5" /> Clock In
                                </Button>
                            ) : (
                                <>
                                    <Button size="lg" variant="outline" className="h-14 border-2" onClick={handlePauseResume}>
                                        {isTimerPaused ? <Play className="mr-2 h-5 w-5" /> : <Pause className="mr-2 h-5 w-5" />}
                                        {isTimerPaused ? "Resume" : "Pause"}
                                    </Button>
                                    <Button size="lg" variant="destructive" className="h-14 shadow-md" onClick={handleClockOut} disabled={isSubmitting}>
                                        {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                        Clock Out
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2 px-1">
                        <Clock className="h-4 w-4 text-primary" /> Today's Sessions
                    </h3>
                    {todayLogs.length > 0 ? (
                        <div className="space-y-3">
                            {todayLogs.map(log => (
                                <Card key={log.id} className="bg-background/50">
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-sm">{log.location || 'Generic Site'}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(log.startTime), 'p')} - {format(new Date(log.endTime), 'p')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-primary">{formatTimeDisplay(log.durationSeconds)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-10 border-2 border-dashed rounded-lg bg-background/50 text-muted-foreground italic text-sm">
                            No sessions logged for today yet.
                        </div>
                    )}
                </div>
            </main>

            <footer className="p-4 text-center text-[10px] text-muted-foreground border-t bg-background">
                <p>Ogeemo v1.2 | Logged in as {user?.email}</p>
            </footer>
        </div>
    );
}
