'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    CheckCircle2, 
    Zap, 
    ShieldCheck, 
    ArrowRight, 
    Activity, 
    Clock, 
    DollarSign,
    Scale,
    TrendingUp,
    Ban
} from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-slate-50 border-b">
          <div className="container px-4 text-center max-w-4xl mx-auto space-y-6">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Fair & Transparent
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-headline text-slate-900 tracking-tighter leading-tight">
              Pay for Results, <br />
              <span className="text-primary">Not for Shelfware.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We believe you shouldn't pay for tools you aren't using. Our "Business-Sync" model aligns your costs directly with your operational activity.
            </p>
            <div className="pt-4">
                <Button asChild size="lg" className="h-14 px-10 text-xl font-bold">
                    <Link href="/register">Start 30-Day Free Trial</Link>
                </Button>
            </div>
          </div>
        </section>

        {/* The Two-Pillar Formula */}
        <section className="py-24 bg-white">
          <div className="container px-4">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold font-headline">The Ogeemo Formula</h2>
                <p className="text-muted-foreground text-lg">Predictable foundation + Transactional precision.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                {/* Pillar 1: Base Membership */}
                <Card className="relative overflow-hidden border-2">
                    <CardHeader className="bg-slate-50 border-b pb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl">Base Membership</CardTitle>
                        <CardDescription>Secure Cloud Orchestration</CardDescription>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold">$15</span>
                            <span className="text-muted-foreground">/month</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-4">
                        <ul className="space-y-3">
                            {[
                                "Encrypted Master Mind Database",
                                "AI Dispatch Terminal Access",
                                "Native Google Workspace Integration",
                                "BKS Ledger Management",
                                "Daily Automated Backups",
                                "Unlimited Contact Records"
                            ].map((item) => (
                                <li key={item} className="flex gap-3 text-sm">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Pillar 2: Pay-As-You-Go */}
                <Card className="relative overflow-hidden border-2 border-primary">
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                        Business Sync
                    </div>
                    <CardHeader className="bg-primary/5 border-b pb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                            <Activity className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl">Usage Formula</CardTitle>
                        <CardDescription>Transactional Precision</CardDescription>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-primary">Dynamic</span>
                            <span className="text-muted-foreground">/activity</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50">
                                <span className="font-semibold text-sm">Invoice Finalized</span>
                                <span className="font-mono font-bold text-primary">$0.50</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50">
                                <span className="font-semibold text-sm">Payroll Run (per employee)</span>
                                <span className="font-mono font-bold text-primary">$1.00</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50">
                                <span className="font-semibold text-sm">Project Archived (Closing a goal)</span>
                                <span className="font-mono font-bold text-primary">$5.00</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50">
                                <span className="font-semibold text-sm">AI Dispatch (Above 100 cmd/mo)</span>
                                <span className="font-mono font-bold text-primary">$0.10</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            * Basic navigation, time logging, and ledger entries are always included in your base membership.
                        </p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

        {/* Why this works Section */}
        <section className="py-24 bg-slate-900 text-white">
            <div className="container px-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h2 className="text-4xl font-bold font-headline leading-tight">No Financial Penalty for Rest.</h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Most SaaS companies want you to pay for "seats" or "tiers" that you rarely fully utilize. Ogeemo is different. 
                        </p>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            If you take a month-long vacation, your usage fees drop to zero. You only maintain the base membership to keep your data secure and orchestrated. When you land a major contract and start sending 50 invoices a week, Ogeemo scales with you instantly.
                        </p>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <Ban className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium">No arbitrary tier jumps ($49 to $199).</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium">Scaling costs that mirror scaling revenue.</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
                        <h3 className="text-2xl font-bold font-headline text-primary">Simulation: Small Agency</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">Base Membership</span>
                                <span className="font-mono">$15.00</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">12 Invoices Generated</span>
                                <span className="font-mono">$6.00</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">2 Payroll Runs (3 employees)</span>
                                <span className="font-mono">$6.00</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">1 Project Completed</span>
                                <span className="font-mono">$5.00</span>
                            </div>
                            <div className="flex justify-between pt-4 text-xl font-bold text-primary">
                                <span>Total Monthly Bill</span>
                                <span className="font-mono">$32.00</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 italic text-center">
                            Compare this to traditional stacks costing $150+/mo.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQs */}
        <section className="py-24 bg-white">
            <div className="container px-4 max-w-3xl mx-auto space-y-12">
                <h2 className="text-3xl font-bold font-headline text-center">Frequently Asked Questions</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg">Is there a contract?</h4>
                        <p className="text-muted-foreground">No. Ogeemo is month-to-month. You can cancel your membership at any time without penalty.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg">How is usage tracked?</h4>
                        <p className="text-muted-foreground">Usage is calculated based on system triggers (e.g., clicking "Finalize Invoice"). You can view your real-time usage metrics in your Settings at any time.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg">What happens during my 30-day trial?</h4>
                        <p className="text-muted-foreground">Your first 30 days are completely free, including the base membership and all usage. No credit card is required to begin.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary text-primary-foreground text-center">
          <div className="container px-4 space-y-8">
            <h2 className="text-3xl md:text-6xl font-bold font-headline leading-tight">Stop overpaying for software.</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Join the platform that aligns with your business reality.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold">
                <Link href="/register">Start Your Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
