'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Move, Trash2, Save, WandSparkles } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from '@/components/layout/section-header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ManageDashboardInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <SectionHeader
                parent={{ label: 'Customize My Shortcuts', href: '/action-manager/manage' }}
                title="How to Manage Your Dashboard"
                description="A guide to customizing your shortcuts for a personalized workflow."
            />

            <Card className="max-w-4xl mx-auto">
                <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Plus className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Adding Shortcuts</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        To add a shortcut to your main dashboard, simply find it in the <strong>"Available Shortcuts"</strong> panel and drag it up to the <strong>"My Shortcuts"</strong> panel. It will be added to the end of your current list.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Move className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Reordering Shortcuts</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        To change the order of your shortcuts, click and drag any shortcut within the <strong>"My Shortcuts"</strong> panel. Move it to your desired position and release.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Trash2 className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Removing & Trashing</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        <strong>To remove a shortcut</strong> from your dashboard without deleting it, drag it from "My Shortcuts" down to "Available Shortcuts".
                                        <br/><br/>
                                        <strong>To permanently delete a shortcut</strong>, you can either drag it from any panel down to the <strong>"Drag here to trash"</strong> zone, or click the 3-dot menu on a shortcut and select "Delete".
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Save className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Saving Your Changes</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Your changes to the layout are not saved automatically. Once you are happy with the order of your shortcuts in the <strong>"My Shortcuts"</strong> panel, click the <strong>"Save Changes"</strong> button to make your new layout permanent.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-5" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <WandSparkles className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Creating New Shortcuts</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Click the <strong>"+ Create Shortcut"</strong> button to create a custom shortcut. You can give it a label and link it to any page within Ogeemo or an external website URL. Once created, it will appear in the "Available Shortcuts" panel, ready to be added to your dashboard.
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
