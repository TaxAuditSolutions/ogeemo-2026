'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox, BrainCircuit, BookOpen, Folder, Calendar, CheckCircle, Rocket, Info, MoreVertical, Zap } from "lucide-react";
import Link from "next/link";
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
            <header className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
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
                <div className="text-center">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        The Ogeemo Method (TOM)
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        High-fidelity orchestration for your business operations.
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
                        The Core Philosophy: The Spider Web
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                           The Ogeemo Method (TOM) is built on the <strong>Spider Web Architecture</strong>. We believe that your business isn't a collection of silos, but a network of interconnected nodes. Every task, client communication, and ledger entry is a signal that travels across your web.
                        </p>
                        <h3>Projects, Tasks, and the Command Centre</h3>
                        <p>
                           Ogeemo's productivity tools are deeply integrated. Understanding how they connect is the key to mastering your workflow.
                        </p>
                        <ul>
                            <li>
                                <strong>Projects (The Outcomes):</strong> A Project is any goal requiring multiple steps. Manage high-level outcomes in the <Link href="/projects/all" className="text-primary hover:underline">Project Manager</Link>.
                            </li>
                             <li>
                                <strong>Tasks (The Actions):</strong> The individual steps that move a project forward. Manage these on visual Kanban boards within each project.
                            </li>
                             <li>
                                <strong>Command Centre (The Execution):</strong> Your visual time-based view. Any task with a specific date and time automatically appears here. Use the 5-minute temporal granularity to capture work that usually falls through the cracks.
                            </li>
                        </ul>
                        <p>
                            <strong>Native Integration:</strong> When you create an entry in the <Link href="/master-mind" className="text-primary hover:underline">Command Centre</Link> and link it to a project, it instantly appears on that project's board and updates your time logs for billing.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Inbox className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 1: Capture Signals</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Free your mind by offloading every thought into a trusted Ogeemo node.
                                    </p>
                                    <ul>
                                        <li><strong>For Actions:</strong> Use the <strong><Link href="/projects/inbox/tasks" className="text-primary hover:underline">"Action Items"</Link></strong> project as your primary inbox for to-dos.</li>
                                        <li><strong>For Possibilities:</strong> Use the <strong><Link href="/idea-board" className="text-primary hover:underline">Idea Board</Link></strong> for vague thoughts or future "maybe" items.</li>
                                        <li><strong>For Appointments:</strong> Schedule fixed commitments directly in the <strong><Link href="/master-mind" className="text-primary hover:underline">Command Centre</Link></strong>.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 2: Triage & Process</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Regularly process your inboxes. Go to the <strong>"Action Items"</strong> board and ask: "Is this actionable?"
                                    </p>
                                    <ul>
                                        <li><strong>If it's a goal:</strong> Create a new project in the <Link href="/projects/all" className="text-primary hover:underline">Project Manager</Link>.</li>
                                        <li><strong>If it's a step:</strong> Drag it to the appropriate project's task board.</li>
                                        <li><strong>If it's timed:</strong> Assign a date/time so it appears in the <Link href="/calendar" className="text-primary hover:underline">Command Centre</Link>.</li>
                                        <li><strong>If it's reference:</strong> Archive it to the <strong><Link href="/document-manager" className="text-primary hover:underline">Document Manager</Link></strong> using the high-fidelity naming protocol.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Zap className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 3: Sculpt Your Workspace</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      Use <strong>Action Chip Magic</strong> to customize your dashboard.
                                   </p>
                                    <ul>
                                        <li>Go to <strong><Link href="/action-manager/manage" className="text-primary hover:underline">Action Manager Settings</Link></strong>.</li>
                                        <li>Drag only the tools you need into your "Selected" list.</li>
                                        <li>This creates a personalized "Command Strip" in your sidebar, reducing cognitive load and maximizing speed.</li>
                                    </ul>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 4: Execute & Review</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Trust your system. Engage with your <strong>Action Manager</strong> dashboard to execute your daily mission. Perform a <strong>Weekly Review</strong> to ensure your web remains current, clear, and complete.
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
                    <h4>1. Audit Your Environment</h4>
                    <p>
                        Explore the sidebar. Notice the three views: Full Menu, Grouped, and Favorites. Decide which managers are critical to your operation and use the Action Manager to surface them.
                    </p>
                    
                    <h4>2. Configure Your Profile</h4>
                    <p>
                        Click <strong><Link href="/settings" className="text-primary hover:underline">Settings</Link></strong>. Enter your business name and BN. This ensures your <Link href="/accounting/invoices/create" className="text-primary hover:underline">Invoices</Link> and <Link href="/accounting/tax/categories" className="text-primary hover:underline">Tax Categories</Link> are professionally aligned from day one.
                    </p>

                    <h4>3. Decide and Act</h4>
                    <p>
                        Everything in Ogeemo is a decision followed by an action. Most items are intuitive, and you can always click an info icon (<Info className="inline h-4 w-4" />) or 3-dot menu (<MoreVertical className="inline h-4 w-4" />) for deeper orchestration.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
