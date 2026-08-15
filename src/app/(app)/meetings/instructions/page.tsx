import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, Info, Calendar, Users, FileText } from 'lucide-react';

export default function MeetingsInstructionsPage() {
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
                    <Link href="/meetings">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Meetings
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Info className="h-8 w-8 text-primary" />
                    How to Use Agendas
                </h1>
                <p className="text-muted-foreground mt-2">
                    A guide to managing meeting agendas and integrating them with your calendar.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            What is an Agenda?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            An Agenda is a structured plan for your meeting. It helps you prepare topics, allocate time, and keep attendees focused. 
                            In Ogeemo, you can build an agenda item by item, setting the title, description, and the "Allowed Time" (duration in minutes) for each topic.
                        </p>
                        <p>
                            As you add topics and set their allowed times, the system automatically calculates the exact Start Time and Stop Time for each item based on the master Date & Time of the meeting. This ensures a seamless flow and helps you quickly adapt if the meeting time changes.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Calendar Integration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            When creating or editing an agenda, you will notice a <strong>Schedule to Calendar</strong> toggle at the bottom. 
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>When Toggled On:</strong> Ogeemo will automatically sum up the allowed time for all your agenda items and create a corresponding calendar event block in your main Calendar and Command Centre.
                            </li>
                            <li>
                                <strong>Linked Access:</strong> Once an agenda is scheduled to the calendar, you can view the calendar event and click the 3-dot menu to select <em>"View Agenda"</em>. This instantly brings you back to the agenda form.
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Tips for Effective Meetings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Add Attendees:</strong> Use the Attendees field to keep track of who should be present.</li>
                            <li><strong>Reorder with Ease:</strong> When you modify the duration of an item, all subsequent start and stop times instantly adjust.</li>
                            <li><strong>Print for Handouts:</strong> Use the Print button in the top right corner of the Agenda form to generate a clean, printer-friendly version of your schedule to hand out to attendees.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}