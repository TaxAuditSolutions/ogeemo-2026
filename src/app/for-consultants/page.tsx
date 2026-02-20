
'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from 'next/link';
import { 
    Briefcase, 
    ArrowRight, 
    Clock, 
    ShieldCheck, 
    CheckCircle2,
    Users,
    Zap,
    TrendingUp,
    FileDigit,
    LayoutDashboard
} from 'lucide-react';

export default function ForConsultantsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            FOR CONSULTANTS
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
                            Consulting Operations, <br /> Orchestrated.
                        </h1>
                        
                        <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-muted my-8">
                            <ImagePlaceholder id="consultant-hero" className="object-cover" />
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Stop letting administrative leakage drain your profitability. Ogeemo unifies your client engagements, your timing, and your financial growth into a single digital nervous system.
                        </p>
                    </div>
                </section>

                {/* The Consulting Advantage */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Stop Leaking Billable Minutes.</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                For independent consultants, your time *is* your inventory. Traditional tools create administrative "gaps" where billable value is lost between calls, emails, and deep work.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Temporal Matrix:</strong> Track high-density work sessions with 5-minute precision.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Native Invoicing:</strong> Convert billable sessions directly into professional PDFs in seconds.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Audit-Ready Expenses:</strong> Keep your business defensible. Link every receipt to its ledger entry by default.</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border bg-white p-8 flex flex-col justify-center gap-6">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Zap className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Rapid Pivots</h4>
                                    <p className="text-sm text-muted-foreground">Jump between client contexts without losing your train of thought or your timer.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">BKS Stewardship</h4>
                                    <p className="text-sm text-muted-foreground">Managed bookkeeping that aligns with CRA line numbers for stress-free tax filings.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Users className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Relationship Hub</h4>
                                    <p className="text-sm text-muted-foreground">A single timeline of every call, project, and invoice for every contact.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Specialized Consulting Modules */}
                <section className="py-24 bg-muted/30 border-y">
                    <div className="container px-4 max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">Master Your Engagements</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                Ogeemo replaces your fragmented tech stack with high-fidelity modules designed for professional output.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-white border-primary/10 shadow-lg">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <Briefcase className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Project Forge</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Orchestrate complex client deliverables. Use the "Action-to-Protocol Bridge" to turn simple ideas into scheduled, billable tasks.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-primary/10 shadow-lg">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <FileDigit className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Financial Snapshots</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Real-time insights into your YTD income, expenses, and net profit. Always know where your business stands before you take your next call.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-primary/10 shadow-lg">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <LayoutDashboard className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Action Manager</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Sculpt your workspace. Use Action Chips to create a customized command strip of the tools you use for each specific engagement.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Run your practice like a powerhouse.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Experience the difference of a truly orchestrated workspace. Start your 30-day trial today.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="font-bold">
                            <Link href="/register">Begin Free Trial</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
