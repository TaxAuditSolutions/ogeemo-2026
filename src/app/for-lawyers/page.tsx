'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    FileCheck,
    Zap
} from 'lucide-react';

export default function ForLawyersPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
                    <div className="container px-4 max-w-6xl mx-auto relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8 text-center lg:text-left">
                                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                    INDUSTRY FOCUS: LEGAL PROFESSIONALS
                                </Badge>
                                <h1 className="text-6xl md:text-8xl font-bold font-headline text-primary tracking-tighter leading-none mb-4">
                                    Ogeemo.
                                </h1>
                                <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                                    Legal Case Management, Orchestrated.
                                </p>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                    Stop losing billable hours to administrative gaps. Ogeemo unifies your files, your finances, and your firm’s output into a single digital nervous system.
                                </p>
                                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                        <Link href="/register">Begin Firm Trial <ArrowRight className="ml-2 h-5 w-5" /></Link>
                                    </Button>
                                    <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg">
                                        <Link href="/empowerment">Empowerment Hub</Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full max-w-md mx-auto lg:ml-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-card bg-card relative rotate-3 hover:rotate-0 transition-transform duration-700">
                                <ImagePlaceholder id="lawyer-hero" className="object-cover" />
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
                </section>


                {/* The Law Practice Advantage */}
                <section className="py-32 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">Capture Every Billable Second.</h2>
                            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                                Most legal software treats billing as an afterthought. In Ogeemo, time is the core dimension. We ensure that quick client pivots and rapid advice sessions are never lost.
                            </p>
                            <div className="space-y-6 pt-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <Clock className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Temporal Granularity</h4>
                                        <p className="text-muted-foreground">High-density scheduling that mirrors the reality of a litigator's day with 5-minute precision.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Defensible Documentation</h4>
                                        <p className="text-muted-foreground">Build a "Black Box of Evidence" for every matter. Audit-ready by design, not by panic.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <Scale className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Trust Account Integrity</h4>
                                        <p className="text-muted-foreground">Maintain clean ledger trails for easy trust account reconciliation and ethical transparency.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-2 border-primary/5 bg-slate-900 p-12 flex flex-col justify-center gap-8 text-white">
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Gavel className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Matter Management</h4>
                                    <p className="text-sm text-slate-400">Every case is a node on your web, linking tasks to discovery files.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Relationship Hub</h4>
                                    <p className="text-sm text-slate-400">Track every interaction to provide complete context for legal decisions.</p>
                                </div>
                            </div>
                            <Scale className="absolute -bottom-10 -left-10 h-48 w-48 text-white/5 -rotate-12" />
                        </div>
                    </div>
                </section>

                {/* Specialized Legal Modules */}
                <section className="py-32 bg-muted/30 border-y rounded-[3rem] mx-4 my-12">
                    <div className="container px-4 max-w-6xl mx-auto space-y-16">
                        <div className="text-center space-y-6">
                            <Badge variant="outline" className="text-primary border-primary px-4 py-1">THE ENGINE</Badge>
                            <h2 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">Practice Excellence</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                                Ogeemo provides the digital nervous system for your firm, replacing fragmented folders with radical unity and empowerment.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <Folder className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Discovery & File Hub</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Integrate natively with Google Drive. Link specific discovery folders to client matters for instant partner access.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <FileCheck className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Operational Guardrails</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Use Action Protocols to ensure standard legal steps are followed for every new matter, reducing firm risk.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <Zap className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Empowerment Hub</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Sculpt your firm's workspace. Use Action Chips to create custom shortcuts for each area of law or specific engagement.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
                    <div className="container px-4 space-y-10 relative z-10">
                        <h2 className="text-4xl md:text-7xl font-bold font-headline leading-none tracking-tighter">Practice law, not paperwork.</h2>
                        <p className="text-2xl opacity-90 max-w-2xl mx-auto font-medium">
                            Join the Ogeemo legal community and experience radical practice unity.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 pt-6">
                            <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold shadow-2xl">
                                <Link href="/register">Begin 30-Day Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-16 px-12 text-xl font-bold bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Contact Firm Liaison</Link>
                            </Button>
                        </div>
                    </div>
                    <Scale className="absolute -top-12 -left-12 h-64 w-64 text-white/5 -rotate-12" />
                    <Gavel className="absolute -bottom-12 -right-12 h-64 w-64 text-white/5 rotate-12" />
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
