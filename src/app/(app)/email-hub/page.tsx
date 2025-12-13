'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, ClipboardPaste, BookOpen, Save, Info, Contact, Folder, Clock, FileDigit, Link as LinkIcon, Briefcase } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
        description: "Return to Ogeemo and click the 'Log an Email' button below. This will take you to a dedicated form.",
        icon: BookOpen,
    },
    {
        step: 4,
        title: "Paste & Save",
        description: "Paste the email details into the structured fields. This creates a permanent, searchable record in your Document Manager, linked to the correct contact.",
        icon: Save,
    }
];

export default function EmailHubPage() {
    const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
                <header className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-3xl font-bold font-headline text-primary">Email Hub</h1>
                        <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                            <Info className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                    <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                        Your tool for creating a permanent, organized record of important client communications within Ogeemo.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                     <Card className="flex flex-col items-center justify-center text-center p-6">
                        <Mail className="h-10 w-10 text-primary mb-4"/>
                        <CardTitle>Open Google Mail</CardTitle>
                        <CardDescription className="mt-2">Go to your Gmail inbox to read and send emails.</CardDescription>
                        <Button asChild className="mt-4 w-full">
                            <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer">Open Gmail <ArrowRight className="ml-2 h-4 w-4"/></a>
                        </Button>
                     </Card>
                     <Card className="flex flex-col items-center justify-center text-center p-6">
                        <Folder className="h-10 w-10 text-primary mb-4"/>
                        <CardTitle>Open Google Drive</CardTitle>
                        <CardDescription className="mt-2">Access your cloud storage for documents and attachments.</CardDescription>
                        <Button asChild className="mt-4 w-full">
                            <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">Open Drive <ArrowRight className="ml-2 h-4 w-4"/></a>
                        </Button>
                     </Card>
                      <Card className="flex flex-col items-center justify-center text-center p-6">
                        <LinkIcon className="h-10 w-10 text-primary mb-4"/>
                        <CardTitle>Log an Email</CardTitle>
                        <CardDescription className="mt-2">Save a copy of an important email to a contact's record.</CardDescription>
                        <Button asChild className="mt-4 w-full">
                            <Link href="/email-hub/log-email">Log an Email <ArrowRight className="ml-2 h-4 w-4"/></Link>
                        </Button>
                     </Card>
                </div>

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

            </div>

            <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>How the Email Hub Integrates with Ogeemo</DialogTitle>
                        <DialogDescription>
                            The Email Hub is the bridge between your external communications and your internal workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-start gap-4">
                            <Contact className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Contact History</h4>
                                <p className="text-sm text-muted-foreground">Each logged email is tied to a specific contact, building a complete, chronological history of your communication with them.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Folder className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Document Manager</h4>
                                <p className="text-sm text-muted-foreground">Every log is saved as a permanent file, automatically organized into a dedicated folder for that contact, creating a single source of truth.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Briefcase className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Task & Project Management</h4>
                                <p className="text-sm text-muted-foreground">Use the "Log Time & Schedule" button from a logged email to instantly send its details to the Task & Event Manager, pre-filling the form to create tasks or calendar events linked to the correct client and project.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <FileDigit className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Accounting</h4>
                                <p className="text-sm text-muted-foreground">Time logged against an email becomes a billable entry, which can be automatically pulled into an invoice for that client, ensuring you get paid for all your work.</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
