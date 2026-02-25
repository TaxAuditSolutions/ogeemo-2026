
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, Printer, Save, Info, Contact, Folder, Clock, FileDigit, Link as LinkIcon, Briefcase, X, FileText, CheckCircle2 } from 'lucide-react';
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
        title: "Open Gmail",
        description: "Open your Google Mail client and find the email or reply you wish to archive.",
        icon: Mail,
    },
    {
        step: 2,
        title: "Select Print",
        description: "Go to the 3-dot menu in the top right corner of the email and click 'Print'.",
        icon: Printer,
    },
    {
        step: 3,
        title: "Save as PDF",
        description: "In the print dialog, click 'Print' again and select 'Save as PDF' as the destination.",
        icon: FileText,
    },
    {
        step: 4,
        title: "Name & Archive",
        description: "Enter the file name using the protocol below and save it to the client's mirrored folder.",
        icon: Save,
    }
];

export default function EmailHubPage() {
    const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
                <header className="text-center relative w-full">
                    <div className="absolute top-0 right-0">
                        <Button asChild variant="ghost" size="icon">
                            <Link href="/action-manager">
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </Link>
                        </Button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-3xl font-bold font-headline text-primary">Email Hub</h1>
                        <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                            <Info className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                    <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                        Leverage Gmail's power while building a permanent, chronological archive in your Document Manager.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                     <Card className="flex flex-col items-center justify-center text-center p-6 border-primary/20 shadow-md">
                        <Mail className="h-10 w-10 text-primary mb-4"/>
                        <CardTitle>1. Open Gmail</CardTitle>
                        <CardDescription className="mt-2">Access your inbox to communicate with clients.</CardDescription>
                        <Button asChild className="mt-4 w-full">
                            <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer">Open Gmail <ArrowRight className="ml-2 h-4 w-4"/></a>
                        </Button>
                     </Card>
                     <Card className="flex flex-col items-center justify-center text-center p-6 border-primary/20 shadow-md">
                        <Folder className="h-10 w-10 text-primary mb-4"/>
                        <CardTitle>2. Open Mirror</CardTitle>
                        <CardDescription className="mt-2">View your client folders in the Document Manager.</CardDescription>
                        <Button asChild className="mt-4 w-full">
                            <Link href="/document-manager">Document Manager <ArrowRight className="ml-2 h-4 w-4"/></Link>
                        </Button>
                     </Card>
                      <Card className="flex flex-col items-center justify-center text-center p-6 border-primary/20 shadow-md bg-primary/5">
                        <Clock className="h-10 w-10 text-primary mb-4"/>
                        <CardTitle>3. Log Activity</CardTitle>
                        <CardDescription className="mt-2">Log billable time or schedule follow-up tasks.</CardDescription>
                        <Button asChild className="mt-4 w-full" variant="secondary">
                            <Link href="/email-hub/log-email">Schedule & Bill <ArrowRight className="ml-2 h-4 w-4"/></Link>
                        </Button>
                     </Card>
                </div>

                <Card className="w-full max-w-4xl border-2 border-primary/10">
                    <CardHeader>
                        <CardTitle className="text-center">The High-Fidelity Archival Method</CardTitle>
                        <CardDescription className="text-center">How to maintain a professional, chronological record of every client communication.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {workflowSteps.map((step) => (
                            <div key={step.step} className="flex flex-col items-center text-center">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                                    {step.step}
                                </div>
                                <step.icon className="h-6 w-6 text-primary mb-2" />
                                <h3 className="font-semibold text-sm">{step.title}</h3>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="w-full max-w-4xl bg-muted/30 border-dashed border-primary/30">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                            <FileDigit className="h-4 w-4" />
                            Audit-Ready Naming Protocol
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            When saving your PDF, use the following format to ensure files are sorted chronologically and are easily searchable:
                        </p>
                        <div className="bg-white p-4 rounded-lg border font-mono text-sm shadow-inner">
                            <p className="text-primary font-bold">YYYYMMDD Client Name, Subject, Initial, v#</p>
                            <Separator className="my-2" />
                            <p className="text-muted-foreground italic">Example: "20260225 John Smith Subject line JS and v1"</p>
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            This protocol prevents "Assumptive Liability" and keeps your folders perfectly organized.
                        </p>
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
                                <p className="text-sm text-muted-foreground">The PDF archive in your Document Manager builds a complete, chronological history of your communication.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Folder className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Document Manager</h4>
                                <p className="text-sm text-muted-foreground">Every archived PDF is saved into a dedicated folder for that contact, creating a single source of truth.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Briefcase className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Scheduling & Billing</h4>
                                <p className="text-sm text-muted-foreground">Use the "Schedule & Bill" tool to log time against email activity and create follow-up actions in the Command Centre.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <FileDigit className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Accounting Sync</h4>
                                <p className="text-sm text-muted-foreground">Time logged against an email becomes a billable entry, which can be automatically pulled into an invoice for that client.</p>
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
