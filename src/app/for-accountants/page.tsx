'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from 'next/link';
import { 
    ShieldCheck, 
    ArrowRight, 
    FileDigit, 
    TrendingUp, 
    CheckCircle2,
    Users,
    Zap,
    Briefcase,
    FileCheck
} from 'lucide-react';

export default function ForAccountantsPage() {
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
                                    INDUSTRY FOCUS: ACCOUNTANTS
                                </Badge>
                                <h1 className="text-6xl md:text-8xl font-bold font-headline text-primary tracking-tighter leading-none mb-4">
                                    Ogeemo.
                                </h1>
                                <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                                    High-Fidelity Compliance. Zero Friction.
                                </p>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                    Stop chasing clients for receipts. Ogeemo provides a clean, audit-ready data stream from your clients' operations directly to your professional software.
                                </p>
                                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                        <Link href="/register">Partner with Ogeemo <ArrowRight className="ml-2 h-5 w-5" /></Link>
                                    </Button>
                                    <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg">
                                        <Link href="/empowerment">Explore the Hub</Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full max-w-md mx-auto lg:ml-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-card bg-card relative rotate-1 hover:rotate-0 transition-transform duration-700">
                                <ImagePlaceholder id="accountant-hero" className="object-cover" />
                            </div>
                        </div>
                    </div>
                </section>


                {/* The Compliance Advantage */}
                <section className="py-32 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">Audit-Ready, 365 Days a Year.</h2>
                            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                                Ogeemo enforces the "BKS Mandate" on every client transaction. Every expense requires a source document, and every billable second is logged with 5-minute precision.
                            </p>
                            <div className="space-y-6 pt-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Radical Fidelity</h4>
                                        <p className="text-muted-foreground">Source documents are linked at the moment of entry. No more guesswork during year-end filings.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <FileDigit className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Clean Ledger Data</h4>
                                        <p className="text-muted-foreground">Export perfectly formatted reports that map directly to standard accounting codes and line numbers.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <FileCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Audit Shield</h4>
                                        <p className="text-muted-foreground">Protect your clients and your firm. Every transaction has a built-in trail of operational evidence.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-2 border-primary/5 bg-slate-950 p-12 flex flex-col justify-center gap-8 text-white">
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Profit Intelligence</h4>
                                    <p className="text-sm text-slate-400">Real-time YTD snapshots for proactive tax planning sessions.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Client Collaboration</h4>
                                    <p className="text-sm text-slate-400">Access your client's "View-Only" ledger to check balances instantly.</p>
                                </div>
                            </div>
                            <ShieldCheck className="absolute -bottom-10 -right-10 h-48 w-48 text-white/5 rotate-12" />
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
                    <div className="container px-4 space-y-10 relative z-10">
                        <h2 className="text-5xl md:text-8xl font-bold font-headline leading-none tracking-tighter">Accountability, automated.</h2>
                        <p className="text-2xl opacity-90 max-w-2xl mx-auto font-medium">
                            Empower your clients with a platform that makes your job easier and their business stronger.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 pt-6">
                            <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold shadow-2xl">
                                <Link href="/register">Partner with Us</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-16 px-12 text-xl font-bold bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Request a Demo</Link>
                            </Button>
                        </div>
                    </div>
                    <FileCheck className="absolute -top-12 -left-12 h-64 w-64 text-white/5 -rotate-12" />
                    <Zap className="absolute -bottom-12 -right-12 h-64 w-64 text-white/5 rotate-12" />
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
