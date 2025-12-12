
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, ListChecks, Inbox, Route } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ProjectInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="grid grid-cols-3 items-center">
                <div className="flex justify-start">
                    {/* Spacer */}
                </div>
                <div className="text-center col-span-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        How to Use Project Management
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A guide to organizing and tracking your work in Ogeemo.
                    </p>
                </div>
                <div className="flex justify-end">
                    <Button asChild variant="outline">
                        <Link href="/projects">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Project Manager
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
                                    <Briefcase className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Project Manager (Main View)</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        This is your high-level dashboard for all projects.
                                    </p>
                                    <ul>
                                        <li><strong>View All Projects:</strong> See a comprehensive list of every project you're working on.</li>
                                        <li><strong>Create New Projects:</strong> Use the "+ New Project" button to start a new initiative.</li>
                                        <li><strong>Quick Edits:</strong> Click on any project in the list to open its details and edit its name, client, or status.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <ListChecks className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Status Board</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        The Status Board gives you a birds-eye view of where every project stands.
                                    </p>
                                    <ul>
                                        <li><strong>Visualize Workflow:</strong> Projects are organized into columns like "In Planning," "Active," "On-Hold," and "Completed."</li>
                                        <li><strong>Drag & Drop:</strong> Easily update a project's status by dragging its card from one column to another.</li>
                                        <li><strong>Assess Workload:</strong> Quickly see how many projects are active versus on-hold to manage your focus.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Route className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Project Task Board & Organizer</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Each project has its own dedicated workspace for managing the details.
                                    </p>
                                    <ul>
                                        <li><strong>Task Board:</strong> From the Project Manager list, click a project to go to its Task Board. This is a Kanban-style board where you can manage individual tasks through "To Do," "In Progress," and "Done" columns.</li>
                                        <li><strong>Project Organizer:</strong> Use the Organizer to break down a large project into smaller, manageable steps. You can define each step, estimate time, and then automatically schedule those steps on your calendar.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Inbox className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Action Items (Inbox)</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      The "Action Items" page is your universal inbox for tasks that haven't been assigned to a specific project yet. It's the perfect place to quickly capture a to-do item without breaking your flow. You can later move these tasks to the appropriate project board when you're ready to organize them.
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
