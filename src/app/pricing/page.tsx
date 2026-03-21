'use client';

import { useState } from 'react';
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    CheckCircle2, 
    AlertCircle, 
    Check, 
    Zap, 
    Users, 
    Vote, 
    Unlock, 
    Gift, 
    Scale,
    XCircle,
    User,
    Users2,
    ShieldCheck
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { cn } from '@/lib/utils';

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1 text-black">
        {/* The Member's Manifesto Hero */}
        <section className="py-20 md:py-32 bg-slate-950 text-white border-b border-white/10 relative overflow-hidden">
          <div className="container px-4 text-center max-w-4xl mx-auto space-y-8 relative z-10">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              The Ogeemo Member's Manifesto
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter leading-tight text-white">
              Software built for us, <br />
              <span className="text-primary">not for Wall Street.</span>
            </h1>
            
            <div className="prose prose-invert max-w-2xl mx-auto text-slate-300 text-lg leading-relaxed text-center space-y-6">
                <p>
                    We built Ogeemo because we’re tired. Tired of "introductory rates" that double after six months. Tired of being "upsold" on features we actually need. And frankly, we’re tired of being treated like a data point for a billion-dollar corporation.
                </p>
                <p className="text-white font-bold text-2xl italic font-headline">
                    "Accounting shouldn’t be a hostage situation."
                </p>
                <p>
                    At Ogeemo, we don't hold your growth hostage. We believe that to be a member of this collective, you deserve the absolute full power of our engine from day one. No feature paywalls. Ever.
                </p>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="h-14 px-10 text-xl font-bold shadow-xl">
                    <Link href="/register">Join the Community</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-10 text-xl border-white/20 hover:bg-white/10 text-white">
                    <Link href="#ethics-comparison">Compare Our Ethics</Link>
                </Button>
            </div>
          </div>
          
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <ImagePlaceholder id="pitch-strategy" className="object-cover" />
          </div>
        </section>

        {/* Founder's Circle Urgent Offer */}
        <section className="bg-primary py-4">
            <div className="container px-4 text-center">
                <p className="text-primary-foreground font-bold text-sm uppercase tracking-[0.2em]">
                    🚀 Founder's Circle: The first 500 members get Ogeemo for <span className="underline">$99/year for life</span>.
                </p>
            </div>
        </section>

        {/* Unified Membership Pillars */}
        <section className="py-24 bg-slate-50 border-y text-black">
          <div className="container px-4">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900">One Membership. The Full Ogeemo.</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto italic">
                    "We don't gate features. We scale with your success."
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Individual Membership */}
                <Card className="relative overflow-hidden border-2 bg-white flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="bg-slate-50 border-b pb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                            <User className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-headline">Solo Membership</CardTitle>
                        <CardDescription>Full Power for Solopreneurs & Freelancers</CardDescription>
                        <div className="mt-4 flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900">$15</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-xs text-primary font-bold mt-2">
                                Includes The Full Ogeemo Suite.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-4 flex-1">
                        <ul className="space-y-3">
                            {[
                                "The Full BKS Ledger & Audit Shield",
                                "Professional Invoicing & Accounts Payable",
                                "Integrated Payroll & Tax Remittances",
                                "AI Dispatch Terminal & Global Search",
                                "GDrive Dual-Mirror Document Manager",
                                "Project Forge & Live Time Mastery",
                                "Entry into the Ogeemo Collective",
                                "Vote on the Community Roadmap"
                            ].map((item) => (
                                <li key={item} className="flex gap-3 text-sm">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-6">
                        <Button asChild variant="outline" className="w-full font-bold">
                            <Link href="/register">Start Solo</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Team Membership */}
                <Card className="relative overflow-hidden border-2 border-primary shadow-xl bg-white flex flex-col scale-105 z-10">
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                        Collaborative Growth
                    </div>
                    <CardHeader className="bg-primary/5 border-b pb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                            <Users2 className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-headline">Team Membership</CardTitle>
                        <CardDescription>Total Orchestration for Growing Teams</CardDescription>
                        <div className="mt-4 flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-primary">$30</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-xs text-primary font-bold mt-2">
                                The Full Ogeemo + Team Architecture.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-4 flex-1">
                        <ul className="space-y-3">
                            {[
                                "Includes All Solo Member Features",
                                "Up to Ten Team User Seats",
                                "Managed Authority Levels (Admin/Editor)",
                                "Team-Wide Project Synchronization",
                                "Staff & Sub-Contractor Management",
                                "Bulk Payroll Processing for Teams",
                                "Priority Community Support Access",
                                "Shared High-Fidelity Knowledge Base"
                            ].map((item) => (
                                <li key={item} className="flex gap-3 text-sm">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    <span className="font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="bg-primary/5 border-t p-6">
                        <Button asChild className="w-full font-bold h-12 text-lg shadow-lg">
                            <Link href="/register">Scale My Team</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </div>
        </section>

        {/* Feature & Value Comparison Matrix */}
        <section className="py-24 bg-white text-black">
            <div className="container px-4 max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Badge variant="outline" className="border-primary text-primary">Competitive Logic</Badge>
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900 uppercase tracking-tight">The Feature Parity Gap</h2>
                    <p className="text-muted-foreground text-lg max-w-3xl mx-auto">Compare Ogeemo against the giants. We don't hide your tools behind paywalls.</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border-2 border-slate-900 shadow-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900 hover:bg-slate-900">
                                <TableHead className="text-white font-bold h-16 w-1/3">Operational Capability</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center bg-primary/20">Ogeemo Membership</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center">Big Accounting (QB/Xero)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { 
                                    name: "Integrated Payroll", 
                                    ogeemo: "INCLUDED (Standard)", 
                                    ogeemoIcon: Check, 
                                    corp: "UPSELL (+$40/mo+)", 
                                    corpIcon: XCircle 
                                },
                                { 
                                    name: "Inventory Control", 
                                    ogeemo: "INCLUDED", 
                                    ogeemoIcon: Check, 
                                    corp: "PREMIUM TIER ONLY", 
                                    corpIcon: AlertCircle 
                                },
                                { 
                                    name: "GDrive Document Mirror", 
                                    ogeemo: "NATIVE", 
                                    ogeemoIcon: Check, 
                                    corp: "NO (Manual Only)", 
                                    corpIcon: XCircle 
                                },
                                { 
                                    name: "AI Dispatch Terminal", 
                                    ogeemo: "INCLUDED", 
                                    ogeemoIcon: Check, 
                                    corp: "NO", 
                                    corpIcon: XCircle 
                                },
                                { 
                                    name: "Project Kanban Boards", 
                                    ogeemo: "INCLUDED", 
                                    ogeemoIcon: Check, 
                                    corp: "UPSELL (Plus Tier)", 
                                    corpIcon: XCircle 
                                },
                                { 
                                    name: "Temporal Scheduler", 
                                    ogeemo: "HIGH-FIDELITY", 
                                    ogeemoIcon: Check, 
                                    corp: "BASIC", 
                                    corpIcon: AlertCircle 
                                }
                            ].map((row, i) => (
                                <TableRow key={i} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                                    <TableCell className="font-bold py-6 text-slate-900">{row.name}</TableCell>
                                    <TableCell className="py-6 bg-primary/5 border-x">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <row.ogeemoIcon className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-black text-primary px-4 uppercase">{row.ogeemo}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <row.corpIcon className={cn("h-5 w-5", row.corpIcon === Check ? "text-green-600" : row.corpIcon === AlertCircle ? "text-amber-500" : "text-destructive")} />
                                            <span className="text-sm text-slate-500 px-4 font-semibold">{row.corp}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </section>

        {/* The Ethics Comparison Table */}
        <section id="ethics-comparison" className="py-24 bg-slate-50 border-y text-black">
            <div className="container px-4 max-w-6xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900 uppercase tracking-tight">The Ethics of Pricing</h2>
                    <p className="text-muted-foreground text-lg">Comparing "The Corporate Way" vs. "The Ogeemo Promise."</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border-2 border-slate-900 shadow-2xl bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900 hover:bg-slate-900">
                                <TableHead className="text-white font-bold h-16 w-1/3">Ethical Component</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center bg-primary/20">The Ogeemo Way</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center">The "Corporate" Way</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { 
                                    name: "Growth Strategy", 
                                    ogeemo: "Price-Lock: Your sign-up price is yours for life.", 
                                    corp: "Introduction trap: Double the price after 6 months." 
                                },
                                { 
                                    name: "Feature Access", 
                                    ogeemo: "Full GDrive, Payroll, and AI included at every level.", 
                                    corp: "Nickel-and-diming: Pay more to unlock basic tools." 
                                },
                                { 
                                    name: "Data Ownership", 
                                    ogeemo: "The Ethical Exit: Easy, free one-click exports.", 
                                    corp: "Data Kidnapping: Making it hard or costly to leave." 
                                },
                                { 
                                    name: "Surplus Profit", 
                                    ogeemo: "Community Dividend: Profit shared as credits or free months.", 
                                    corp: "Shareholder Padding: Hikes to meet quarterly targets." 
                                },
                                { 
                                    name: "Roadmap Control", 
                                    ogeemo: "Member-Owned: Users vote on what we build next.", 
                                    corp: "Board-Directed: Built to increase 'user monetization'." 
                                },
                                { 
                                    name: "The Support Vibe", 
                                    ogeemo: "Main Street: Human-to-human community access.", 
                                    corp: "Wall Street: Infinite hold times and scripted bots." 
                                }
                            ].map((row, i) => (
                                <TableRow key={i} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                                    <TableCell className="font-bold py-6 text-slate-900">{row.name}</TableCell>
                                    <TableCell className="py-6 bg-primary/5 border-x">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <Check className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-semibold text-primary px-4">{row.ogeemo}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <XCircle className="h-5 w-5 text-destructive" />
                                            <span className="text-sm text-slate-500 px-4">{row.corp}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </section>

        {/* Our Anti-Greed Promises */}
        <section className="py-24 bg-white text-black">
            <div className="container px-4 max-w-5xl mx-auto space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Scale className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline">The Community Dividend</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            If Ogeemo has a highly profitable year, we don’t just buy a bigger office. We value-load the platform with more features or offer a "December is on us" month. When we win, the community wins.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Vote className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline">You Own the Roadmap</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Don’t like a feature? Want a new one? Your membership gives you a vote. We build what the community asks for, not what a board of directors thinks will "increase engagement."
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Unlock className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline">The Ethical Exit</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Paradoxically, the easier it is to leave, the more likely people are to stay. If you ever decide Ogeemo isn't for you, we'll help you pack. No hidden fees or delays or fees to export your own data.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Gift className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline">Price Protection for Life</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The membership price you sign up with is your price for life. We will never hike your rates to pad our margins or meet arbitrary corporate targets.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-slate-900 text-white text-center">
          <div className="container px-4 space-y-8">
            <h2 className="text-3xl md:text-6xl font-bold font-headline leading-tight">Join the movement.</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Ready to take back control of your finances? Start your 30-day free trial and experience software built for you.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button asChild size="lg" className="h-14 px-10 text-xl font-bold shadow-xl">
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
