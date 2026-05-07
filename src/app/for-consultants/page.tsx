'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="flex flex-col min-h-screen bg-background">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background text-foreground border-b">
                    <div className="container px-4 max-w-6xl mx-auto relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8 text-center lg:text-left">
                                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                    INDUSTRY FOCUS: CONSULTANTS
                                </Badge>
                                <h1 className="text-6xl md:text-8xl font-bold font-headline text-primary tracking-tighter leading-none mb-4">
                                    Ogeemo.
                                </h1>
                                <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                                    Consulting Operations, Orchestrated.
                                </p>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                    Stop letting administrative leakage drain your profitability. Ogeemo unifies your client engagements, your timing, and your financial growth into a single digital nervous system.
                                </p>
                                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                        <Link href="/register">Start Your Practice <ArrowRight className="ml-2 h-5 w-5" /></Link>
                                    </Button>
                                    <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg">
                                        <Link href="/empowerment">Explore the Hub</Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full max-w-md mx-auto lg:ml-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-card bg-card relative rotate-2 hover:rotate-0 transition-transform duration-700">
                                <ImagePlaceholder id="consultant-hero" className="object-cover" />
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
                </section>


                {/* The Consulting Advantage */}
                <section className="py-32 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">Stop Leaking Billable Minutes.</h2>
                            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                                For independent consultants, your time is your inventory. Traditional tools create administrative "gaps" where billable value is lost between calls, emails, and deep work.
                            </p>
                            <div className="space-y-6 pt-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <Clock className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Temporal Matrix</h4>
                                        <p className="text-muted-foreground">Track high-density work sessions with 5-minute precision to capture "invisible" billable time.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <FileDigit className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Native Invoicing</h4>
                                        <p className="text-muted-foreground">Convert billable sessions directly into professional, audit-ready PDFs in seconds.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">BKS Stewardship</h4>
                                        <p className="text-muted-foreground">Keep your business defensible. Link every receipt to its ledger entry by default.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-2 border-primary/5 bg-slate-950 p-12 flex flex-col justify-center gap-8 text-white">
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Rapid Pivots</h4>
                                    <p className="text-sm text-slate-400">Jump between client contexts without losing your train of thought.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Relationship Hub</h4>
                                    <p className="text-sm text-slate-400">A single timeline of every call, project, and invoice for every contact.</p>
                                </div>
                            </div>
                            <ShieldCheck className="absolute -bottom-10 -right-10 h-48 w-48 text-white/5 rotate-12" />
                        </div>
                    </div>
                </section>

                {/* Specialized Consulting Modules */}
                <section className="py-32 bg-muted/30 border-y rounded-[3rem] mx-4 my-12">
                    <div className="container px-4 max-w-6xl mx-auto space-y-16">
                        <div className="text-center space-y-6">
                            <Badge variant="outline" className="text-primary border-primary px-4 py-1">THE ENGINE</Badge>
                            <h2 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">Master Your Engagements</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                                Ogeemo replaces your fragmented tech stack with high-fidelity modules designed for professional output and total empowerment.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <Briefcase className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Project Forge</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Orchestrate complex client deliverables. Use the "Action-to-Protocol Bridge" to turn simple ideas into scheduled, billable tasks.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <TrendingUp className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Financial Snapshots</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Real-time insights into your YTD income, expenses, and net profit. Always know where your business stands before you take your next call.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <LayoutDashboard className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Empowerment Hub</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Sculpt your workspace. Use Action Chips to create a customized command strip of the tools you use for each specific engagement.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
                    <div className="container px-4 space-y-10 relative z-10">
                        <h2 className="text-4xl md:text-7xl font-bold font-headline leading-none tracking-tighter">Run your practice like a powerhouse.</h2>
                        <p className="text-2xl opacity-90 max-w-2xl mx-auto font-medium">
                            Experience the difference of a truly orchestrated workspace. Start your 30-day trial today.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 pt-6">
                            <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold shadow-2xl">
                                <Link href="/register">Begin Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-16 px-12 text-xl font-bold bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Get in Touch</Link>
                            </Button>
                        </div>
                    </div>
                    <Briefcase className="absolute -top-12 -left-12 h-64 w-64 text-white/5 -rotate-12" />
                    <Zap className="absolute -bottom-12 -right-12 h-64 w-64 text-white/5 rotate-12" />
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
