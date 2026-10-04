'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, BrainCircuit, BookOpen, Folder, Calendar, CheckCircle, Rocket, Info, MoreVertical, Zap } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from '@/components/layout/section-header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * @fileOverview The Ogeemo Method (TOM) instructional guide.
 * This page outlines the core productivity philosophy of the platform.
 */
export default function GtdInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <SectionHeader
                parent={{ label: 'My Shortcuts', href: '/action-manager' }}
                title="The Ogeemo Method (TOM)"
                description="Run your daily business operations with ease."
                actions={
                    <Button asChild variant="outline">
                        <Link href="/calendar">
                            Calendar
                        </Link>
                    </Button>
                }
            />

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                        The Core Philosophy: Connected Business Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                            Ogeemo connects the different parts of your business so information can flow between your clients, projects, activities, time, billing and reporting.
                        </p>
                        <p>
                            <strong>Enter information once and use it wherever you need it.</strong>
                        </p>
                        <h3>Projects, Tasks and Activity Manager</h3>
                        <ul>
                            <li>
                                <strong>Projects — What you're working toward:</strong> Use Projects to organize work that involves multiple activities or steps. Manage them in the <Link href="/projects/all" className="text-primary hover:underline">Project Manager</Link>.
                            </li>
                             <li>
                                <strong>Tasks — What needs to be done:</strong> Use Tasks to keep track of the individual actions needed to move work forward. Tasks live on visual boards within each project.
                            </li>
                             <li>
                                <strong>Activity Manager — What happened and when:</strong> Use the <Link href="/event-manager" className="text-primary hover:underline">Activity Manager</Link> to record appointments, calls, meetings, work sessions and other business activity. Link activities to clients and projects so your records stay connected, including the short jobs that usually get missed.
                            </li>
                        </ul>
                        <p>
                            <strong>Connected automatically:</strong> When you record an activity and connect it to a project, Ogeemo makes that information available where it's needed — including the project board, project activity, time records and billing where applicable.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Inbox className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 1: Capture</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Record tasks, ideas, appointments and other business activity as they happen.
                                    </p>
                                    <ul>
                                        <li><strong>For Actions:</strong> Use the <strong><Link href="/projects/inbox/tasks" className="text-primary hover:underline">"Action Items"</Link></strong> project as your primary inbox for to-dos.</li>
                                        <li><strong>For Possibilities:</strong> Use the <strong><Link href="/idea-board" className="text-primary hover:underline">Idea Board</Link></strong> for vague thoughts or future "maybe" items.</li>
                                        <li><strong>For Appointments:</strong> Schedule fixed commitments directly in the <strong><Link href="/event-manager" className="text-primary hover:underline">Activity Manager</Link></strong>.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 2: Organize</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Connect your work to the right client, project, person or schedule. Go to the <strong>"Action Items"</strong> board and ask: "Is this actionable?"
                                    </p>
                                    <ul>
                                        <li><strong>If it's a goal:</strong> Create a new project in the <Link href="/projects/all" className="text-primary hover:underline">Project Manager</Link>.</li>
                                        <li><strong>If it's a step:</strong> Drag it to the appropriate project's task board.</li>
                                        <li><strong>If it's timed:</strong> Assign a date/time so it appears in the <Link href="/calendar" className="text-primary hover:underline">Calendar</Link>.</li>
                                        <li><strong>If it's reference:</strong> Archive it to the <strong><Link href="/document-manager" className="text-primary hover:underline">Document Manager</Link></strong> using the naming convention.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Zap className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 3: Personalize</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      Set up your shortcuts and workspace around the tools you use most. Open <strong>Customize Shortcuts</strong> to get started.
                                   </p>
                                    <ul>
                                        <li>Go to <strong><Link href="/action-manager/manage" className="text-primary hover:underline">Customize My Shortcuts</Link></strong>.</li>
                                        <li>Drag only the tools you need into your "My Shortcuts" list.</li>
                                        <li>Your shortcuts appear in the sidebar, so the tools you use most are always one click away.</li>
                                    </ul>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 4: Work &amp; Review</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Complete your work and use Ogeemo to keep track of what's done, what's next and what needs attention. A <strong>Weekly Review</strong> is a good time to check that your shortcuts and projects still match how you work.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

            <Card className="max-w-4xl mx-auto mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Rocket className="h-6 w-6 text-primary" />
                        Getting Started Guide
                    </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <h4>1. Choose Your Workspace</h4>
                    <p>
                        Choose the navigation view that works best for you — Full Menu, Grouped or Favorites — and set up shortcuts to the tools you use most with <Link href="/action-manager/manage" className="text-primary hover:underline">My Shortcuts</Link>.
                    </p>
                    
                    <h4>2. Set Up Your Business</h4>
                    <p>
                        Add or confirm your business information, logo, tax settings and other company details in <strong><Link href="/settings" className="text-primary hover:underline">Settings</Link></strong>. This ensures your <Link href="/accounting/invoices/create" className="text-primary hover:underline">Invoices</Link> and <Link href="/accounting/tax/categories" className="text-primary hover:underline">Tax Categories</Link> are professionally aligned from day one.
                    </p>

                    <h4>3. Start Working</h4>
                    <p>
                        Add a client, create a project or record an activity — Ogeemo will connect related information as you work. Most items are intuitive, and you can always click an info icon (<Info className="inline h-4 w-4" />) or 3-dot menu (<MoreVertical className="inline h-4 w-4" />) for more options.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
