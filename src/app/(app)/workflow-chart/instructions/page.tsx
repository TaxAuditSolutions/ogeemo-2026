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
import { ArrowLeft, Pencil, WandSparkles, Save, FolderOpen } from "lucide-react";

export default function WorkflowChartInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        How to Use the AI Workflow Chart Generator
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A guide to turning your ideas into visual diagrams.
                    </p>
                </div>
                <div className="flex-1 flex justify-end">
                    <Button asChild variant="outline">
                        <Link href="/workflow-chart">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Generator
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
                                    <Pencil className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 1: Describe Your Process</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        In the middle panel labeled "Describe Your Process", write a plain-text description of the workflow you want to visualize. Be as clear and sequential as possible. The AI is good at understanding steps and decisions.
                                    </p>
                                    <p><strong>Example:</strong></p>
                                    <pre className="bg-muted p-2 rounded-md"><code>A user submits a form. The system checks if the data is valid. If it's valid, the data is saved to the database. If it's not valid, an error message is shown to the user.</code></pre>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <WandSparkles className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 2: Generate the Chart</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Once you're happy with your description, click the <strong>"Generate Chart"</strong> button. The AI will analyze your text and create the corresponding Mermaid flowchart syntax. The visual diagram will automatically appear in the "Live Preview" panel on the right.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Save className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 3: Save Your Work</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>
                                      To save your work, click the <strong>"Save Chart"</strong> button. A dialog will appear asking you to name your chart. Once saved, it will be stored in your File Manager within the "Flow Charts" folder.
                                   </p>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <FolderOpen className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 4: Load & Manage Charts</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Your saved charts appear in the "Saved Charts" panel on the left.
                                    </p>
                                     <ul>
                                        <li>Click on any chart to load its description into the editor and view the diagram.</li>
                                        <li>Click <strong>"New Chart"</strong> to clear the editor and start fresh.</li>
                                        <li>Hover over a chart and click the trash icon to delete it.</li>
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
