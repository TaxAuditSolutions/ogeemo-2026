'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from 'next/link';
import { 
    Users, 
    Zap, 
    ShieldCheck, 
    Clock, 
    FileDigit, 
    LayoutDashboard,
    Briefcase,
    CheckCircle2,
    ArrowRight,
    Star,
    BrainCircuit,
    Layers
} from 'lucide-react';

export default function ForVirtualAssistantsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
                    <div className="container px-4 max-w-6xl mx-auto relative z-10">
                        <div className="flex flex-col items-center text-center space-y-8">
                            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                INDUSTRY FOCUS: VIRTUAL BUSINESS PARTNERS
                            </Badge>
                            <h1 className="text-6xl md:text-9xl font-bold font-headline text-primary tracking-tighter leading-none">
                                Ogeemo.
                            </h1>
                            <p className="text-2xl md:text-4xl font-bold text-foreground leading-tight tracking-tight max-w-4xl">
                                The Virtual Business Partner's Hub.
                            </p>
                            <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-3xl overflow-hidden shadow-2xl border-4 border-card bg-card my-8 rotate-1 hover:rotate-0 transition-transform duration-700">
                                <ImagePlaceholder id="va-hero" className="object-cover" />
                            </div>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                                Ogeemo is designed for the modern VA who does more than just data entry. It’s for the partner who orchestrates the entire client operation through total empowerment.
                            </p>
                            <div className="pt-4 flex flex-wrap justify-center gap-6">
                                <Button asChild size="lg" className="h-16 px-10 text-xl font-bold shadow-xl hover:shadow-2xl transition-all">
                                    <Link href="/register">Elevate Your Practice <ArrowRight className="ml-2 h-6 w-6" /></Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="h-16 px-10 text-xl font-bold">
                                    <Link href="/empowerment">Empowerment Hub</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Collaboration Section */}
                <section className="py-32 bg-primary/5 rounded-[4rem] mx-4 my-12">
                    <div className="container px-4 max-w-5xl mx-auto">
                        <div className="text-center mb-16 space-y-6">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">The Unified Business Partnership.</h2>
                            <p className="text-xl text-muted-foreground font-medium">Why a shared Ogeemo workspace is the ultimate VBP tool.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <Card className="bg-card border-primary/10 shadow-xl p-6 rounded-3xl group hover:scale-[1.02] transition-all">
                                <CardHeader>
                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <BrainCircuit className="h-8 w-8" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Master the Master Mind</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        When your client shares their Master Mind with you, you can take over the heavy lifting of project planning. You aren't just checking off items; you are orchestrating the timing of their business vision.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-primary/10 shadow-xl p-6 rounded-3xl group hover:scale-[1.02] transition-all">
                                <CardHeader>
                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Layers className="h-8 w-8" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Sculpt the Workflow</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        As their Virtual Business Partner (VBP), you can manage their Action Chips to create a streamlined, zero-clutter interface. You design the environment that helps them stay focused.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* The "Admin Gap" Section */}
                <section className="py-32 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-10">
                            <h2 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight leading-none">Eliminate the "Admin Gap."</h2>
                            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                                As a VBP, you often spend more time *reporting* on your work than actually *doing* it. Ogeemo changes the math. Your daily actions automatically generate the records your clients need.
                            </p>
                            <div className="space-y-6">
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <Clock className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-2xl tracking-tight mb-2">Automated Time Logs</h4>
                                        <p className="text-lg text-muted-foreground">Your timer sessions turn into billable entries and payroll records instantly.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <ShieldCheck className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-2xl tracking-tight mb-2">Audit-Ready Hand-off</h4>
                                        <p className="text-lg text-muted-foreground">Give your client a clean, professional environment that makes their accountant happy.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-2 border-primary/5 bg-slate-900 p-12 flex flex-col justify-center gap-8 text-white">
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileDigit className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Instant Invoicing</h4>
                                    <p className="text-sm text-slate-400">Turn a week of work into a professional PDF in two clicks.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl">Team Oversight</h4>
                                    <p className="text-sm text-slate-400">Manage sub-contractors and field staff from one central board.</p>
                                </div>
                            </div>
                            <Clock className="absolute -bottom-10 -right-10 h-48 w-48 text-white/5 rotate-12" />
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="py-32 bg-muted/30 border-y rounded-[3rem] mx-4 my-12">
                    <div className="container px-4 max-w-6xl mx-auto space-y-16">
                        <div className="text-center space-y-6">
                            <Badge variant="outline" className="text-primary border-primary px-4 py-1">SERVICES</Badge>
                            <h2 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">Elevate Your Role</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                                With Ogeemo, you aren't just an assistant; you are an <span className="text-primary font-bold">Online Business Manager</span>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <Briefcase className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Project Orchestration</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Build reusable project templates for your clients. Manage their Kanban boards and ensure nothing falls through the "Spider Web."
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <ShieldCheck className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">BKS Stewardship</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Maintain the client’s audit-ready status. Link every expense to a receipt and manage their ledgers daily.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-primary/5 shadow-xl hover:shadow-2xl transition-all rounded-3xl p-4">
                                <CardHeader>
                                    <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-4">
                                        <Star className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold font-headline tracking-tight">Empowerment Hub</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Use Ogeemo's Action Chips to sculpt a unique workspace for your client, organizing the platform to suit their exact wishes.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
                    <div className="container px-4 space-y-10 relative z-10">
                        <h2 className="text-5xl md:text-8xl font-bold font-headline leading-none tracking-tighter">Be the partner they need.</h2>
                        <p className="text-2xl opacity-90 max-w-2xl mx-auto font-medium">
                            Join the Ogeemo ecosystem and transform your virtual assistant job into a high-value virtual partnership.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 pt-6">
                            <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold shadow-2xl">
                                <Link href="/register">Start Your 30-Day Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-16 px-12 text-xl font-bold bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Learn More</Link>
                            </Button>
                        </div>
                    </div>
                    <Star className="absolute -top-12 -left-12 h-64 w-64 text-white/5 -rotate-12" />
                    <BrainCircuit className="absolute -bottom-12 -right-12 h-64 w-64 text-white/5 rotate-12" />
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
