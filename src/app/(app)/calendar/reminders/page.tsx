
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle, ArrowLeft, Calendar as CalendarIcon, Save, BellRing } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addTask } from '@/services/project-service';
import { format, set } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewReminderPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [startHour, setStartHour] = useState<string>(String(new Date().getHours()));
    const [startMinute, setStartMinute] = useState<string>(String(Math.floor(new Date().getMinutes() / 5) * 5));

    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [endHour, setEndHour] = useState<string>(String(new Date().getHours() + 1));
    const [endMinute, setEndMinute] = useState<string>(String(Math.floor(new Date().getMinutes() / 5) * 5));

    const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
    const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        const initialTitle = searchParams.get('title');
        if (initialTitle) {
            setTitle(initialTitle);
        }
    }, [searchParams]);

    const hourOptions = Array.from({ length: 24 }, (_, i) => {
        const d = set(new Date(), { hours: i });
        return { value: String(i), label: format(d, 'h a') };
    });

    const minuteOptions = Array.from({ length: 12 }, (_, i) => {
        const minutes = i * 5;
        return { value: String(minutes), label: `:${minutes.toString().padStart(2, '0')}` };
    });
    
    const handleSaveReminder = async () => {
        if (!user || !title.trim() || !startDate) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a title and start date for the reminder.' });
            return;
        }
        
        setIsSaving(true);
        try {
            const finalStartDate = set(startDate, { hours: parseInt(startHour), minutes: parseInt(startMinute) });
            
            let finalEndDate: Date;
            const finalEndDateDatePart = endDate || finalStartDate;
            const finalEndHour = endHour || startHour;
            const finalEndMinute = endMinute || startMinute;
            
            finalEndDate = set(finalEndDateDatePart, { hours: parseInt(finalEndHour), minutes: parseInt(finalEndMinute) });

            if (finalEndDate <= finalStartDate) {
                finalEndDate = new Date(finalStartDate.getTime() + 30 * 60000); // Default to 30 min duration if end is before start
            }

            const reminderData = {
                title: `Reminder: ${title}`,
                description: notes,
                start: finalStartDate,
                end: finalEndDate,
                status: 'todo' as const,
                position: 0,
                userId: user.uid,
                isScheduled: true,
            };
            
            await addTask(reminderData);
            
            toast({ title: 'Reminder Saved', description: `Your reminder has been added to the calendar.` });
            router.push('/calendar');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            setIsSaving(false);
        }
    };
    
    return (
        <div className="p-4 sm:p-6 flex items-center justify-center h-full">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                        <BellRing className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Create a New Reminder</CardTitle>
                    <CardDescription>
                        This will be added as an event on your calendar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="reminder-title">Reminder Title</Label>
                        <Input id="reminder-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                             <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setIsStartPopoverOpen(false); }} initialFocus /></PopoverContent>
                            </Popover>
                            <div className="flex-1 flex gap-2">
                                <Select value={startHour} onValueChange={setStartHour}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                <Select value={startMinute} onValueChange={setStartMinute}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>End Time</Label>
                             <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={(date) => { setEndDate(date); setIsEndPopoverOpen(false); }} initialFocus /></PopoverContent>
                            </Popover>
                            <div className="flex-1 flex gap-2">
                                <Select value={endHour} onValueChange={setEndHour}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                <Select value={endMinute} onValueChange={setEndMinute}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reminder-notes">Notes (Optional)</Label>
                        <Textarea id="reminder-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     <Button asChild variant="outline">
                        <Link href="/calendar">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Calendar
                        </Link>
                    </Button>
                    <Button onClick={handleSaveReminder} disabled={isSaving}>
                        {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Reminder
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

