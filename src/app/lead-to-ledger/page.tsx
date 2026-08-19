'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from "next/link";
import {
    UserPlus,
    FileText,
    Briefcase,
    Clock,
    Receipt,
    BookOpen,
    ArrowRight,
    CheckCircle2,
    Workflow,
    ShieldCheck,
    Zap,
    TrendingUp,
    LayoutTemplate,
    Library,
    Timer,
    Calculator,
    FileCheck,
    Layers,
    Search,
    Send,
    CheckCircle,
    Wrench,
    DollarSign,
    Inbox,
} from "lucide-react";

const pipelineStages = [
    {
        step: 1,
        title: "Capture the Lead",
        icon: UserPlus,
        description: "A new contact enters your orbit—via referral, web form, or cold outreach. Ogeemo's CRM instantly creates a relationship record with full communication tracking.",
        points: ["Unified Contact Hub", "Communication History", "Lead Source Tracking"],
    },
    {
        step: 2,
        title: "Generate the Quote",
        icon: FileText,
        description: "Turn that conversation into a professional quote. Use reusable line-item templates and send branded proposals directly from the platform—no separate invoicing tool required.",
        points: ["Reusable Templates", "Branded Proposals", "One-Click Conversion"],
    },
    {
        step: 3,
        title: "Execute the Work",
        icon: Briefcase,
        description: "Accepted quotes auto-generate Work Orders in the Project Forge. Kanban boards keep every task visible, assignable, and accountable from kickoff to delivery.",
        points: ["Auto-Generated Work Orders", "Kanban Task Boards", "Milestone Tracking"],
    },
    {
        step: 4,
        title: "Track Every Minute",
        icon: Clock,
        description: "The Command Centre captures time in 5-minute increments. Start a live session tied to a specific work order—no invisible work, no assumptive liability, no lost billable hours.",
        points: ["5-Minute Granularity", "Live Session Timer", "Auto-Sync to Billing"],
    },
    {
        step: 5,
        title: "Invoice with Evidence",
        icon: Receipt,
        description: "Approved time entries flow directly into invoices. Every line item links back to the source work order and time log, creating a defensible, audit-ready billing record.",
        points: ["Time-Slip-to-Invoice Flow", "Linked Source Documents", "One-Click Send"],
    },
    {
        step: 6,
        title: "Post to the Ledger",
        icon: BookOpen,
        description: "Paid invoices post natively to the BKS Ledger—categorized by CRA line numbers with digital receipts attached. The full journey from first hello to final entry is complete, traceable, and bulletproof.",
        points: ["CRA-Native Categories", "Receipt-Linked Entries", "Audit-Ready Black Box"],
    },
];

export default function LeadToLedgerPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-20 md:py-28 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
                    <div className="container px-4 max-w-6xl mx-auto relative z-10">
                        <div className="text-center space-y-6">
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                The Ogeemo Pipeline
                            </Badge>
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-headline text-primary tracking-tighter leading-none">
                                Lead to Ledger
                            </h1>
                            <p className="text-xl md:text-2xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
                                One unbroken chain from first contact to final entry.
                            </p>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                Most businesses lose 40% of their margin to "administrative gaps"—data that falls
                                between CRM, calendar, timer, and ledger. Ogeemo eliminates the gaps by treating every
                                item as a node on a single, interconnected Business Spider Web.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
                                <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                    <Link href="/register">Start Your Pipeline</Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg">
                                    <Link href="/features">Explore Features</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
                </section>

                {/* Pipeline Visualization */}
                <section className="py-24 container px-4 mx-auto max-w-6xl">
                    <div className="text-center space-y-4 mb-16">
                        <div className="inline-flex items-center gap-2 text-primary">
                            <Workflow className="h-8 w-8" />
                            <h2 className="text-3xl md:text-5xl font-bold font-headline tracking-tight">The Unbroken Chain</h2>
                        </div>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Six stages. Zero gaps. Every action carries its context forward—so nothing gets lost, duplicated, or forgotten.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pipelineStages.map((stage) => {
                            const Icon = stage.icon;
                            return (
                                <Card
                                    key={stage.step}
                                    className="border-primary/10 bg-card text-card-foreground shadow-lg hover:shadow-2xl transition-all relative group"
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <span className="text-5xl font-bold font-headline text-primary/10 group-hover:text-primary/20 transition-colors">
                                                {stage.step}
                                            </span>
                                        </div>
                                        <CardTitle className="text-xl font-bold font-headline">{stage.title}</CardTitle>
                                        <CardDescription className="text-base leading-relaxed pt-1">
                                            {stage.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {stage.points.map((point, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Flow Arrow Banner */}
                    <div className="mt-16 flex flex-wrap items-center justify-center gap-2 md:gap-4 text-muted-foreground">
                        {pipelineStages.map((stage, idx) => (
                            <div key={stage.step} className="flex items-center gap-2 md:gap-4">
                                <span className="text-sm font-bold uppercase tracking-tight text-primary/80">
                                    {stage.title}
                                </span>
                                {idx < pipelineStages.length - 1 && (
                                    <ArrowRight className="h-4 w-4 text-primary/40" />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quote System Deep Dive */}
                <section className="py-24 bg-gradient-to-b from-background to-primary/5 border-y">
                    <div className="container px-4 max-w-6xl mx-auto">
                        {/* Section Header */}
                        <div className="text-center space-y-4 mb-16">
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                Step 2 — Deep Dive
                            </Badge>
                            <div className="inline-flex items-center gap-2 text-primary">
                                <FileText className="h-8 w-8" />
                                <h2 className="text-3xl md:text-5xl font-bold font-headline tracking-tight">The Quote System</h2>
                            </div>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                                The critical bridge between a conversation and a commitment. Create professional proposals,
                                track them through a nine-stage lifecycle, and convert accepted quotes into invoices or
                                work orders — all natively, with zero double-entry.
                            </p>
                        </div>

                        {/* What It Is */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold font-headline text-primary">What It Is</h3>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    The Quote System is a fully native, pipeline-driven quoting engine built into Ogeemo's
                                    accounting module (BKS — Bookkeeping Kept Simple). Unlike standalone quoting tools, it
                                    is deeply integrated into the "Spider Web" architecture — a quote knows about the
                                    contact who requested it, the invoice it became, and the work order it generated.
                                </p>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    This unbroken chain of context eliminates the "administrative gaps" where data
                                    typically dies between CRM, calendar, timer, and ledger.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold font-headline text-primary">The Quote Lifecycle</h3>
                                <div className="space-y-2">
                                    {[
                                        { icon: Inbox, label: "Requested", desc: "Client has asked for a quote" },
                                        { icon: FileText, label: "Draft", desc: "Being prepared, not yet sent" },
                                        { icon: Send, label: "Sent", desc: "Delivered, awaiting response" },
                                        { icon: CheckCircle, label: "Approved", desc: "Client accepted — ready to convert" },
                                        { icon: Wrench, label: "Work in Progress", desc: "Work is actively being done" },
                                        { icon: CheckCircle2, label: "Completed", desc: "Work done, not yet invoiced" },
                                        { icon: Receipt, label: "Invoiced", desc: "Converted to an invoice in AR" },
                                        { icon: DollarSign, label: "Paid", desc: "Invoice fully paid by client" },
                                    ].map((stage, i) => {
                                        const Icon = stage.icon;
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-primary/10 hover:border-primary/30 transition-colors">
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-sm">{stage.label}</span>
                                                    <span className="text-sm text-muted-foreground ml-2">— {stage.desc}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* How It Works */}
                        <div className="mb-20">
                            <h3 className="text-2xl font-bold font-headline text-primary text-center mb-12">How It Works</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { icon: UserPlus, title: "Client-Linked Quotes", desc: "Searchable combobox pulls from your contact directory. Create new contacts on-the-fly without leaving the form." },
                                    { icon: Library, title: "Service Item Library", desc: "Line items autocomplete from a central library. Edits sync both ways — draft quotes update from library changes and vice versa." },
                                    { icon: Timer, title: "Time Log Import", desc: "Billable calendar entries import directly as line items — hours, rates, and descriptions carried over automatically." },
                                    { icon: Calculator, title: "Built-In Tax Calculation", desc: "Per-line tax type selection with automatic rate lookup. Subtotal, tax total, and grand total update in real time." },
                                    { icon: LayoutTemplate, title: "Reusable Templates", desc: "Save common line item configurations as templates. Load them with one click to jump-start new quotes." },
                                    { icon: FileText, title: "Print-Ready Proposals", desc: "Professional document with logo, itemized table, terms, and client authorization section (signature, PO, date)." },
                                ].map((feature, i) => {
                                    const Icon = feature.icon;
                                    return (
                                        <Card key={i} className="border-primary/10 bg-card hover:shadow-lg transition-all">
                                            <CardHeader>
                                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-2">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                                                <CardDescription className="text-sm leading-relaxed pt-1">{feature.desc}</CardDescription>
                                            </CardHeader>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conversion Paths */}
                        <div className="mb-20">
                            <h3 className="text-2xl font-bold font-headline text-primary text-center mb-4">One-Click Conversions</h3>
                            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
                                Once a quote is approved, three conversion paths are available — all atomic batch operations
                                that either complete fully or fail cleanly.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                                {[
                                    { icon: Receipt, title: "Convert to Invoice", desc: "Creates a new invoice in Accounts Receivable with all line items, totals, and client info carried over. Quote status becomes 'Invoiced'." },
                                    { icon: Briefcase, title: "Convert to Work Order", desc: "Creates a work order in the Project Forge. The work order number is saved back to the quote. Status becomes 'Work in Progress'." },
                                    { icon: Zap, title: "Approve & Invoice", desc: "A one-step shortcut that marks the quote approved and immediately converts it to an invoice, then redirects to AR." },
                                ].map((path, i) => {
                                    const Icon = path.icon;
                                    return (
                                        <Card key={i} className="border-primary/20 bg-primary/5 text-center">
                                            <CardHeader>
                                                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center text-primary mx-auto mb-2">
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-lg">{path.title}</CardTitle>
                                                <CardDescription className="text-sm leading-relaxed pt-1">{path.desc}</CardDescription>
                                            </CardHeader>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Benefits */}
                        <div>
                            <h3 className="text-2xl font-bold font-headline text-primary text-center mb-12">Benefits of Using the Quote System</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                                {[
                                    { icon: Zap, title: "Zero Double-Entry", desc: "All data flows forward automatically — line items, tax rates, client info, totals, and notes." },
                                    { icon: TrendingUp, title: "Full Pipeline Visibility", desc: "Pipeline value, status cards, and searchable table give instant visibility into potential revenue." },
                                    { icon: FileText, title: "Professional Proposals", desc: "Branded, print-ready documents with logo, terms, and client authorization section." },
                                    { icon: LayoutTemplate, title: "Reusable Templates", desc: "Save and load common line item configurations to jump-start new quotes." },
                                    { icon: Library, title: "Library Integration", desc: "Pricing consistency across all quotes and invoices via the Service Item Library." },
                                    { icon: Timer, title: "Time-to-Quote Flow", desc: "Tracked time entries become quote line items with zero manual transcription." },
                                    { icon: Calculator, title: "Built-In Tax", desc: "Per-line tax selection with real-time subtotal, tax, and total calculations." },
                                    { icon: FileCheck, title: "Audit-Ready Trail", desc: "Every quote records who created and updated it. Conversions preserve source-document links." },
                                    { icon: Layers, title: "Native Integration", desc: "Connected to Contacts, Invoices, Work Orders, Service Library, Time Tracking, and Tax Types." },
                                    { icon: ShieldCheck, title: "Multi-Tenant & Secure", desc: "Org-scoped data with Firestore security rules and atomic batch writes." },
                                ].map((benefit, i) => {
                                    const Icon = benefit.icon;
                                    return (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card border border-primary/10">
                                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{benefit.title}</p>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* The "No Gaps" Section */}
                <section className="py-24 bg-card text-card-foreground rounded-3xl border-y">
                    <div className="container px-4 max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border-8 border-muted/50">
                                <ImagePlaceholder id="lead-to-ledger-flow" className="object-cover" />
                            </div>
                            <div className="space-y-6">
                                <Badge variant="outline" className="text-primary border-primary">WHY IT MATTERS</Badge>
                                <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary tracking-tight">
                                    No Gaps. No Ghosts. No Guesswork.
                                </h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    In traditional software, your CRM doesn't know about your timer. Your timer
                                    doesn't know about your invoice. Your invoice doesn't know about your ledger.
                                    Every "handoff" is a place where data dies and billable hours evaporate.
                                </p>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Ogeemo closes every gap. A lead becomes a quote. A quote becomes a work order. A
                                    work order becomes tracked time. Tracked time becomes an invoice. An invoice becomes
                                    a ledger entry—with a receipt attached. All native. All automatic. All audit-ready.
                                </p>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                                        <ShieldCheck className="h-5 w-5" /> Audit-Ready
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                                        <Zap className="h-5 w-5" /> Zero Double-Entry
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                                        <Workflow className="h-5 w-5" /> Fully Native
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 mx-auto space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Close the loop on your business.</h2>
                        <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">
                            Stop losing margin to administrative gaps. Run the full Lead-to-Ledger pipeline in one platform.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 pt-4">
                            <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold shadow-2xl">
                                <Link href="/register">Start Your Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Talk to Us</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}