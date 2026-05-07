'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    Store, 
    ArrowRight, 
    ShieldCheck, 
    Zap, 
    TrendingUp, 
    LayoutDashboard,
    Clock,
    FileDigit,
    PackageSearch,
    Network
} from 'lucide-react';

export default function ForSmallBusinessesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
                    <div className="container px-4 max-w-6xl mx-auto relative z-10">
                        <div className="flex flex-col items-center text-center space-y-8">
                            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                INDUSTRY FOCUS: SMALL BUSINESS
                            </Badge>
                            <h1 className="text-6xl md:text-9xl font-bold font-headline text-primary tracking-tighter leading-none">
                                Ogeemo.
                            </h1>
                            <p className="text-2xl md:text-4xl font-bold text-foreground leading-tight tracking-tight max-w-3xl">
                                Scale Your Vision, Not Your Cognitive Load.
                            </p>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                                The Ogeemo platform is the silent business partner every small business owner deserves. Unified, intuitive, and audit-ready.
                            </p>
                            <div className="pt-4 flex flex-wrap justify-center gap-6">
                                <Button asChild size="lg" className="h-16 px-10 text-xl font-bold shadow-xl hover:shadow-2xl transition-all">
                                    <Link href="/register">Start Your Trial <ArrowRight className="ml-2 h-6 w-6" /></Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="h-16 px-10 text-xl font-bold">
                                    <Link href="/empowerment">Empowerment Hub</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" />
                </section>

                {/* Pain Points - Bookkeeping & Relationships */}
                <section className="py-32 container px-4 max-w-6xl mx-auto">
                    <div className="max-w-5xl mx-auto space-y-20">
                        <div className="text-center space-y-6">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">End Administrative Fragmentation.</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                                Traditional small businesses lose hours every week toggling between unrelated tools. Ogeemo ends the friction by unifying your operations into one digital nervous system.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                            <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-card bg-card rotate-1 hover:rotate-0 transition-transform duration-700">
                                <ImagePlaceholder id="pitch-architecture" className="object-cover" />
                            </div>
                            <div className="space-y-10">
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <Clock className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-2xl tracking-tight mb-2">Automated Bookkeeping</h4>
                                        <p className="text-lg text-muted-foreground">BKS turns your daily operations into a ledger. Tax season becomes just another Friday.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <Network className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-2xl tracking-tight mb-2">One Source of Truth</h4>
                                        <p className="text-lg text-muted-foreground">Every client record contains their project status, communication history, and outstanding balance.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <FileDigit className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-2xl tracking-tight mb-2">Professional Invoicing</h4>
                                        <p className="text-lg text-muted-foreground">Generate invoices directly from your time logs. Get paid faster with integrated payment tracking.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Inventory Section */}
                <section className="py-32 bg-slate-950 text-white rounded-[4rem] mx-4 my-12 relative overflow-hidden">
                    <div className="container px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center relative z-10">
                        <div className="space-y-10 order-2 md:order-1">
                            <div className="space-y-6">
                                <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">Unified Inventory.</h2>
                                <p className="text-xl text-slate-400 leading-relaxed">Track what you sell and what you use without the spreadsheet headache.</p>
                            </div>
                            <div className="space-y-8">
                                <div className="flex gap-6 p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                                    <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <PackageSearch className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Real-Time Stock Tracking</h4>
                                        <p className="text-slate-400">Always know exactly what you have on hand. Automated logs track every addition and sale.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                                    <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <Store className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Integrated Point of Sale</h4>
                                        <p className="text-slate-400">Process sales directly in Ogeemo. Your inventory levels and income ledger update instantly.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                                    <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <ShieldCheck className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Audit-Ready Valuation</h4>
                                        <p className="text-slate-400">BKS calculates your inventory value for reporting, ensuring your books are always defensible.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl order-1 md:order-2 border-8 border-white/10 bg-white/5">
                            <ImagePlaceholder id="features-dashboard" className="object-cover" />
                        </div>
                    </div>
                    <Store className="absolute -bottom-20 -right-20 h-96 w-96 text-white/5 rotate-12" />
                </section>

                {/* Trust Cards */}
                <section className="py-32 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="text-center p-10 border-primary/5 bg-primary/5 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                            <CardContent className="space-y-4">
                                <h3 className="font-bold text-6xl text-primary tracking-tighter group-hover:scale-110 transition-transform">40%</h3>
                                <p className="text-base font-bold uppercase tracking-widest text-foreground">Time Saved</p>
                                <p className="text-muted-foreground italic">on administrative busywork every week.</p>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-10 border-primary/5 bg-primary/5 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                            <CardContent className="space-y-4">
                                <h3 className="font-bold text-6xl text-primary tracking-tighter group-hover:scale-110 transition-transform">365</h3>
                                <p className="text-base font-bold uppercase tracking-widest text-foreground">Audit Ready</p>
                                <p className="text-muted-foreground italic">days of compliance, built into the engine.</p>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-10 border-primary/5 bg-primary/5 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                            <CardContent className="space-y-4">
                                <h3 className="font-bold text-6xl text-primary tracking-tighter group-hover:scale-110 transition-transform">1</h3>
                                <p className="text-base font-bold uppercase tracking-widest text-foreground">Unified Hub</p>
                                <p className="text-muted-foreground italic">for your entire business operation.</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
                    <div className="container px-4 space-y-10 relative z-10">
                        <h2 className="text-5xl md:text-8xl font-bold font-headline leading-none tracking-tighter">Work on your business.</h2>
                        <p className="text-2xl opacity-90 max-w-2xl mx-auto font-medium">
                            Join the visionaries who have stopped the grind and started the orchestration.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 pt-6">
                            <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold shadow-2xl">
                                <Link href="/register">Start Your 30-Day Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-16 px-12 text-xl font-bold bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Speak with a Specialist</Link>
                            </Button>
                        </div>
                    </div>
                    <TrendingUp className="absolute -top-12 -left-12 h-64 w-64 text-white/5 -rotate-12" />
                    <ShieldCheck className="absolute -bottom-12 -right-12 h-64 w-64 text-white/5 rotate-12" />
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
