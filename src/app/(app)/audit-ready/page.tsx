
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { 
    ShieldCheck, 
    AlertTriangle, 
    FileCheck, 
    History, 
    Search, 
    Scale, 
    Ban, 
    Clock, 
    CheckCircle2,
    Info,
    ArrowRight,
    BookOpen
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

export default function AuditReadinessPage() {
  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-5xl mx-auto">
      <AccountingPageHeader pageTitle="Audit Readiness" />

      {/* Hero Section */}
      <section className="relative w-full py-16 md:py-20 overflow-hidden bg-slate-950 text-white rounded-3xl shadow-xl mt-4">
        <div className="container px-4 flex flex-col items-center text-center relative z-10">
          <Badge className="mb-6 bg-primary text-primary-foreground hover:bg-primary px-6 py-2 rounded-full uppercase tracking-widest text-xs font-bold border-transparent">
            Unmatched Compliance
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-headline tracking-tighter mb-8 max-w-4xl leading-tight text-white">
            Your Audit Shield. <br />
            <span className="text-primary">Defensible Books</span> by Design.
          </h1>

          <div className="w-full max-w-4xl mx-auto aspect-[21/9] mb-10 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-900 relative">
              <ImagePlaceholder id="audit-shield-banner" className="object-cover" />
          </div>

          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl leading-relaxed mx-auto italic font-medium">
            "Don't just keep books—build a fortress of evidence."
          </p>
        </div>
        <div className="absolute inset-0 bg-primary/5 opacity-50 mix-blend-overlay" />
      </section>
      
      <header className="text-center space-y-6 pt-12 border-t">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <ShieldCheck className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-4xl font-bold font-headline text-primary tracking-tight uppercase">Audit Readiness</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            "The power to audit is the power to destroy." – Expert perspective on maintaining a defensible business.
        </p>
      </header>

      <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="font-bold">The Auditor's Perspective</AlertTitle>
        <AlertDescription className="text-sm">
            An Auditor can assume all bank deposits could be <strong>income</strong> and any expenses may not be <strong>deductible</strong> unless they are obviously deductible, or your records show the proof. In the absence of a written business reason, auditors can and might assume any or all expenses are personal.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
          <Button asChild size="lg" className="h-14 px-10 text-lg font-bold shadow-xl border-b-4 border-black/20 active:mt-1 active:border-b-0">
              <Link href="/philosophy/record-keeping">
                  <BookOpen className="mr-2 h-5 w-5" /> Read the Philosophy of Good Record Keeping
              </Link>
          </Button>
      </div>

      <Card className="border-2 border-primary/10">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-2xl">What is "Audit Ready"?</CardTitle>
          <CardDescription>Firmly rooted in your legal obligations under the ITA and ETA.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed italic text-muted-foreground border-l-4 pl-4 border-primary/30">
                    "Audit readiness is not a seasonal event; it is a daily practice. Auditors are not your friend; they audit for the purpose of finding revenue."
                </p>
                <p>
                    While there is no single legal definition, the concept is derived from your obligation to maintain adequate books and records. Audits are costly in lost time, productivity, and potential fines. They can last for years and damage employee morale if an auditor is forced to take up space in your office.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider">
                        <Ban className="h-5 w-5" />
                        Avoid Net Worth Assessments
                    </div>
                    <p className="text-sm text-muted-foreground">In the absence of good records, the Agency can perform a Net Worth Assessment. You will owe the assessed amount unless you fight it via a Notice of Objection or in Tax Court.</p>
                </div>
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider">
                        <Scale className="h-5 w-5" />
                        The Risk Management Choice
                    </div>
                    <p className="text-sm text-muted-foreground">You must decide your single "Source of Truth": paper or digital. BKS is designed for businesses that choose digital records as an audit defense.</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col">
              <CardHeader>
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Reconciled Accounts</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                      Monthly reconciliation of all bank and credit card accounts (including personal ones used for business) ensures your ledger matches reality.
                  </p>
              </CardContent>
          </Card>
          <Card className="flex flex-col">
              <CardHeader>
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Complete Evidence</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                      A digital "paper trail" for every transaction—invoices, receipts, contracts, and approvals—organized for instant retrieval.
                  </p>
              </CardContent>
          </Card>
          <Card className="flex flex-col">
              <CardHeader>
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Current Financials</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                      Regular maintenance of balance sheets and income statements, categorized by CRA line numbers, eliminates year-end scrambling.
                  </p>
              </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>The Auditor's Checklist</CardTitle>
            <CardDescription>Commonly requested documents and areas of investigation.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h4 className="font-bold flex items-center gap-2"><Search className="h-4 w-4 text-primary"/> Areas of Focus</h4>
                <ul className="space-y-3 text-sm">
                    <li className="flex gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span><strong>Income Verification:</strong> Comparing bank deposits against invoices and sales records.</span>
                    </li>
                    <li className="flex gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span><strong>Personal vs. Business:</strong> Scrutinizing non-deductible expenses like food, personal travel, or personal vehicle use.</span>
                    </li>
                    <li className="flex gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span><strong>Cash Integrity:</strong> Ensuring cash transactions align with industry norms.</span>
                    </li>
                    <li className="flex gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span><strong>Detailed Logs:</strong> Reviewing travel vehicle logbooks and detailed payroll records.</span>
                    </li>
                </ul>
            </div>
            <div className="space-y-4">
                <h4 className="font-bold flex items-center gap-2"><FileCheck className="h-4 w-4 text-primary"/> Requested Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                    <div className="p-2 border rounded bg-muted/20">Bank Statements</div>
                    <div className="p-2 border rounded bg-muted/20">General Ledgers</div>
                    <div className="p-2 border rounded bg-muted/20">Invoices & Receipts</div>
                    <div className="p-2 border rounded bg-muted/20">Credit Card Statements</div>
                    <div className="p-2 border rounded bg-muted/20">Mortgage Docs</div>
                    <div className="p-2 border rounded bg-muted/20">Vehicle Logbooks</div>
                </div>
            </div>
        </CardContent>
      </Card>

      <footer className="bg-primary/5 p-8 rounded-xl border border-dashed border-primary/30 text-center space-y-4">
          <div className="flex justify-center">
              <Info className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold font-headline text-primary">Tips for Success</h3>
          <div className="max-w-2xl mx-auto space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                  <strong>Be Organized:</strong> Present clean, organized records. Daily transactions must be handled as they happen. Memories fade, facts are forgotten, and the mess grows—leading to painful audits.
              </p>
              <p>
                  <strong>Respond Promptly:</strong> The Tax Man sets deadlines; failing to meet them can lead to a discretionary assessment.
              </p>
              <p>
                  <strong>Provide Clarification:</strong> Record written explanations in the BKS ledger now so you aren't guessing during an audit years later.
              </p>
          </div>
          <div className="pt-4">
              <Button asChild size="lg">
                  <Link href="/accounting/ledgers">Go to BKS Ledger <History className="ml-2 h-4 w-4"/></Link>
              </Button>
          </div>
      </footer>
    </div>
  );
}
