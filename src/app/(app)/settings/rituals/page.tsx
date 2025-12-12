
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, updateUserProfile, type PlanningRitual } from '@/services/user-profile-service';
import { addMinutes, format, eachDayOfInterval, isWeekday, getDay, set, startOfWeek, endOfWeek, parseISO, addDays, isWeekend } from 'date-fns';
import { LoaderCircle, Save, ArrowLeft, BrainCircuit, Calendar as CalendarIcon, X, Info } from 'lucide-react';
import { addTask, deleteRitualTasks } from '@/services/project-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

// --- Type Definitions ---
type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
const daysOfWeek: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


// --- Main Component ---
export default function PlanningRitualsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDaily, setIsSavingDaily] = useState(false);
    const [isSavingWeekly, setIsSavingWeekly] = useState(false);

    // State for Daily Ritual
    const [dailyRitual, setDailyRitual] = useState<Omit<PlanningRitual, 'day'>>({
        time: '17:00',
        duration: 25,
        repeatEnabled: false,
        repeatCount: 5,
    });
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isDailyPickerOpen, setIsDailyPickerOpen] = useState(false);


    // State for Weekly Ritual
    const [weeklyRitual, setWeeklyRitual] = useState<PlanningRitual>({
        time: '15:00',
        day: 'Friday',
        duration: 90,
    });
    const [weeklyStartDate, setWeeklyStartDate] = useState<Date | undefined>();
    const [weeklyEndDate, setWeeklyEndDate] = useState<Date | undefined>();
    const [isWeeklyStartPickerOpen, setIsWeeklyStartPickerOpen] = useState(false);
    const [isWeeklyEndPickerOpen, setIsWeeklyEndPickerOpen] = useState(false);


    // Load settings on mount
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


    // Save Handlers
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

            if (isNaN(hours) || isNaN(minutes)) {
                throw new Error("Invalid time format for daily ritual.");
            }
            
            let scheduledCount = 0;

            if (dailyRitual.repeatEnabled && dailyRitual.repeatCount > 0) {
                const datesToSchedule: Date[] = [];
                let currentDate = new Date(date);
                
                while (datesToSchedule.length < dailyRitual.repeatCount) {
                    if (!isWeekend(currentDate)) {
                        datesToSchedule.push(new Date(currentDate));
                    }
                    currentDate = addDays(currentDate, 1);
                }

                for (const scheduleDate of datesToSchedule) {
                    const startTime = set(scheduleDate, { hours, minutes });
                    await addTask({
                        userId: user.uid,
                        title: 'Daily Wind-down & Plan',
                        start: startTime,
                        end: addMinutes(startTime, dailyRitual.duration),
                        status: 'todo',
                        isScheduled: true,
                        ritualType: 'daily',
                        position: 0,
                    });
                }
                scheduledCount = datesToSchedule.length;
                toast({ title: 'Daily Rituals Saved', description: `Scheduled for ${scheduledCount} upcoming weekdays.` });

            } else {
                const startTime = set(date, { hours, minutes });
                await addTask({
                    userId: user.uid,
                    title: 'Daily Wind-down & Plan',
                    start: startTime,
                    end: addMinutes(startTime, dailyRitual.duration),
                    status: 'todo',
                    isScheduled: true,
                    ritualType: 'daily',
                    position: 0,
                });
                scheduledCount = 1;
                toast({ title: 'Daily Ritual Saved', description: `Scheduled for ${format(date, 'PPP')}.` });
            }

        } catch (error: any) {
            console.error("Error saving daily ritual:", error)
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message || "An unknown error occurred." });
        } finally {
            setIsSavingDaily(false);
        }
    };

    const handleSaveWeekly = async () => {
        if (!user) return;

        if (!weeklyStartDate || !weeklyEndDate) {
            toast({ variant: 'destructive', title: 'Date Range Required', description: 'Please select a start and end date for the weekly ritual.' });
            return;
        }
        
        setIsSavingWeekly(true);

        const ritualSettingsToSave: PlanningRitual = {
            ...weeklyRitual,
        };

        try {
            // 1. Save settings
            const profile = await getUserProfile(user.uid);
            const existingPrefs = profile?.preferences || {};
            await updateUserProfile(user.uid, user.email || '', {
                preferences: { 
                    ...existingPrefs,
                    planningRituals: {
                        ...existingPrefs.planningRituals,
                        weekly: ritualSettingsToSave 
                    } 
                },
            });
            
            // 2. Delete old weekly ritual tasks
            await deleteRitualTasks(user.uid, 'weekly');

            // 3. Create new tasks
            const targetDayIndex = daysOfWeek.indexOf(weeklyRitual.day!);
            const allDaysInRange = eachDayOfInterval({ start: weeklyStartDate, end: weeklyEndDate });
            const targetDates = allDaysInRange.filter(d => getDay(d) === targetDayIndex);
            
            const [hoursStr, minutesStr] = weeklyRitual.time.split(':');
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            if (isNaN(hours) || isNaN(minutes)) {
                throw new Error("Invalid time format for weekly ritual.");
            }

            if (targetDates.length > 0) {
                for (const date of targetDates) {
                    const startTime = set(date, { hours, minutes });
                    await addTask({
                        userId: user.uid,
                        title: 'Weekly Strategic Review & Plan',
                        start: startTime,
                        end: addMinutes(startTime, 90),
                        status: 'todo',
                        isScheduled: true,
                        ritualType: 'weekly',
                        position: 0,
                    });
                }
                toast({ title: 'Weekly Ritual Saved', description: `Scheduled for ${targetDates.length} ${weeklyRitual.day}(s) in the selected range.` });
            } else {
                 toast({ variant: 'destructive', title: 'Scheduling Error', description: `Could not find any '${weeklyRitual.day}' in the selected date range.` });
            }
        } catch (error: any) {
             console.error("Error saving weekly ritual:", error)
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message || "An unknown error occurred." });
        } finally {
            setIsSavingWeekly(false);
        }
    };
    

    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
        <div className="p-4 sm:p-6 space-y-6">
            <header className="relative text-center">
                <div className="absolute top-0 right-0 flex items-center gap-2">
                    <Button asChild className="bg-gradient-to-r from-glass-start to-glass-end text-black">
                        <Link href="/calendar">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Calendar
                        </Link>
                    </Button>
                     <Button asChild variant="ghost" size="icon">
                        <Link href="/settings/rituals/instructions">
                            <Info className="h-5 w-5" />
                            <span className="sr-only">Instructions</span>
                        </Link>
                    </Button>
                     <Button asChild variant="ghost" size="icon">
                        <Link href="/action-manager">
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-center items-center gap-3">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold font-headline text-primary">Planning Rituals</h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    Automate your planning sessions. Set your preferences here, and Ogeemo will automatically add these focus blocks to your calendar for the selected date range.
                </p>
            </header>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Wind-down Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Wind-down & Plan</CardTitle>
                        <CardDescription>A short session at the end of each weekday to clear your head and plan for tomorrow.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                             <Popover open={isDailyPickerOpen} onOpenChange={setIsDailyPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={handleDailyDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input 
                                    type="time" 
                                    value={dailyRitual.time} 
                                    onChange={e => setDailyRitual(p => ({ ...p, time: e.target.value }))} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration</Label>
                                <Select value={String(dailyRitual.duration)} onValueChange={v => setDailyRitual(p => ({ ...p, duration: Number(v) }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="25">25 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                         <div className="flex items-center space-x-2 pt-2">
                            <Checkbox 
                                id="repeat-enabled" 
                                checked={dailyRitual.repeatEnabled}
                                onCheckedChange={(checked) => setDailyRitual(p => ({...p, repeatEnabled: !!checked}))}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                htmlFor="repeat-enabled"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                Schedule Repeat
                                </label>
                                <p className="text-xs text-muted-foreground">
                                Schedule this for multiple upcoming weekdays.
                                </p>
                            </div>
                        </div>
                        {dailyRitual.repeatEnabled && (
                            <div className="space-y-2 pl-6 animate-in fade-in-50">
                                <Label htmlFor="repeat-count">Number of Repeats (Weekdays)</Label>
                                <Input
                                    id="repeat-count"
                                    type="number"
                                    value={dailyRitual.repeatCount}
                                    onChange={(e) => setDailyRitual(p => ({...p, repeatCount: Number(e.target.value)}))}
                                    min="1"
                                    max="30"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Weekly Strategic Review Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Strategic Review & Plan</CardTitle>
                        <CardDescription>Block off a 90-minute session each week to review progress and plan the upcoming week.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover open={isWeeklyStartPickerOpen} onOpenChange={setIsWeeklyStartPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !weeklyStartDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {weeklyStartDate ? format(weeklyStartDate, "PPP") : <span>Start Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={weeklyStartDate} onSelect={(date) => { setWeeklyStartDate(date); setIsWeeklyStartPickerOpen(false); }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover open={isWeeklyEndPickerOpen} onOpenChange={setIsWeeklyEndPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !weeklyEndDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {weeklyEndDate ? format(weeklyEndDate, "PPP") : <span>End Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={weeklyEndDate} onSelect={(date) => { setWeeklyEndDate(date); setIsWeeklyEndPickerOpen(false); }} disabled={(date) => weeklyStartDate ? date < weeklyStartDate : false} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Day of the Week</Label>
                            <Select value={weeklyRitual.day} onValueChange={v => setWeeklyRitual(p => ({ ...p, day: v as DayOfWeek }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {daysOfWeek.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input type="time" value={weeklyRitual.time} onChange={e => setWeeklyRitual(p => ({ ...p, time: e.target.value }))} />
                        </div>
                    </CardContent>
                </Card>
            </div>

             <Card className="max-w-4xl mx-auto mt-6">
                <CardFooter className="p-4 flex justify-center items-center gap-4">
                    <Button
                        onClick={handleSaveDaily}
                        disabled={isSavingDaily}
                        className="w-full bg-gradient-to-r from-glass-start to-glass-end text-black"
                    >
                         {isSavingDaily && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Daily Ritual
                    </Button>
                    <Button
                        onClick={handleSaveWeekly}
                        disabled={isSavingWeekly}
                        className="w-full bg-gradient-to-r from-glass-start to-glass-end text-black"
                    >
                         {isSavingWeekly && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Weekly Ritual
                    </Button>
                </CardFooter>
            </Card>
        </div>
        </>
    );
}
