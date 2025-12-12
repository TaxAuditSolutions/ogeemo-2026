
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
import { ArrowLeft, Calendar, MousePointerClick, GripVertical, Columns } from "lucide-react";

export default function CalendarInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        How to Use the Calendar
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A guide to managing your schedule and tasks visually.
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
                <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Navigating Your Schedule</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <ul>
                                        <li>Use the main date display to open a date picker and jump to any date.</li>
                                        <li>Use the left and right arrow buttons to move forward or backward by the number of days displayed.</li>
                                        <li>Click "Today" to instantly return to the current day's view.</li>
                                        <li>Use the "Day(s)" dropdown to change how many days are visible at once.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <MousePointerClick className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Creating & Editing Events</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <ul>
                                        <li>To create a new event, simply click on an empty time slot. This will take you to the Event Manager with the time pre-filled.</li>
                                        <li>To edit an existing event, click on it or use the 3-dot menu and select "Open / Edit".</li>
                                        <li>You can mark tasks as complete, log time, or jump to the associated project directly from the event's menu.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Drag & Drop Functionality</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      To reschedule an event, simply click and drag it to a new time slot on the calendar. The event's duration will be preserved, and its start time will be updated automatically.
                                   </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Columns className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Time Slots & Views</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <ul>
                                        <li>Click on the time label (e.g., "9 AM") on the left to change the number of slots within that hour for more precise scheduling.</li>
                                        <li>Use the Settings icon in the top right to adjust the visible hours of your day (e.g., show 8 AM to 5 PM).</li>
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
