
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { ShieldCheck, FileCheck, Search, Database } from "lucide-react";

export default function AuditReadinessPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Audit Readiness" />
      
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <ShieldCheck className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Audit Readiness</h1>
        <p className="text-xl text-muted-foreground">
            Maintaining a "Black Box of Evidence" for your business.
        </p>
      </header>

      <Card className="max-w-4xl mx-auto border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle>What does it mean to be Audit Ready?</CardTitle>
          <CardDescription>Understanding the Ogeemo standard for financial compliance.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed italic text-muted-foreground border-l-4 pl-4 border-primary/30">
                    [Placeholder: Draft Text Coming Soon]
                </p>
                <p>
                    Audit readiness is not a seasonal event; it is a daily practice. Ogeemo's BKS (Bookkeeping Kept Simple) system is engineered to ensure that every dollar moving through your business is accounted for and backed by verifiable digital evidence.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-bold">Source Documentation</h4>
                    <p className="text-sm text-muted-foreground">Every ledger entry is linked directly to a source document (invoice, receipt, or contract).</p>
                </div>
                <div className="space-y-3">
                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-bold">CRA Alignment</h4>
                    <p className="text-sm text-muted-foreground">Transactions are categorized using official CRA line numbers for seamless year-end reporting.</p>
                </div>
                <div className="space-y-3">
                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                        <Search className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-bold">Searchable History</h4>
                    <p className="text-sm text-muted-foreground">Retrieve any historical record or communication node across the "Spider Web" instantly.</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle className="text-lg">BKS Verification</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">
                      Use the BKS Ledger to verify that all bank imports match your internal records. Unreconciled items are flagged immediately to prevent administrative leakage.
                  </p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle className="text-lg">The Ogeemo Method (TOM)</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">
                      TOM teaches you to build a business that is defensible by default. By following our protocols, you're always prepared for oversight.
                  </p>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
