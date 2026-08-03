"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { AgendaForm } from '@/components/meetings/agenda-form';
import { getMeetings } from '@/services/meetings-service';
import { type Meeting } from '@/types/meetings';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Calendar, Plus, CalendarDays, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useSearchParams } from 'next/navigation';

export default function MeetingsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <MeetingsPageContent />
        </Suspense>
    );
}

function MeetingsPageContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>(undefined);

    const loadMeetings = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await getMeetings();
            // Sort by date descending
            data.sort((a, b) => {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return b.date.getTime() - a.date.getTime();
            });
            setMeetings(data);
            
            // Check if we need to auto-open an agenda from a calendar link
            const taskIdParam = searchParams.get('taskId');
            if (taskIdParam) {
                const linkedMeeting = data.find(m => m.taskId === taskIdParam);
                if (linkedMeeting) {
                    setEditingMeeting(linkedMeeting);
                    setIsFormOpen(true);
                } else {
                    // Pre-fill a new one perhaps? We can just open the new form
                    setEditingMeeting(undefined);
                    setIsFormOpen(true);
                }
            }
        } catch (error) {
            console.error("Failed to load meetings", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadMeetings();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, searchParams]);

    const handleSuccess = () => {
        setIsFormOpen(false);
        setEditingMeeting(undefined);
        loadMeetings();
    };

    const handleEdit = (meeting: Meeting) => {
        setEditingMeeting(meeting);
        setIsFormOpen(true);
    };

    if (isFormOpen) {
        return (
            <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {editingMeeting ? editingMeeting.title || 'Meeting Agenda' : 'Create Agenda'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {editingMeeting ? 'View, edit, or print this meeting agenda.' : 'Plan and organize your next meeting.'}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => {
                        setIsFormOpen(false);
                        setEditingMeeting(undefined);
                    }}>
                        Back to Meetings
                    </Button>
                </div>
                <AgendaForm onSuccess={handleSuccess} initialData={editingMeeting} />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        Meetings & Agendas
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Plan your meetings, manage agendas, and schedule to your calendar.
                    </p>
                </div>
                <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Agenda
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : meetings.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 border-dashed">
                    <CalendarDays className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No meetings found</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                        Get started by creating your first meeting agenda to keep your team aligned.
                    </p>
                    <Button onClick={() => setIsFormOpen(true)} className="mt-6">
                        Create Agenda
                    </Button>
                </Card>
            ) : (
                <Card>
                    <div className="divide-y">
                        {meetings.map((meeting) => (
                            <div key={meeting.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
                                <button 
                                    onClick={() => handleEdit(meeting)} 
                                    className="flex-1 text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 focus:outline-none"
                                >
                                    <div className="font-semibold text-lg hover:underline text-primary">{meeting.title}</div>
                                    {meeting.date && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {format(meeting.date, 'MMM d, yyyy h:mm a')}
                                        </div>
                                    )}
                                </button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(meeting)} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}