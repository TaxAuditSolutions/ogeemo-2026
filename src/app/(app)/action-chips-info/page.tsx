
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Zap, 
    ArrowRight, 
    LayoutDashboard, 
    MousePointerClick, 
    GripVertical, 
    Trash2, 
    Plus, 
    Save, 
    Info,
    CheckCircle2,
    Layers,
    BrainCircuit,
    X
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ImagePlaceholder } from '@/components/ui/image-placeholder';

export default function ActionChipsInfoPage() {
  return (
    <div className="p-4 sm:p-6 space-y-8 flex flex-col items-center bg-muted/10 min-h-full">
      <header className="text-center space-y-4 max-w-3xl relative w-full">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <Zap className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">The Magic of Action Chips</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
            The Ogeemo Action Chip is more than a button—it is the control node for your <strong>Spider Web</strong> of operations.
        </p>
        <div className="absolute top-0 right-0">
            <Button asChild variant="ghost" size="icon">
                <Link href="/action-manager">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </Link>
            </Button>
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Why they matter */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-primary/10">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-2xl">Why Action Chips Matter</CardTitle>
                    <CardDescription>Moving from "App-Juggling" to Business Orchestration.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-lg leading-relaxed">
                            Traditional software treats features as isolated silos. In Ogeemo, every tool is a node on your digital nervous system. Action Chips allow you to <strong>sculpt</strong> this system to match your exact business mind.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <Layers className="h-5 w-5" />
                                Eliminate Digital Noise
                            </div>
                            <p className="text-sm text-muted-foreground">Most businesses use only 20% of their software's features. Action Chips let you turn off the other 80%, creating a zero-clutter workspace focused on execution.</p>
                        </div>
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <BrainCircuit className="h-5 w-5" />
                                Reduce Cognitive Load
                            </div>
                            <p className="text-sm text-muted-foreground">Stop hunting through deep menus. Your curated Action Chips follow you in the sidebar 'Command Strip', allowing for instant context pivots.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>How to Manage Your Chips</CardTitle>
                    <CardDescription>A simple drag-and-drop workflow to customize your hub.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Plus className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 1: Adding Actions</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>Go to the <strong>Action Manager Settings</strong>. You will see two panels:</p>
                                    <ul>
                                        <li><strong>Available Actions:</strong> A library of every Ogeemo module and your custom links.</li>
                                        <li><strong>Selected Actions:</strong> The items currently active on your dashboard and sidebar.</li>
                                    </ul>
                                    <p>Simply drag an item from "Available" to "Selected" to add it to your command set.</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 2: Reordering for Flow</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>The order of chips in your <strong>Selected Actions</strong> panel determines their order on your main dashboard and in your sidebar "Favorites" menu.</p>
                                    <p>Drag chips up and down to prioritize the tools you use most frequently. High-fidelity orchestration starts with your most critical nodes at the top.</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Trash2 className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 3: Trashing & Removing</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>If a tool is no longer relevant to your current project or phase of business, drag it from "Selected" back to "Available" to hide it.</p>
                                    <p>To permanently delete a custom link you've created, drag it down to the <strong>Trash Zone</strong> at the bottom of the page.</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Save className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 4: Persistence (Save Order)</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>Your workspace is unique. To ensure your custom layout is remembered the next time you log in, always click the <strong>"Save Order"</strong> button after making changes.</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar Graphics/CTA */}
        <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground shadow-xl overflow-hidden border-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MousePointerClick className="h-5 w-5" />
                        Take Control
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm opacity-90">Ready to sculpt your Ogeemo workspace? Jump directly into the manager and start orchestrating your custom command set.</p>
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-white/20 shadow-inner">
                        <ImagePlaceholder id="action-chips-spider-web" className="object-cover" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="secondary" className="w-full font-bold">
                        <Link href="/action-manager/manage">
                            Manage My Chips Now <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>

            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Master Tip
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Use the <strong>"Groups"</strong> view in the sidebar to see everything Ogeemo has to offer, then use the <strong>"Action Manager"</strong> to build your perfect, high-speed <strong>"Favorites"</strong> list. This is the secret to true "Spider Web" efficiency.
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
