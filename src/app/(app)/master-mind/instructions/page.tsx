
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Calendar, Save, Link as LinkIcon, Info, MoreVertical, Pencil, MessageSquare } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TimeManagerInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="grid grid-cols-3 items-center">
                <div className="flex justify-start">
                    {/* This space is intentionally left empty to balance the grid */}
                </div>
                <div className="text-center col-span-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        How to Use The Master Mind
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Your central hub for logging past work, scheduling future events, and tracking time live.
                    </p>
                </div>
                <div className="flex justify-end">
                    <Button asChild variant="outline">
                        <Link href="/master-mind">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to The Master Mind
                        </Link>
                    </Button>
                </div>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Info className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Core Concept: A Unified Hub</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        This manager is your single command center for all time-based entries. Whether you need to log work you've already completed, schedule a future appointment, or track your time live on a task, you start here.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Scheduling & Logging Past Work</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Use the <strong>"Set Start Time"</strong> controls to define when an event happens.
                                    </p>
                                     <ul>
                                        <li><strong>For Future Events:</strong> Select a future date and time. This will place a new event on your calendar.</li>
                                        <li><strong>For Past Work:</strong> Select a past date and time. This will create a completed entry in your log for that time.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Live Time Tracking & Sessions</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        The <strong>Time Log</strong> card allows you to track work in focused "sessions" as it happens.
                                    </p>
                                     <ol>
                                        <li>Click <strong>"Start New Session"</strong> to begin the timer. The button will change to "Pause Session".</li>
                                        <li>While the timer is running, you can add notes directly into the <strong>Session Notes</strong> text box that appears.</li>
                                        <li>Click <strong>"Pause Session"</strong> to pause the timer. The button will become "Resume Session".</li>
                                        <li>When you've completed a block of work, click <strong>"Log Session"</strong> to save that time and the notes you've written. You can log multiple sessions for a single event.</li>
                                    </ol>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-4">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Pencil className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Editing Logged Sessions</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                       After a session has been logged, you can still make changes. Click the <strong>3-dot menu</strong> (<MoreVertical className="inline h-4 w-4"/>) next to any logged session in the list to open the "Edit Time Session" dialog. From there, you can:
                                    </p>
                                     <ul>
                                        <li>Adjust the total hours and minutes for that session.</li>
                                        <li>Add or edit the session notes.</li>
                                        <li>Delete the session entirely.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-5">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 text-primary flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full border-2 border-primary bg-primary/20"></div>
                                    </div>
                                    <span className="font-semibold">Billing & Saving</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Use the <strong>Billing Status</strong> radio buttons to make a clear choice for every entry. This prevents accidental billing errors.
                                    </p>
                                     <ul>
                                        <li><strong>Non-Billable:</strong> The default, safe option for internal tasks or non-client work.</li>
                                        <li><strong>Billable:</strong> Select this to make the time entry billable. The rate input will appear, allowing you to set your hourly rate for this specific task.</li>
                                        <li>Click <strong>"Save to Data Base & Close"</strong> to finalize the event and all associated time logs.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-6" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <LinkIcon className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Linking to Clients & Projects</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        For accurate reporting and invoicing, always link your time entries to a specific <strong>Client</strong> and, if applicable, a <strong>Project</strong>. This ensures that all your work is correctly allocated and can be easily pulled into reports later.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
