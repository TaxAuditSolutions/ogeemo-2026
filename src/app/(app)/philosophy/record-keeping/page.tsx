
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    BookOpen, 
    ShieldCheck, 
    Clock, 
    FileDigit, 
    Scale, 
    ArrowLeft, 
    CheckCircle2, 
    AlertTriangle,
    Network,
    FolderSync
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";

/**
 * @fileOverview The Ogeemo Credo: The Philosophy of Good Record Keeping.
 * This document defines the standards for audit-readiness and operational integrity.
 */
export default function RecordKeepingPhilosophyPage() {
  return (
    <div className="p-4 sm:p-6 space-y-8 flex flex-col items-center bg-muted/5 min-h-full">
      <header className="text-center space-y-4 max-w-3xl">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <Scale className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight uppercase">The Philosophy of Good Record Keeping</h1>
        <p className="text-xl text-muted-foreground leading-relaxed italic">
            "Moving from Assumptive Liability to the Black Box of Evidence."
        </p>
      </header>

      <div className="w-full max-w-4xl space-y-12 pb-20">
        
        {/* Core Credo Card */}
        <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b text-center py-10">
                <CardTitle className="text-3xl font-bold">The Ogeemo Mandate</CardTitle>
                <CardDescription className="text-lg">Records are the digital nervous system of your business.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-12 space-y-8">
                <div className="prose prose-lg dark:prose-invert max-w-none text-center">
                    <p>
                        In the Ogeemo World, record keeping is not an administrative chore—it is a <strong>strategic defense</strong>. 
                        Poor records lead to <em>Assumptive Liability</em>: a state where you are forced to guess about your past, leaving you vulnerable to auditors, legal disputes, and operational decay.
                    </p>
                </div>

                <div className="grid gap-10 pt-8">
                    {/* Pillar 1 */}
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-primary">1. The Auditor's Axiom</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>"If it is not documented with a primary source, it did not happen."</strong> Auditors are not your friends; they are revenue seekers. We build a "Black Box of Evidence" where every ledger entry is linked 1-to-1 with a digital source document (PDF). We don't record numbers; we record proof.
                            </p>
                        </div>
                    </div>

                    {/* Pillar 2 */}
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-primary">2. The Chronological Spine</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Time is the only dimension that doesn't lie.</strong> By using the <code>YYYYMMDD</code> naming protocol, we create an immutable chronological spine. This ensures that your "digital attic" remains a "digital library," where files sort themselves by default and ambiguity is eliminated.
                            </p>
                        </div>
                    </div>

                    {/* Pillar 3 */}
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <FolderSync className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-primary">3. The Dual-Mirror Integrity</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Structure belongs in Ogeemo; Mass Storage belongs in Google Drive.</strong> We maintain a high-fidelity mirror between the two. If a folder exists in GDrive, its node must exist in Ogeemo. This prevents "File Chaos" and ensures that every contract, invoice, and email is exactly where your business mind expects it to be.
                            </p>
                        </div>
                    </div>

                    {/* Pillar 4 */}
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <Network className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-primary">4. Radical Connectivity</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>An isolated record is a risk.</strong> In the "Spider Web" architecture, every piece of data is a connected node. An invoice must link to a time log; a time log must link to a project; a project must link to a contact. Connectivity provides the <em>context</em> that turns raw data into professional intelligence.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex flex-col items-center py-8 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Protect the Vision. Protect the Business.</p>
                <Button asChild variant="outline" size="lg">
                    <Link href="/accounting/audit-readiness">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Audit Readiness
                    </Link>
                </Button>
            </CardFooter>
        </Card>

        {/* Warning Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-destructive/5 border-destructive/20 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        The Cost of Guessing
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-destructive/80 space-y-3">
                    <p>When you wait until "Tax Season" to organize, you are already too late. Memories of business intent fade within weeks.</p>
                    <p>Without the Ogeemo Philosophy, you are operating in a state of <strong>Assumptive Liability</strong>, where the government can legally assume your business income is higher and your expenses are personal.</p>
                </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-green-700 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        The Benefit of Knowing
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-green-700/80 space-y-3">
                    <p>By recording transactions and linking documents <em>as they happen</em>, you build a defensible wall around your business.</p>
                    <p>Good record keeping reduces your <strong>Cognitive Load</strong>. When you know where everything is, your mind is free to focus on growth and innovation, rather than hunting for lost receipts.</p>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
