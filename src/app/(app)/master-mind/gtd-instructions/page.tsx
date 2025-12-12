
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox, BrainCircuit, BookOpen, Folder, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function GtdInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="grid grid-cols-3 items-center">
                <div className="flex justify-start gap-2">
                    <Button asChild variant="outline">
                        <Link href="/action-manager">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Action Manager
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/calendar">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Calendar
                        </Link>
                    </Button>
                </div>
                <div className="text-center col-span-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        The Ogeemo Method (TOM)
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Your guide to stress-free productivity within the Ogeemo workspace.
                    </p>
                </div>
                <div className="flex justify-end">
                    {/* Spacer */}
                </div>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                        The Core Philosophy: A Unified System
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                           The goal of The Ogeemo Method (TOM) is to provide a single, trusted system to manage your commitments. By getting tasks and ideas out of your head and into Ogeemo, you free up your mind to focus on what's important: doing the work and having great ideas, not just holding onto them.
                        </p>
                        <h3>Projects, Tasks, and Calendar: How They Work Together</h3>
                        <p>
                           Ogeemo's productivity tools are deeply integrated. Understanding how they connect is the key to mastering your workflow.
                        </p>
                        <ul>
                            <li>
                                <strong>Projects:</strong> A Project is any outcome that requires more than one step. This is your "YES" bin—a commitment to an outcome. You manage these high-level goals in the <Link href="/projects">Project Manager</Link>.
                            </li>
                             <li>
                                <strong>Tasks:</strong> Tasks are the individual, actionable steps that move a project forward. You manage the day-to-day work on a Kanban-style <strong>Task Board</strong> for each project.
                            </li>
                             <li>
                                <strong>Calendar:</strong> The Calendar provides a visual, time-based view of your scheduled tasks and events. Any task with a specific date and time will automatically appear here.
                            </li>
                        </ul>
                        <p>
                            <strong>The Magic of Integration:</strong> When you create a task in the <Link href="/time">Event Time Manager</Link> and link it to a project, it instantly appears on that project's Task Board and on your Calendar. Everything stays in sync automatically.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Inbox className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 1: Collect Your Commitments</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Your first goal is to capture every idea, task, and commitment in a trusted inbox instead of your head.
                                    </p>
                                    <ul>
                                        <li><strong>For Actionable Items:</strong> Use the dedicated <strong><Link href="/projects/inbox/tasks">"Action Items"</Link></strong> project as your primary inbox. This is for anything that needs to be done or decided upon.</li>
                                        <li><strong>For Ideas ("Maybe" Bin):</strong> For less-defined thoughts or future possibilities, use the <strong><Link href="/idea-board">Idea Board</Link></strong>. You can easily convert an idea into a project later.</li>
                                        <li><strong>For Scheduled Events:</strong> For a specific meeting or appointment, create it directly in the <strong><Link href="/time">Event Time Manager</Link></strong>. This places it on your calendar immediately.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 2: Process and Organize</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Regularly process your inboxes. Go to the <strong><Link href="/projects/inbox/tasks">"Action Items"</Link></strong> board and ask for each item: "What is it, and is it actionable?"
                                    </p>
                                    <ul>
                                        <li><strong>If it's a new project:</strong> Create a new project for it in the <Link href="/projects">Project Manager</Link>.</li>
                                        <li><strong>If it's a task for an existing project:</strong> Drag it from the "Action Items" board to the appropriate project's task board.</li>
                                        <li><strong>If it takes less than 2 minutes:</strong> Do it immediately.</li>
                                        <li><strong>If it needs to happen on a specific day/time:</strong> Ensure it has a date and time set so it appears on your <Link href="/calendar">Calendar</Link>.</li>
                                        <li><strong>If it's reference material:</strong> Move any related documents to a relevant folder in the <Link href="/file-manager">Document Manager</Link>.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Folder className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 3: The Weekly Review</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      The Weekly Review is the cornerstone of TOM. Set aside time each week to look over all your lists and projects to ensure they are current, clear, and complete.
                                   </p>
                                    <ul>
                                        <li>Use the <Link href="/projects">Project Manager</Link> to get a high-level view of all active projects. Are they still relevant?</li>
                                        <li>Review your <Link href="/calendar">Calendar</Link> for the upcoming week.</li>
                                        <li>Process any remaining items in your <Link href="/projects/inbox/tasks">"Action Items"</Link> project.</li>
                                        <li>Review your <Link href="/idea-board">Idea Board</Link>. Promote ideas to projects or delete them.</li>
                                    </ul>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 4: Engage and Execute</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        With a clear and organized system, you can trust your choices about what to work on. Your <strong><Link href="/action-manager">Action Manager</Link></strong> dashboard gives you a clear starting point each day, providing quick access to the tools you need to engage with your work confidently.
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
