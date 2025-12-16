
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Play, Pause, Square, LogIn, LogOut, ArrowLeft, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Logo } from '../logo';

interface LoggedSession {
    id: number;
    startTime: Date;
    endTime: Date;
    duration: string;
    notes: string;
}

const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function FieldAppView() {
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [isTimerPaused, setIsTimerPaused] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [notes, setNotes] = useState('');
    const [loggedSessions, setLoggedSessions] = useState<LoggedSession[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<Date | null>(null);

    const { toast } = useToast();
    const router = useRouter();

    const startTimer = useCallback(() => {
        startTimeRef.current = new Date();
        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleClockIn = () => {
        setIsClockedIn(true);
        startTimer();
        toast({ title: "Clocked In", description: "Your work session has started." });
    };

    const handleClockOut = () => {
        if (elapsedTime > 0) {
            handleLogSession();
        }
        setIsClockedIn(false);
        setIsTimerPaused(false);
        stopTimer();
        toast({ title: "Clocked Out", description: "Your work day has ended." });
    };

    const handlePauseResume = () => {
        if (isTimerPaused) {
            startTimer();
        } else {
            stopTimer();
        }
        setIsTimerPaused(!isTimerPaused);
    };

    const handleLogSession = () => {
        if (elapsedTime === 0) {
            toast({ variant: 'destructive', title: "No time to log" });
            return;
        }
        const newSession: LoggedSession = {
            id: Date.now(),
            startTime: startTimeRef.current || new Date(),
            endTime: new Date(),
            duration: formatTime(elapsedTime),
            notes,
        };
        setLoggedSessions(prev => [newSession, ...prev]);
        setElapsedTime(0);
        setNotes('');
        if (isClockedIn) {
            stopTimer();
            startTimer();
        }
        toast({ title: "Session Logged" });
    };

    useEffect(() => {
        return () => stopTimer(); // Cleanup on unmount
    }, [stopTimer]);

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="flex items-center justify-between p-4 border-b bg-background">
                <Logo />
                <Button variant="outline" onClick={() => router.push('/hr-manager')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to HR Hub
                </Button>
            </header>
            <main className="flex-1 flex flex-col items-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Ogeemo Field App</CardTitle>
                        <CardDescription>
                            {isClockedIn ? "You are currently on the clock." : "You are currently off the clock."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-6 border-4 border-dashed rounded-lg text-center">
                            <p className="text-6xl font-bold font-mono">{formatTime(elapsedTime)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {!isClockedIn ? (
                                <Button size="lg" onClick={handleClockIn} className="col-span-2">
                                    <LogIn className="mr-2 h-5 w-5" /> Clock In & Start Day
                                </Button>
                            ) : (
                                <>
                                    <Button size="lg" variant="secondary" onClick={handlePauseResume}>
                                        {isTimerPaused ? <Play className="mr-2 h-5 w-5" /> : <Pause className="mr-2 h-5 w-5" />}
                                        {isTimerPaused ? "Resume" : "Pause"}
                                    </Button>
                                    <Button size="lg" variant="destructive" onClick={handleClockOut}>
                                        <LogOut className="mr-2 h-5 w-5" /> Clock Out
                                    </Button>
                                </>
                            )}
                        </div>
                        {isClockedIn && (
                            <div className="space-y-4 pt-4 border-t">
                                <Textarea
                                    placeholder="Add notes about your current task..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                />
                                <Button className="w-full" onClick={handleLogSession}>
                                    <Square className="mr-2 h-5 w-5" /> Log Current Session
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="w-full max-w-2xl mt-6">
                    <CardHeader>
                        <CardTitle>Today's Logged Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loggedSessions.length > 0 ? (
                            <div className="space-y-4">
                                {loggedSessions.map(session => (
                                    <div key={session.id} className="flex items-start gap-4 p-3 border rounded-md">
                                        <div className="text-center">
                                            <p className="font-bold">{session.duration}</p>
                                            <p className="text-xs text-muted-foreground">{format(session.startTime, 'p')}</p>
                                        </div>
                                        <p className="text-sm">{session.notes || "No notes for this session."}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                <p>No sessions logged yet today.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
