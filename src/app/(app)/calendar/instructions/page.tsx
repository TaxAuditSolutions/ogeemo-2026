
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Calendar, MousePointerClick, GripVertical, Columns, Clock, Zap, BrainCircuit } from "lucide-react";

export default function CalendarInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        The Ogeemo Execution Engine
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Your guide to orchestrating your day with the Temporal Matrix.
                    </p>
                </div>
                <div className="flex-1 flex justify-end">
                    <Button asChild variant="outline">
                        <Link href="/calendar">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Calendar
                        </Link>
                    </Button>
                </div>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-primary" />
                        Understanding Dynamic Temporal Granularity
                    </CardTitle>
                    <CardDescription>
                        Why Ogeemo is more than just a calendar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                            Most calendars are built for "appointments"—large 30 or 60-minute blocks of time. Ogeemo is built for <strong>execution</strong>. We know that a business day is driven by dozens of small, high-value actions that usually fall through the cracks.
                        </p>
                        <p>
                            Our <strong>Temporal Matrix</strong> allows you to divide every hour into up to 12 discrete slots (5-minute increments). This ensures that "invisible work"—like a quick client call or an invoice approval—has its own visual space, making it easy to track, bill, and organize.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Columns className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Setting the Resolution (Slots)</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>You have total control over the density of your day:</p>
                                    <ul>
                                        <li><strong>Adjusting Slots:</strong> Click on the time label (e.g., "9 AM") on the far left. A menu will appear allowing you to select how many slots you want for that specific hour.</li>
                                        <li><strong>5-Minute Precision:</strong> Choose "12 slots/hr" to manage high-density micro-tasks with 5-minute precision.</li>
                                        <li><strong>Standard View:</strong> Choose "1 slot/hr" or "2 slots/hr" for times of the day focused on longer, deep-work sessions or meetings.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <BrainCircuit className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Orchestrating the "Spider Web"</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>The Calendar is the final destination for your intentions across Ogeemo:</p>
                                    <ul>
                                        <li><strong>From Idea Board:</strong> Send vague thoughts to the Scheduler to turn them into timed reality.</li>
                                        <li><strong>From Project Planner:</strong> Steps defined in your blueprint can be dragged directly into the calendar grid.</li>
                                        <li><strong>From To-Do List:</strong> Quickly clear your unassigned inbox by assigning tasks to specific time slots.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Drag & Drop Orchestration</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      Rescheduling is instant. Click and drag any task to a new slot. The event will snap to the current hour's resolution, automatically updating its start and end times in the database.
                                   </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Zap className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">The Quick Add (+) System</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <ul>
                                        <li><strong>Timed Tasks:</strong> Hover over any empty slot and click the "+" icon to open the Scheduler with that time pre-selected.</li>
                                        <li><strong>All Day Events:</strong> Hover over the "All Day" area at the top of a date and click the "+" icon to schedule a commitment that spans the entire day.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
