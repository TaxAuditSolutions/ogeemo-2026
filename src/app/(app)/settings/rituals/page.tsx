
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, updateUserProfile, type PlanningRitual } from '@/core/user-profile-service';
import { addMinutes, format, eachDayOfInterval, getDay, set, addDays, isWeekend, parseISO } from 'date-fns';
import { LoaderCircle, Save, ArrowLeft, BrainCircuit, Calendar as CalendarIcon, X, Info } from 'lucide-react';
import { addTask, deleteRitualTasks } from '@/services/project-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
const daysOfWeek: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PlanningRitualsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDaily, setIsSavingDaily] = useState(false);
    const [isSavingWeekly, setIsSavingWeekly] = useState(false);

    // Initial state set to undefined/null to prevent hydration errors
    const [dailyRitual, setDailyRitual] = useState<Omit<PlanningRitual, 'day'>>({
        time: '17:00',
        duration: 25,
        repeatEnabled: false,
        repeatCount: 5,
    });
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [isDailyPickerOpen, setIsDailyPickerOpen] = useState(false);

    const [weeklyRitual, setWeeklyRitual] = useState<PlanningRitual>({
        time: '15:00',
        day: 'Friday',
        duration: 90,
    });
    const [weeklyStartDate, setWeeklyStartDate] = useState<Date | undefined>(undefined);
    const [weeklyEndDate, setWeeklyEndDate] = useState<Date | undefined>(undefined);
    const [isWeeklyStartPickerOpen, setIsWeeklyStartPickerOpen] = useState(false);
    const [isWeeklyEndPickerOpen, setIsWeeklyEndPickerOpen] = useState(false);

    // Initialize values on client mount
    useEffect(() => {
        setDate(new Date());
    }, []);

    const loadSettings = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            try {
                const profile = await getUserProfile(user.uid);
                if (profile?.preferences?.planningRituals) {
                    const { daily, weekly } = profile.preferences.planningRituals;
                    if (daily) setDailyRitual(prev => ({ ...prev, ...daily }));
                    if (weekly) setWeeklyRitual(weekly);
                }
            } catch (error) {
                console.error("Error loading settings:", error)
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load your saved settings.' });
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);
    
    const handleDailyDateSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        if (selectedDate) {
            setIsDailyPickerOpen(false);
        }
    };

    const handleSaveDaily = async () => {
        if (!user) return;
        if (!date) {
            toast({ variant: 'destructive', title: 'Date Required', description: 'Please pick a starting date for the daily ritual.' });
            return;
        }

        setIsSavingDaily(true);
        try {
            const profile = await getUserProfile(user.uid);
            const existingPrefs = profile?.preferences || {};
            await updateUserProfile(user.uid, user.email || '', {
                preferences: { 
                    ...existingPrefs,
                    planningRituals: {
                        ...existingPrefs.planningRituals,
                        daily: dailyRitual,
                    } 
                },
            });

            await deleteRitualTasks(user.uid, 'daily');
            
            const [hoursStr, minutesStr] = dailyRitual.time.split(':');
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid time format.");
            
            if (dailyRitual.repeatEnabled && dailyRitual.repeatCount > 0) {
                let currentDate = new Date(date);
                let scheduled = 0;
                while (scheduled < dailyRitual.repeatCount) {
                    if (!isWeekend(currentDate)) {
                        const startTime = set(currentDate, { hours, minutes });
                        await addTask({
                            userId: user.uid,
                            title: 'Daily Wind-down & Plan',
                            start: startTime,
                            end: addMinutes(startTime, dailyRitual.duration),
                            status: 'todo',
                            isScheduled: true,
                            position: 0,
                            ritualType: 'daily'
                        });
                        scheduled++;
                    }
                    currentDate = addDays(currentDate, 1);
                }
                toast({ title: 'Daily Rituals Saved' });
            } else {
                const startTime = set(date, { hours, minutes });
                await addTask({
                    userId: user.uid,
                    title: 'Daily Wind-down & Plan',
                    start: startTime,
                    end: addMinutes(startTime, dailyRitual.duration),
                    status: 'todo',
                    isScheduled: true,
                    position: 0,
                    ritualType: 'daily'
                });
                toast({ title: 'Daily Ritual Saved' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSavingDaily(false);
        }
    };

    const handleSaveWeekly = async () => {
        if (!user || !weeklyStartDate || !weeklyEndDate) {
            toast({ variant: 'destructive', title: 'Data Required', description: 'Please fill all fields.' });
            return;
        }
        setIsSavingWeekly(true);
        try {
            const profile = await getUserProfile(user.uid);
            const existingPrefs = profile?.preferences || {};
            await updateUserProfile(user.uid, user.email || '', {
                preferences: { ...existingPrefs, planningRituals: { ...existingPrefs.planningRituals, weekly: weeklyRitual } },
            });
            
            await deleteRitualTasks(user.uid, 'weekly');

            const targetDayIndex = daysOfWeek.indexOf(weeklyRitual.day!);
            const allDaysInRange = eachDayOfInterval({ start: weeklyStartDate, end: weeklyEndDate });
            const targetDates = allDaysInRange.filter(d => getDay(d) === targetDayIndex);
            const [hoursStr, minutesStr] = weeklyRitual.time.split(':');
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            for (const d of targetDates) {
                const startTime = set(d, { hours, minutes });
                await addTask({
                    userId: user.uid,
                    title: 'Weekly Strategic Review & Plan',
                    start: startTime,
                    end: addMinutes(startTime, weeklyRitual.duration),
                    status: 'todo',
                    isScheduled: true,
                    position: 0,
                    ritualType: 'weekly'
                });
            }
            toast({ title: 'Weekly Ritual Saved' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSavingWeekly(false);
        }
    };

    if (isLoading) return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="relative text-center">
                <div className="absolute top-0 right-0 flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/calendar"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                </div>
                <h1 className="text-3xl font-bold text-primary">Planning Rituals</h1>
                <p className="text-muted-foreground mt-2">Automate your focus blocks.</p>
            </header>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Daily Wind-down</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Popover open={isDailyPickerOpen} onOpenChange={setIsDailyPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start", !date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={handleDailyDateSelect} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Time</Label><Input type="time" value={dailyRitual.time} onChange={e => setDailyRitual(p => ({ ...p, time: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Duration</Label><Select value={String(dailyRitual.duration)} onValueChange={v => setDailyRitual(p => ({ ...p, duration: Number(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 min</SelectItem><SelectItem value="25">25 min</SelectItem><SelectItem value="30">30 min</SelectItem></SelectContent></Select></div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="repeat-enabled" checked={dailyRitual.repeatEnabled} onCheckedChange={(checked) => setDailyRitual(p => ({...p, repeatEnabled: !!checked}))} />
                            <Label htmlFor="repeat-enabled">Repeat for {dailyRitual.repeatCount} weekdays</Label>
                        </div>
                    </CardContent>
                    <CardFooter><Button onClick={handleSaveDaily} disabled={isSavingDaily} className="w-full">{isSavingDaily && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Save Daily</Button></CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Weekly Review</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2"><Label>From</Label>
                                <Popover open={isWeeklyStartPickerOpen} onOpenChange={setIsWeeklyStartPickerOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{weeklyStartDate ? format(weeklyStartDate, "PP") : "Start"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={weeklyStartDate} onSelect={d => { setWeeklyStartDate(d); setIsWeeklyStartPickerOpen(false); }} initialFocus /></PopoverContent></Popover>
                            </div>
                            <div className="space-y-2"><Label>To</Label>
                                <Popover open={isWeeklyEndPickerOpen} onOpenChange={setIsWeeklyEndPickerOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{weeklyEndDate ? format(weeklyEndDate, "PP") : "End"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={weeklyEndDate} onSelect={d => { setWeeklyEndDate(d); setIsWeeklyEndPickerOpen(false); }} initialFocus /></PopoverContent></Popover>
                            </div>
                        </div>
                        <div className="space-y-2"><Label>Day</Label><Select value={weeklyRitual.day} onValueChange={v => setWeeklyRitual(p => ({ ...p, day: v as DayOfWeek }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{daysOfWeek.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Time</Label><Input type="time" value={weeklyRitual.time} onChange={e => setWeeklyRitual(p => ({ ...p, time: e.target.value }))} /></div>
                    </CardContent>
                    <CardFooter><Button onClick={handleSaveWeekly} disabled={isSavingWeekly} className="w-full">{isSavingWeekly && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Save Weekly</Button></CardFooter>
                </Card>
            </div>
        </div>
    );
}
    
