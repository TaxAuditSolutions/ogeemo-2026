'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from 'next/link';
import { 
    Scale, 
    ArrowRight, 
    ShieldCheck, 
    Clock, 
    Folder,
    Gavel,
    CheckCircle2,
    Briefcase,
    Users,
    FileCheck
} from 'lucide-react';

export default function ForLawyersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            FOR LEGAL PROFESSIONALS
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
                            Legal Case Management, <br /> Orchestrated.
                        </h1>
                        
                        <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-muted my-8">
                            <ImagePlaceholder id="lawyer-hero" className="object-cover" />
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Stop losing billable hours to administrative gaps. Ogeemo unifies your files, your finances, and your firm’s output.
                        </p>
                    </div>
                </section>

                {/* The Law Practice Advantage */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Capture Every Billable Second.</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Most legal software treats billing as an afterthought. In Ogeemo, time is the core dimension. Our Command Centre allows for 5-minute temporal granularity, ensuring that quick client pivots and rapid advice sessions are never lost.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Temporal Matrix:</strong> High-density scheduling that mirrors the reality of a litigator's day.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Native Invoicing:</strong> Push billable sessions directly into professional invoices with zero data reentry.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Trust-Ready Records:</strong> maintain clean ledger trails for easy trust account reconciliation.</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border bg-white p-8 flex flex-col justify-center gap-6">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Gavel className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Matter Management</h4>
                                    <p className="text-sm text-muted-foreground">Every case is a node on your web, linking tasks to discovery files.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Audit-Ready BKS</h4>
                                    <p className="text-sm text-muted-foreground">Financial evidence is automatically organized for your firm's compliance.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Clock className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Live Case Tracking</h4>
                                    <p className="text-sm text-muted-foreground">Log actual vs. projected time on research and drafting instantly.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Specialized Legal Modules */}
                <section className="py-24 bg-muted/30 border-y">
                    <div className="container px-4 max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">Practice Excellence</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                Ogeemo provides the digital nervous system for your firm, replacing fragmented folders with radical unity.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <Folder className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Discovery & File Hub</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Integrate natively with Google Drive. Link specific discovery folders to client matters, ensuring every partner has instant access to the latest evidence.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Relationship Intelligence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Track every email, call, and consultation. Build a chronological history of client interactions that provides context for every legal decision.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <FileCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Operational Guardrails</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Use Action Plans to ensure standard legal protocols are followed for every new matter, reducing firm risk and increasing consistency.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Benefits for the Partner */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="grid grid-cols-2 gap-4 order-2 md:order-1">
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <Briefcase className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Portfolio View</h4>
                            </Card>
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <Scale className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Ethical Billing</h4>
                            </Card>
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Conflict Search</h4>
                            </Card>
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <ArrowRight className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Ready to Scale</h4>
                            </Card>
                        </div>
                        <div className="space-y-6 order-1 md:order-2">
                            <h2 className="text-3xl font-bold font-headline text-primary">A Partner in Your Success.</h2>
                            <p className="text-lg text-muted-foreground">
                                Legal success requires focus. Ogeemo reduces the "Cognitive Load" of running a practice so you can focus on winning cases.
                            </p>
                            <p className="text-muted-foreground">
                                Our Action Chips allow you to sculpt a workspace that matches your specific area of law—whether you're in corporate transactions, family law, or civil litigation.
                            </p>
                            <Button asChild size="lg" className="w-full sm:w-auto">
                                <Link href="/register">Start Your Practice Trial <ArrowRight className="ml-2 h-4 w-4"/></Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Practice law, not paperwork.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Join the Ogeemo legal community and experience radical practice unity.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="font-bold">
                            <Link href="/register">Begin 30-Day Free Trial</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
