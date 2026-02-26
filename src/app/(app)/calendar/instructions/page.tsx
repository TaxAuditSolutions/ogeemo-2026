
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
import { ArrowLeft, Calendar, MousePointerClick, GripVertical, Columns, Clock, Zap, BrainCircuit, ShieldCheck, Route, Briefcase, ListTodo, Lightbulb, FolderSync, ArrowRight } from "lucide-react";

/**
 * @fileOverview Operational instructions for the Command Centre (Calendar).
 */
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
                        Your guide to orchestrating your day with the Command Centre.
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

            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <Card className="border-2 border-primary/10">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="flex items-center gap-3">
                            <Calendar className="h-6 w-6 text-primary" />
                            Why we call it the "Command Centre"
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-lg leading-relaxed">
                                The Ogeemo Calendar is much more than a simple list of appointments. It is the **Execution Hub** of your entire business. Interconnected with the Ogeemo Spider Web, it serves as the driver for getting things done by converting intentions and ideas into Plans of Action (Projects).
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider">
                                    <Zap className="h-5 w-5" />
                                    Interconnected Hub
                                </div>
                                <p className="text-sm text-muted-foreground">The Command Centre is designed for high-speed pivots. Process multiple actions from one view: link tasks to projects, set billable rates, and update your ledger instantly.</p>
                            </div>
                            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider">
                                    <Clock className="h-5 w-5" />
                                    Temporal Granularity
                                </div>
                                <p className="text-sm text-muted-foreground">Capture the "invisible work." Use our unique 5-minute slots to record rapid client consults and administrative tasks that typically fall through the cracks.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-primary text-primary-foreground shadow-xl overflow-hidden border-none">
                    <CardContent className="p-8 space-y-6 text-center">
                        <div className="mx-auto bg-white/20 p-3 rounded-full w-fit">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <blockquote className="text-2xl font-medium italic font-headline leading-tight">
                            "A business without good records is a ship in a sea fraught with potential problems."
                        </blockquote>
                        <div className="flex justify-center pt-2">
                            <Button asChild variant="secondary" size="lg" className="h-14 px-10 text-lg font-bold shadow-2xl">
                                <Link href="/accounting/audit-ready">
                                    Become Audit Ready <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            The Core Philosophy: The Ogeemo Spider Web
                        </CardTitle>
                        <CardDescription>Everything is connected by your Master Action Chip.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Route className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Turning Ideas into Results</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>The Command Centre is the bridge between a vague thought and a completed outcome:</p>
                                        <ul>
                                            <li><strong>Tasks (Actions):</strong> The individual steps that move a project forward. Manage these on visual Kanban boards.</li>
                                            <li><strong>Projects (Plans):</strong> A group of tasks requiring multiple steps to achieve a goal.</li>
                                            <li><strong>Execution:</strong> Initiate tasks or projects directly from the calendar. Projects launched here include all fields needed to start work immediately.</li>
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Calculator className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Native Billing Integration</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>When you initiate a task or project from the Command Centre, you can toggle it as <strong>Billable</strong>. This orchestration automatically:</p>
                                        <ul>
                                            <li>Updates your billable actions log in real-time.</li>
                                            <li>Syncs with the BKS General Ledger.</li>
                                            <li>Ensures your professional timing is captured for client statements.</li>
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <FolderSync className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Structured Document Integration</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>Documents associated with your calendar events are integrated into Ogeemo's structural folders. They are saved to a mirrored environment synced with your Google Drive, following the strict chronological naming protocol.</p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4" className="border-b-0">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Sales & Leads Orchestration</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>The project manager can be used as your sales management tracker. Use the Command Centre to schedule follow-ups that turn prospects and leads into high-value projects.</p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <div className="bg-muted p-6 rounded-lg text-center border-2 border-dashed">
                    <p className="text-sm text-muted-foreground">
                        The Command Centre ensures that your business isn't a collection of random records, but a network of interconnected nodes where every signal updates your entire operational web.
                    </p>
                </div>
            </div>
        </div>
    );
}
