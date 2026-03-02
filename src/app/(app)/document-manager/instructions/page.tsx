'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderSync, MoreVertical, Link as LinkIcon, Plus, Info, ShieldCheck, CheckCircle2, FileDigit, X } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

export default function DocumentManagerInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div className="w-1/4">
                    <Button asChild variant="outline">
                        <Link href="/document-manager">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Manager
                        </Link>
                    </Button>
                </div>
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        How to Use the Document Manager
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A guide to organizing your business foundation with the Ogeemo Dual-Mirror System.
                    </p>
                </div>
                <div className="w-1/4 flex justify-end">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/document-manager" aria-label="Close">
                            <X className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderSync className="h-6 w-6 text-primary" />
                            The Core Objective: End File Chaos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                            Google Drive is a powerful engine, but it’s easy for files to become a mess. Ogeemo acts as your <strong>Structural Layer</strong>. By maintaining a mirrored folder system, you ensure that every client file, contract, and image is always exactly where it belongs.
                        </p>
                        <p className="font-semibold">
                            The Ogeemo Method: We maintain a structural mirror in Ogeemo that points directly to your storage in GDrive.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Setup: The Mirroring Process</CardTitle>
                        <CardDescription>Follow these steps to build your foundation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full" defaultValue="step-1">
                            <AccordionItem value="step-1">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                                        <span className="font-semibold">Create Your GDrive Master Folder</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-9">
                                        <p>Go to your <a href="https://drive.google.com/drive/my-drive" target="_blank" className="text-primary underline">Google Drive</a>.</p>
                                        <ol>
                                            <li>Click <strong>(+ New)</strong> > <strong>New Folder</strong>.</li>
                                            <li>Name it <strong>"Ogeemo"</strong> and click Create.</li>
                                            <li>Open this folder so your path reads: <code>My Drive > Ogeemo</code>.</li>
                                        </ol>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="step-2">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                                        <span className="font-semibold">Mirror the Protected Folders</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-9">
                                        <p>Ogeemo has 13 "Protected" folders that cannot be deleted. You must create matching folders inside your GDrive "Ogeemo" folder:</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-4">
                                            {[
                                                "Clients", "Family", "Friends", "Miscellaneous", "Ogeemo Users", 
                                                "Prospects", "Suppliers", "Contract Workers", "Employee Workers", 
                                                "Images", "Marketing", "Ogeemo Notes", "Knowledge Base"
                                            ].map(f => (
                                                <div key={f} className="flex items-center gap-2 text-xs font-mono bg-muted p-1 rounded">
                                                    <CheckCircle2 className="h-3 w-3 text-primary" /> {f}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="step-3">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                                        <span className="font-semibold">Establish the Bridge (Linking)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-9">
                                        <p>Now, link each folder in Ogeemo to its mirror in GDrive:</p>
                                        <ol>
                                            <li><strong>In GDrive:</strong> Right-click a folder > <strong>Share</strong> > <strong>Copy Link</strong>.</li>
                                            <li><strong>In Ogeemo:</strong> Click the 3-dot menu <MoreVertical className="inline h-3 w-3"/> next to the matching folder.</li>
                                            <li>Select <strong>"Link Google Drive Folder"</strong> and paste the link.</li>
                                        </ol>
                                        <p className="text-xs italic text-muted-foreground mt-2">
                                            Tip: Once linked, a link icon <LinkIcon className="inline h-3 w-3 text-blue-500"/> will appear.
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="step-4" className="border-b-0">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</div>
                                        <span className="font-semibold">Executing Your Workflow</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-9">
                                        <p>You now have a high-fidelity workspace:</p>
                                        <ul>
                                            <li><strong>Quick Access:</strong> Click any folder in Ogeemo to see its contents or jump to the GDrive location.</li>
                                            <li><strong>File Linking:</strong> Link individual high-traffic files (like a specific spreadsheet) in the same way for even faster access.</li>
                                            <li><strong>New Files:</strong> Use the <strong>"New File"</strong> button in Ogeemo to create fresh Google Docs or Sheets—Ogeemo will handle the linking for you automatically.</li>
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-dashed border-primary/30">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                            <FileDigit className="h-4 w-4 text-primary" />
                            High-Fidelity Naming Protocol
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            To ensure your files are chronologically sorted and easily searchable across the Dual-Mirror System, always use the following naming convention when saving PDFs (including emails):
                        </p>
                        <div className="bg-white p-4 rounded-lg border font-mono text-sm shadow-inner">
                            <p className="text-primary font-bold">YYYYMMDD Client Name, Subject, Initial, v#</p>
                            <Separator className="my-2" />
                            <p className="text-muted-foreground italic">Example: "20260225 John Smith Subject line JS and v1"</p>
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            This protocol prevents "Assumptive Liability" and ensures your business data is always organized and easy to access.
                        </p>
                    </CardContent>
                </Card>

                <div className="bg-muted p-6 rounded-lg text-center border-2 border-dashed">
                    <p className="text-sm text-muted-foreground">
                        This Dual-Mirror System is your GDrive foundation. It protects you from file chaos and ensures your business data is always organized and easy to access.
                    </p>
                </div>
            </div>
        </div>
    );
}
