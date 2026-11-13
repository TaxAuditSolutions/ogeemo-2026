
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Save, Link as LinkIcon, Info, Pencil, Trash2, MessageSquare, Search, Star } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from '@/components/layout/section-header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TimeManagerInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <SectionHeader
                parent={{ label: 'Activity Manager', href: '/event-manager' }}
                title="How to Use the Activity Manager"
                description="Your central hub for logging past work, scheduling future events, and tracking time live."
            />

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
                                        This manager is your single place for all time-based entries. Whether you need to log work you've already completed, schedule a future appointment, or track your time live on a task, you start here.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-selection">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Search className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Finding Activities & Quick Actions</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <ul>
                                        <li>Use <strong>New activity</strong> to clear the form and start again.</li>
                                        <li>Use <strong>Select an activity</strong> to search open activities by subject, notes, client, or project. Turn on <strong>Show completed activities</strong> when you need a completed record.</li>
                                        <li><strong>Activity actions</strong> provides timer controls, manual time entry, completion/reopening, agenda and project links, and deletion for the selected activity.</li>
                                        <li><strong>Quick actions</strong> (<Star className="inline h-4 w-4"/>) mirrors your Favorite Actions from My Shortcuts. Choose <strong>Manage favorites</strong> to customize the list and its order.</li>
                                    </ul>
                                    <p>Activity Manager asks for confirmation before a selection or internal shortcut discards unsaved edits.</p>
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
                                        Use the <strong>When</strong> controls to choose <strong>Next free slot</strong>, <strong>Pick a time</strong>, or <strong>No set time</strong>.
                                    </p>
                                     <ul>
                                        <li><strong>For Future Events:</strong> Choose Pick a time and select a future date and time to place the activity on your calendar.</li>
                                        <li><strong>For Unscheduled Work:</strong> Choose No set time. The activity remains available without a calendar appointment.</li>
                                        <li><strong>For Completed Work:</strong> Select the activity and choose <strong>Activity actions → Log actual time</strong>. Save a new activity before adding its first manual session.</li>
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
                                        The <strong>Time Sessions</strong> card allows you to track work in focused "sessions" as it happens.
                                    </p>
                                     <ol>
                                        <li>Click <strong>"Start New Session"</strong> to begin the timer. The button will change to "Pause Session".</li>
                                        <li>While the timer is running, you can add notes directly into the <strong>Session Notes</strong> text box that appears.</li>
                                        <li>Click <strong>"Pause Session"</strong> to pause the timer. The button will become "Resume Session".</li>
                                        <li>When you've completed a block of work, click <strong>"Log Session"</strong> to save that time and the notes you've written. You can log multiple sessions for a single event.</li>
                                        <li>While a session runs, the card header shows an <strong>Active session</strong> readout beside <strong>Total on this event</strong>. It ticks live with a green dot while running, and turns amber with a <strong>Paused</strong> label when paused. The total always includes the running session's time.</li>
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
                                       After a session has been logged, you can still make changes. Click the <strong>pencil</strong> (<Pencil className="inline h-4 w-4"/>) icon next to any logged session in the list to open the "Edit Recorded Session" dialog, or the <strong>trash</strong> (<Trash2 className="inline h-4 w-4"/>) icon to delete it. From there, you can:
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
                                        Turn on <strong>Mark as billable</strong> only for work that should be available for invoicing. The hourly rate field appears when billing is enabled.
                                    </p>
                                     <ul>
                                        <li>Leave billing off for internal tasks or non-client work.</li>
                                        <li>Review the hourly rate for each billable activity.</li>
                                        <li>Click <strong>Save</strong> to finalize the activity and its associated time sessions. Use <strong>Save & New</strong> when you want to continue with another activity.</li>
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
