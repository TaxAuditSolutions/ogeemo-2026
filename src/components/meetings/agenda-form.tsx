"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { type Meeting, type AgendaItem } from '@/types/meetings';
import { addMeeting } from '@/services/meetings-service';
import { addTask } from '@/services/project-service';
import { useAuth } from '@/context/auth-context';
import { Trash2, Plus, Calendar, Clock, Printer, Info } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

const generateId = () => Math.random().toString(36).substring(2, 15);

import { updateMeeting } from '@/services/meetings-service';

export function AgendaForm({ onSuccess, initialData }: { onSuccess?: () => void, initialData?: Meeting }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Meeting>({
        defaultValues: initialData ? {
            ...initialData,
            date: initialData.date ? format(initialData.date, "yyyy-MM-dd'T'HH:mm") as any : null,
            attendees: initialData.attendees ? initialData.attendees.join(', ') as any : '',
        } : {
            title: '',
            description: '',
            date: null,
            attendees: [],
            agendaItems: [],
            isScheduledToCalendar: false,
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "agendaItems"
    });

    const watchDate = useWatch({ control, name: 'date' });
    const watchAgendaItems = useWatch({ control, name: 'agendaItems' });

    const renderItemTimes = (index: number) => {
        if (!watchDate) return null;
        try {
            const baseDate = new Date(watchDate);
            if (isNaN(baseDate.getTime())) return null;

            let cumulativeMinutes = 0;
            for (let i = 0; i < index; i++) {
                cumulativeMinutes += Number(watchAgendaItems?.[i]?.durationMinutes) || 0;
            }
            
            const startTime = new Date(baseDate);
            startTime.setMinutes(startTime.getMinutes() + cumulativeMinutes);
            
            const duration = Number(watchAgendaItems?.[index]?.durationMinutes) || 0;
            const stopTime = new Date(startTime);
            stopTime.setMinutes(stopTime.getMinutes() + duration);
            
            return (
                <div className="text-xs font-mono text-muted-foreground flex items-center bg-muted px-2 py-1 rounded">
                    {format(startTime, 'h:mm a')} - {format(stopTime, 'h:mm a')}
                </div>
            );
        } catch (e) {
            return null;
        }
    };

    const onSubmit = async (data: Meeting) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // Clean up attendee string if it's entered as comma separated
            let attendeeList: string[] = [];
            if (typeof data.attendees === 'string') {
                attendeeList = (data.attendees as string).split(',').map((a: string) => a.trim()).filter((a: string) => a);
            } else if (Array.isArray(data.attendees)) {
                attendeeList = data.attendees;
            }
            
            // Format data for saving
            const meetingData: Omit<Meeting, 'id'> = {
                title: data.title,
                description: data.description,
                date: data.date ? new Date(data.date) : null,
                attendees: attendeeList,
                agendaItems: data.agendaItems.map(item => ({
                    ...item,
                    id: item.id || generateId()
                })),
                isScheduledToCalendar: data.isScheduledToCalendar,
            };

            // If scheduled to calendar, create task first to get taskId
            if (meetingData.isScheduledToCalendar && meetingData.date && (!initialData || !initialData.taskId)) {
                const totalDuration = meetingData.agendaItems.reduce((acc, item) => acc + (Number(item.durationMinutes) || 0), 0);
                const endDate = new Date(meetingData.date);
                if (totalDuration > 0) {
                    endDate.setMinutes(endDate.getMinutes() + totalDuration);
                } else {
                    endDate.setHours(endDate.getHours() + 1); // Default 1 hour
                }

                const taskData = {
                    title: `Meeting: ${meetingData.title}`,
                    description: meetingData.description,
                    start: meetingData.date,
                    end: endDate,
                    userId: user.uid,
                    status: 'todo' as const,
                    position: 0,
                    isScheduled: true
                };

                const savedTask = await addTask(taskData);
                meetingData.taskId = savedTask.id;
            }

            if (initialData?.id) {
                await updateMeeting(initialData.id, meetingData);
                toast({
                    title: "Agenda Updated",
                    description: "Meeting agenda updated successfully."
                });
            } else {
                await addMeeting(meetingData);
                toast({
                    title: "Agenda Saved",
                    description: meetingData.isScheduledToCalendar ? "Meeting saved and scheduled to calendar." : "Meeting agenda saved successfully."
                });
            }
            
            reset();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Failed to save meeting", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save meeting agenda.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }
    };

    return (
        <Card id="agenda-preview" className="w-full max-w-3xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    {initialData ? initialData.title || 'Meeting Agenda' : 'New Meeting Agenda'}
                </CardTitle>
                <div className="flex items-center gap-2 print:hidden">
                    <Button type="button" variant="outline" size="icon" onClick={() => window.print()} title="Print Agenda">
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" asChild title="Agenda Instructions">
                        <Link href="/meetings/instructions">
                            <Info className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Meeting Title</Label>
                            <Input id="title" {...register("title", { required: "Title is required" })} placeholder="e.g. Q3 Planning" />
                            {errors.title && <span className="text-sm text-red-500">{errors.title.message}</span>}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="date">Date & Time</Label>
                            <Input 
                                id="date" 
                                type="datetime-local" 
                                {...register("date")} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Objective / Description</Label>
                        <Textarea 
                            id="description" 
                            {...register("description")} 
                            placeholder="What is the goal of this meeting?"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="attendees">Attendees (Comma separated)</Label>
                        <Input 
                            id="attendees" 
                            {...register("attendees")} 
                            placeholder="John Doe, Jane Smith" 
                        />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <Label className="text-lg font-semibold">Agenda Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: generateId(), title: '', description: '', durationMinutes: 15 })}>
                                <Plus className="h-4 w-4 mr-2" /> Add Item
                            </Button>
                        </div>
                        
                        {fields.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground border rounded-md border-dashed">
                                No agenda items added yet.
                            </div>
                        )}
                        
                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-start border p-3 rounded-md bg-muted/20">
                                    <div className="font-bold pt-2">{index + 1}.</div>
                                    <div className="flex-1 space-y-3 w-full">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                                <Input 
                                                    {...register(`agendaItems.${index}.title` as const, { required: true })} 
                                                    placeholder="Topic title" 
                                                    className="flex-1 font-medium"
                                                />
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {renderItemTimes(index)}
                                                    <div className="flex items-center gap-2 w-32">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            type="number" 
                                                            {...register(`agendaItems.${index}.durationMinutes` as const)} 
                                                            placeholder="Mins" 
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Textarea 
                                            {...register(`agendaItems.${index}.description` as const)} 
                                            placeholder="Notes or description for this topic"
                                            rows={2}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-100">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-md bg-muted/40 mt-6">
                        <div className="space-y-0.5">
                            <Label className="text-base">Schedule to Calendar</Label>
                            <p className="text-sm text-muted-foreground">
                                Also create a task on your calendar for this meeting.
                            </p>
                        </div>
                        <Controller
                            control={control}
                            name="isScheduledToCalendar"
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t p-6 print:hidden">
                    <Button type="button" variant="outline" onClick={() => reset()}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Agenda'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}