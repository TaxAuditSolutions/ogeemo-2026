
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, ClipboardPaste, BookOpen, Save } from 'lucide-react';

const workflowSteps = [
    {
        step: 1,
        title: "From Your Email Client",
        description: "Open your primary email application (like Gmail, Outlook, etc.) and find the important client communication you want to save.",
        icon: Mail,
    },
    {
        step: 2,
        title: "Copy the Email Details",
        description: "Copy the content of the email, including the sender, subject, and body.",
        icon: ClipboardPaste,
    },
    {
        step: 3,
        title: "Log Communication in Ogeemo",
        description: "Return to Ogeemo and click the 'Log Communication' button below. This will take you to a dedicated form.",
        icon: BookOpen,
    },
    {
        step: 4,
        title: "Paste & Save",
        description: "Paste the email details into the structured fields. If the task if billable, click the log time & Schedule button, otherwise just click the save log button. Ogeemo will automatically update your files.",
        icon: Save,
    }
];

export function OgeeMailInboxView() {
    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">OgeeMail: Your Communication Hub</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    OgeeMail is your tool for creating a permanent, organized record of all important client communications within Ogeemo.
                </p>
            </header>

            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="text-center">The Core Concept</CardTitle>
                    <CardDescription>
                        Instead of being a full email client, OgeeMail now functions as a powerful logging system. It allows you to manually save important emails from any email provider directly into your Ogeemo workspace, linking them to specific contacts for perfect record-keeping.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="text-center">How It Works: A Simple Workflow</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {workflowSteps.map((step) => (
                        <div key={step.step} className="flex flex-col items-center text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl mb-4">
                                {step.step}
                            </div>
                            <step.icon className="h-8 w-8 text-primary mb-2" />
                            <h3 className="font-semibold">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="text-center">
                <Button asChild size="lg">
                    <Link href="/ogeemail/compose">
                        Log a Communication <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
