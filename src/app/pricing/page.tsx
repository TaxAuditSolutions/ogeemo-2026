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
    Activity, 
    ShieldCheck, 
    Database,
    Cpu,
    Zap,
    Scale,
    AlertCircle,
    Check,
    Target,
    HeartHandshake,
    Info,
    Files,
    XCircle
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PricingPage() {
  const [isSyncInfoOpen, setIsSyncInfoOpen] = useState(false);

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
              Ogeemo's pricing is built on a radical principle: Your cost should scale with your activity. We've eliminated the "subscription penalty" for quiet months.
            </p>
            <div className="pt-4">
                <Button asChild size="lg" className="h-14 px-10 text-xl font-bold">
                    <Link href="/register">Start 30-Day Free Trial</Link>
                </Button>
            </div>
          </div>
        </section>

        {/* Pricing Philosophy Section */}
        <section className="py-24 bg-white">
            <div className="container px-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <Badge variant="outline" className="text-primary border-primary">OUR PHILOSOPHY</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold font-headline text-slate-900">Building a Community, <br />Not a Toll Road.</h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            In business, there are two ways to set a price: "what the market will bear" or "what is required to deliver exceptional value." We chose the latter.
                        </p>
                        <p className="text-slate-600">
                            The more you charge, the higher the barrier to entry. We believe that high prices are just an invitation for competitors to undercut you and for users to feel penalized for their own success.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <Card className="bg-primary/5 border-primary/10 shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Removing the Barrier
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">We keep our base membership low so that every visionary can access Ogeemo. Our growth comes from your referrals and your success, not from inflated subscription tiers.</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-primary/10 shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <HeartHandshake className="h-5 w-5 text-primary" />
                                    Community First
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Our goal is to build a vibrant community of orchestrated businesses. By pricing fairly, we ensure that Ogeemo remains your long-term partner, not a monthly burden.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>

        {/* The Two-Pillar Formula */}
        <section className="py-24 bg-slate-50 border-y">
          <div className="container px-4">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold font-headline">The Ogeemo Formula</h2>
                <p className="text-muted-foreground text-lg">Predictable foundation + Infrastructure-Sync precision.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                {/* Pillar 1: Base Membership */}
                <Card className="relative overflow-hidden border-2 bg-white">
                    <CardHeader className="bg-slate-50 border-b pb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl">Base Membership</CardTitle>
                        <CardDescription>Secure Cloud Orchestration</CardDescription>
                        <div className="mt-4 flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">$15</span>
                                <span className="text-muted-foreground">/month (1st User)</span>
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-xl font-semibold text-primary">+$5</span>
                                <span className="text-xs text-muted-foreground">/month per additional user</span>
                            </div>
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

                {/* Pillar 2: Infrastructure Sync */}
                <Card className="relative overflow-hidden border-2 border-primary shadow-xl bg-white">
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                        Operational Precision
                    </div>
                    <CardHeader className="bg-primary/5 border-b pb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">Infrastructure Sync</CardTitle>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary rounded-full hover:bg-primary/10" 
                                onClick={() => setIsSyncInfoOpen(true)}
                                title="Open Layman's Guide"
                            >
                                <Info className="h-5 w-5" />
                            </Button>
                        </div>
                        <CardDescription>Pay for Actual Business Activity</CardDescription>
                        <div className="mt-4 flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-primary">Usage</span>
                                <span className="text-muted-foreground">Formula Billing</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 italic">
                                Only billed for the specific data and intelligence your business consumes.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Operational Rates:</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50 text-sm">
                                    <span>Data Writes (per 1,000 operations)</span>
                                    <div className="text-right">
                                        <p className="font-mono font-bold text-primary">$0.0036</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50 text-sm">
                                    <span>AI Orchestration (per 100k tokens)</span>
                                    <div className="text-right">
                                        <p className="font-mono font-bold text-primary">$0.0150</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg border bg-slate-50 text-sm">
                                    <span>Secure Storage (per GB / month)</span>
                                    <div className="text-right">
                                        <p className="font-mono font-bold text-primary">$0.0400</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            * Basic UI navigation and read-only views are included. Charges apply to active data mutations and AI processing calls.
                        </p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

        {/* Feature Comparison Section */}
        <section className="py-24 bg-white">
            <div className="container px-4 max-w-6xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline">Feature Orchestration</h2>
                    <p className="text-muted-foreground text-lg">Why "All-in-One" is better than "Integration-Heavy".</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border shadow-xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900">
                                <TableHead className="text-white font-bold h-16 w-1/3">Core Capability</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center bg-primary/20">Ogeemo</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center">QuickBooks</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center">Xero</TableHead>
                                <TableHead className="text-white font-bold h-16 text-center">Sage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { name: "BKS Core Accounting", ogeemo: true, qb: true, xero: true, sage: true },
                                { name: "Professional Invoicing", ogeemo: true, qb: true, xero: true, sage: true },
                                { name: "Full Payroll Processing (Runs & Remittances)", ogeemo: true, qb: "Add-on Fee", xero: "Add-on Fee", sage: "Add-on Fee" },
                                { name: "Audit-Ready Evidence Linking (Files to Ledger)", ogeemo: true, qb: false, xero: false, sage: false },
                                { name: "Temporal Matrix (5-min Time Precision)", ogeemo: true, qb: false, xero: false, sage: false },
                                { name: "Project Kanban Boards", ogeemo: true, qb: "Higher Tiers", xero: "Add-on", sage: "Basic" },
                                { name: "Custom Action Chips (Workflow Sculpting)", ogeemo: true, qb: false, xero: false, sage: false },
                                { name: "CRM Relationship Hub", ogeemo: true, qb: "Basic", xero: "Basic", sage: "Basic" },
                                { name: "Native Google Workspace Wrapper", ogeemo: true, qb: false, xero: false, sage: false },
                                { name: "AI Dispatch Terminal", ogeemo: true, qb: false, xero: false, sage: false },
                                { name: "Unlimited Users at Base Rate", ogeemo: true, qb: false, xero: false, sage: false }
                            ].map((row, i) => (
                                <TableRow key={i} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                                    <TableCell className="font-semibold py-4">{row.name}</TableCell>
                                    <TableCell className="text-center py-4 bg-primary/5">
                                        {row.ogeemo === true ? <Check className="h-5 w-5 text-primary mx-auto" /> : <span className="text-xs font-bold text-primary">{row.ogeemo}</span>}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        {row.qb === true ? <Check className="h-5 w-5 text-slate-400 mx-auto" /> : row.qb === false ? <XCircle className="h-5 w-5 text-slate-300 mx-auto" /> : <span className="text-[10px] uppercase font-bold text-slate-500">{row.qb}</span>}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        {row.xero === true ? <Check className="h-5 w-5 text-slate-400 mx-auto" /> : row.xero === false ? <XCircle className="h-5 w-5 text-slate-300 mx-auto" /> : <span className="text-[10px] uppercase font-bold text-slate-500">{row.xero}</span>}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        {row.sage === true ? <Check className="h-5 w-5 text-slate-400 mx-auto" /> : row.sage === false ? <XCircle className="h-5 w-5 text-slate-300 mx-auto" /> : <span className="text-[10px] uppercase font-bold text-slate-500">{row.sage}</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </section>

        {/* Market Price Comparison Section */}
        <section className="py-24 bg-slate-50 border-y">
            <div className="container px-4 max-w-5xl mx-auto">
                <div className="text-center mb-12 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline text-slate-900">Price Comparison</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">How Ogeemo compares to traditional subscription models and manual labor.</p>
                </div>

                <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-900">
                            <TableRow className="hover:bg-slate-900">
                                <TableHead className="text-white font-bold h-14">Provider</TableHead>
                                <TableHead className="text-white font-bold h-14">Typical Monthly Cost</TableHead>
                                <TableHead className="text-white font-bold h-14">The "Catch"</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-bold py-6">QuickBooks Online (Essentials)</TableCell>
                                <TableCell className="font-mono">$60.00+</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Pay for dozens of features you don't use. Tiered "trap" forces upgrades for basic team access.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold py-6">Xero (Growing)</TableCell>
                                <TableCell className="font-mono">$42.00+</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Limited transaction counts on lower tiers. Requires expensive add-ons for projects and payroll. Tiered "trap" forces upgrades for basic team access.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold py-6">Sage Accounting</TableCell>
                                <TableCell className="font-mono">$25.00+</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Restrictive multi-user pricing. Fragmented interface requires third-party tools for CRM/Projects. Tiered "trap" forces upgrades for basic team access.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold py-6 flex items-center gap-2">
                                    Junior Bookkeeper <Badge variant="outline" className="text-[10px] uppercase">Manual Labor</Badge>
                                </TableCell>
                                <TableCell className="font-mono">$400.00+</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Based on just 10 hours at $40/hr. Prone to human error, delays, and missing document links.</TableCell>
                            </TableRow>
                            <TableRow className="bg-primary/5 hover:bg-primary/10 transition-colors">
                                <TableCell className="py-8">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xl text-primary uppercase">Ogeemo</span>
                                        <Badge className="bg-primary text-white">THE WINNER</Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="py-8">
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold text-xl text-primary">$15 + Usage</span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Average Micro-Biz: ~$19.97</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-8 text-sm font-semibold text-primary flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    No catches. No tiers. No shelfware. Just orchestration that scales with your actual work.
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <p>Competitor pricing based on standard 2024/2025 non-promotional mid-tier public rates.</p>
                </div>
            </div>
        </section>

        {/* Why this works Section */}
        <section className="py-24 bg-slate-900 text-white">
            <div className="container px-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h2 className="text-4xl font-bold font-headline leading-tight">A Platform That Respects Your Cycle.</h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Business isn't a straight line. It has cycles of intensity and periods of rest.
                        </p>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            With our <strong>Infrastructure Sync</strong> model, you are never penalized for being a small operator. If your usage is minimal, your bill is minimal. If you scale to thousands of operations a day, your costs scale predictably without arbitrary "tier jumps."
                        </p>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <XCircle className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium">No $49 to $499 subscription jumps.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <Cpu className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium">Full transparency into operational volume.</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
                        <h3 className="text-2xl font-bold font-headline text-primary">Monthly Bill Simulation</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">Base Membership (1 User)</span>
                                <span className="font-mono">$15.00</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">Average Activity (Invoices/Tasks)</span>
                                <span className="font-mono">$4.22</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-700 pb-2">
                                <span className="text-slate-400">AI Dispatch Queries (50 calls)</span>
                                <span className="font-mono">$0.75</span>
                            </div>
                            <div className="flex justify-between pt-4 text-xl font-bold text-primary">
                                <span>Total Estimated Monthly</span>
                                <span className="font-mono">$19.97</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 italic text-center">
                            A high-fidelity workspace for less than the cost of a few cups of coffee.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQs */}
        <section className="py-24 bg-white">
            <div className="container px-4 max-w-3xl mx-auto space-y-12">
                <h2 className="text-3xl font-bold font-headline text-center">Pricing FAQ</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg">How is usage calculated?</h4>
                        <p className="text-muted-foreground">Ogeemo tracks the actual infrastructure resources required to run your business. Our formula scales with your specific volume, ensuring you only pay for the value you generate.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg">What if I add a team?</h4>
                        <p className="text-muted-foreground">The first user is $15/mo. Every additional user added to your account is just $5/mo. Usage fees are aggregated across the entire team.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg">How do I track my usage?</h4>
                        <p className="text-muted-foreground">You can view your real-time usage metrics and projected monthly bill in your Settings at any time. No surprises.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary text-primary-foreground text-center">
          <div className="container px-4 space-y-8">
            <h2 className="text-3xl md:text-6xl font-bold font-headline leading-tight">Transparent. Fair. Scalable.</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Stop paying for shelfware and start paying for orchestration.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold">
                <Link href="/register">Start My 30-Day Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Infrastructure Sync Layman's Guide Dialog */}
      <Dialog open={isSyncInfoOpen} onOpenChange={setIsSyncInfoOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-2">
                <Activity className="h-6 w-6" />
                <DialogTitle className="text-2xl font-headline">Layman's Guide to Infrastructure Sync</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Ogeemo only bills you for the actual computing power and storage your business consumes. No hidden fees, just direct operational synchronization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                <Database className="h-5 w-5" /> Data Writes & Operations
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Think of this like the cost of a single stamp for a piece of mail. Every time you "save" a piece of information—like adding an expense, creating a new contact, or updating a project step—Ogeemo records that data in our secure cloud database. We only bill you for these active changes, not for simply looking at your data.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                <Cpu className="h-5 w-5" /> AI Orchestration (Tokens)
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tokens are the "fuel" for the Ogeemo intelligence. The AI doesn't read words like humans do; it breaks them into small pieces called tokens to process and understand them. A typical short query uses about 100-200 tokens. You aren't paying a flat monthly fee for AI; you're only paying for the exact amount of intelligence your business consumes to get the job done.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                <Files className="h-5 w-5" /> Secure Storage
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                This is like the monthly rent for your digital filing cabinet. We keep your data encrypted and replicated across multiple secure servers globally. 1GB of storage is massive for a micro-business; it can hold thousands of professional PDFs or millions of text-based ledger entries. You only pay for the space you actually fill.
              </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-lg">
            <div className="flex-1 text-xs text-muted-foreground italic flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                This model ensures that when your business is quiet, your costs are near zero.
            </div>
            <Button onClick={() => setIsSyncInfoOpen(false)}>Got it, thanks!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
