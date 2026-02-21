'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    ShieldCheck, 
    AlertTriangle, 
    CheckCircle2, 
    FileCheck, 
    History, 
    Search,
    ArrowRight,
    Ban,
    Scale
} from 'lucide-react';

export default function AuditReadyLandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden bg-slate-950 text-white">
          <div className="container px-4 flex flex-col items-center text-center relative z-10">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Unmatched Compliance
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tighter mb-6 max-w-4xl leading-tight">
              Your Audit Shield. <br />
              <span className="text-primary">Defensible Books</span> by Design.
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
              "The power to audit is the power to destroy." Don't just keep books—build a fortress of evidence with Bookkeeping Kept Simple (BKS) and The Ogeemo Method.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button asChild size="lg" className="h-12 px-8 text-lg font-bold">
                <Link href="/register">Protect Your Business Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg bg-transparent border-white text-white hover:bg-white hover:text-black">
                <Link href="/contact">Speak with an Expert</Link>
              </Button>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/shield/1920/1080')] opacity-10 grayscale mix-blend-overlay" />
        </section>

        {/* The Stark Reality Section */}
        <section className="py-24 bg-white">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900">The Auditor's Assumption</h2>
                    <p className="text-xl text-muted-foreground italic">"Guilty until proven compliant."</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-l-4 border-l-destructive bg-destructive/5 shadow-none">
                        <CardHeader>
                            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                            <CardTitle className="text-xl">The Revenue Trap</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 leading-relaxed">
                                An Auditor can assume all bank deposits are <strong>taxable income</strong> and any expenses are <strong>non-deductible personal costs</strong> unless your records provide absolute proof to the contrary.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 bg-amber-50 shadow-none">
                        <CardHeader>
                            <Ban className="h-8 w-8 text-amber-600 mb-2" />
                            <CardTitle className="text-xl">Net Worth Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 leading-relaxed">
                                In the absence of a structured digital ledger, the Tax Man can perform a "Net Worth Assessment." You will owe whatever they assess unless you fight it in Tax Court.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
          </div>
        </section>

        {/* The BKS Solution Section */}
        <section className="py-24 bg-slate-50 border-y">
          <div className="container px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                    <h2 className="text-4xl font-bold font-headline text-primary">The BKS Advantage</h2>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        Bookkeeping Kept Simple (BKS) isn't just about recording numbers; it's about building a <strong>Black Box of Evidence</strong>.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0 border">
                            <FileCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">One-to-One Digital Linking</h4>
                            <p className="text-slate-600">Stop the "shoebox" nightmare. BKS links every digital ledger entry directly to its source document (PDF) for instant retrieval during an audit.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0 border">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Daily Compliance Rituals</h4>
                            <p className="text-slate-600">The Ogeemo Method (TOM) ensures compliance is a daily practice, not a year-end panic. Reconciled accounts match reality 365 days a year.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0 border">
                            <Scale className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">CRA Line Native</h4>
                            <p className="text-slate-600">Every category in BKS is pre-mapped to official CRA line numbers, providing a professional and transparent framework that auditors respect.</p>
                        </div>
                    </div>
                </div>
              </div>
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-white">
                  <ImagePlaceholder id="pitch-architecture" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid for Audit Readiness */}
        <section className="py-24 container px-4">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900">Professional Verification</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">Build a defensible business with these core BKS features.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="p-8 space-y-4 hover:shadow-lg transition-shadow">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                    <h3 className="font-bold text-xl">Verification of Income</h3>
                    <p className="text-sm text-slate-600">Cross-reference every bank deposit against issued invoices and sales logs automatically. Eliminate unrecorded revenue risks.</p>
                </Card>
                <Card className="p-8 space-y-4 hover:shadow-lg transition-shadow">
                    <Search className="h-10 w-10 text-primary" />
                    <h3 className="font-bold text-xl">Expense Substantiation</h3>
                    <p className="text-sm text-slate-600">Every business deduction requires a written reason. Ogeemo forces clarification at the point of entry, preventing years-later guessing.</p>
                </Card>
                <Card className="p-8 space-y-4 hover:shadow-lg transition-shadow">
                    <Ban className="h-10 w-10 text-primary" />
                    <h3 className="font-bold text-xl">Personal Cost Isolation</h3>
                    <p className="text-sm text-slate-600">Clearly tag and isolate personal vs. business expenses. Show the auditor you have a robust internal control system in place.</p>
                </Card>
            </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container px-4 space-y-8">
            <div className="mx-auto bg-white/20 p-4 rounded-full w-fit">
                <ShieldCheck className="h-12 w-12" />
            </div>
            <h2 className="text-3xl md:text-6xl font-bold font-headline leading-tight">Sleep better at night. <br /> Be Audit Ready.</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Auditors are not your friend—but Ogeemo is. Start building your defensive digital paper trail today.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold">
                <Link href="/register">Get Started Free for 30 Days</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
