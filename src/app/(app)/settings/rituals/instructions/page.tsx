
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BrainCircuit, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function RitualsInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div />
                <div className="text-center">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        About Planning Rituals
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A guide to establishing powerful routines for focus and clarity.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/settings/rituals">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Rituals
                    </Link>
                </Button>
            </header>

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                        The Power of Routine
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                           The Planning Rituals feature is designed to help you carve out dedicated time for high-level thinking and organization. By consistently making time for these sessions, you can reduce stress, increase focus, and ensure you're always working on what matters most.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Daily Wind-down & Plan</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        This is a short, 15-30 minute session at the end of your workday. The goal is to close open loops and prepare for a successful tomorrow.
                                    </p>
                                    <ul>
                                        <li><strong>Clear Inboxes:</strong> Process any remaining items in your email and task inboxes.</li>
                                        <li><strong>Review Today:</strong> Briefly look over what you accomplished.</li>
                                        <li><strong>Plan Tomorrow:</strong> Identify your top 1-3 priorities for the next day.</li>
                                        <li><strong>Shutdown Complete:</strong> End your day with a clear mind, knowing you're prepared for what's next.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Weekly Strategic Review</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                       This is a longer, 90-minute session typically held at the end of the week (e.g., Friday afternoon). It's your chance to zoom out from the daily grind and look at the bigger picture.
                                    </p>
                                    <ul>
                                        <li><strong>Review Goals:</strong> Are you on track with your quarterly and annual objectives?</li>
                                        <li><strong>Review Projects:</strong> Check the status of all active projects. What needs your attention?</li>
                                        <li><strong>Plan the Upcoming Week:</strong> Block out time for important tasks and meetings for the week ahead.</li>
                                        <li><strong>Clear Your Mind:</strong> Offload any new ideas or tasks that have accumulated into your system.</li>
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
