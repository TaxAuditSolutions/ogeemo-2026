'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    Star
} from 'lucide-react';

export default function ForVirtualAssistantsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            FOR VIRTUAL ASSISTANTS & VBP'S
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
                            The Virtual Business <br /> Partner's Command Centre.
                        </h1>
                        
                        <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-muted my-8">
                            <ImagePlaceholder id="va-hero" className="object-cover" />
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Ogeemo is designed for the modern VA who does more than just data entry. It’s for the partner who orchestrates the entire client operation.
                        </p>
                    </div>
                </section>

                {/* The "Admin Gap" Section */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Eliminate the "Admin Gap."</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                As a Virtual Assistant, you often spend more time *reporting* on your work than actually *doing* it. Ogeemo changes the math. By working inside your client’s Ogeemo environment, your daily actions automatically generate the records they need.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Automated Time Logs:</strong> Your timer sessions turn into billable entries and payroll records instantly.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Seamless Document Flow:</strong> Save client emails directly to their Drive folders without leaving Ogeemo.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Audit-Ready Hand-off:</strong> Give your client a clean, professional environment that makes their accountant happy.</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border bg-white p-8 flex flex-col justify-center gap-6">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <FileDigit className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Instant Invoicing</h4>
                                    <p className="text-sm text-muted-foreground">Turn a week of work into a professional PDF in two clicks.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Users className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Team Oversight</h4>
                                    <p className="text-sm text-muted-foreground">Manage sub-contractors and field staff from one central board.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Clock className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Precision Timing</h4>
                                    <p className="text-sm text-muted-foreground">Capture the 5-minute tasks that usually go unbilled.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="py-24 bg-muted/30 border-y">
                    <div className="container px-4 max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">Services You Can Provide</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                With Ogeemo, you aren't just an assistant; you are an <span className="text-primary font-bold">Online Business Manager</span>. Offer these high-value packages:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <Briefcase className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Project Orchestration</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Build reusable project templates for your clients. Manage their Kanban boards and ensure nothing falls through the "Spider Web."
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>BKS Stewardship</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Maintain the client’s audit-ready status. Link every expense to a receipt and manage their A/R and A/P ledgers daily.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <Star className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Business Architecture</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Use Ogeemo's Action Chips to sculpt a unique workspace for your client, organizing the platform to suit their exact wishes.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Key Benefits Grid */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <LayoutDashboard className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Multi-Client Hub</h4>
                            </Card>
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <Zap className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Rapid Pivots</h4>
                            </Card>
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <Clock className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Zero Leaked Time</h4>
                            </Card>
                            <Card className="p-6 text-center space-y-2 border-primary/10">
                                <FileDigit className="h-8 w-8 text-primary mx-auto" />
                                <h4 className="font-bold text-sm">Agency-Level Reports</h4>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold font-headline text-primary">Master the Multi-Task.</h2>
                            <p className="text-lg text-muted-foreground">
                                VAs are the ultimate multi-taskers. Ogeemo’s architecture is built to support this by reducing the "Cognitive Load" of switching between different clients and contexts.
                            </p>
                            <p className="text-muted-foreground">
                                When you manage your Action Chips, you create a customized "Dashboard of Truth" for every business you support. No more guessing, no more app-juggling.
                            </p>
                            <Button asChild size="lg" className="w-full sm:w-auto">
                                <Link href="/register">Elevate Your VA Practice <ArrowRight className="ml-2 h-4 w-4"/></Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Be the partner your clients need.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Join the Ogeemo ecosystem and transform your virtual assistant job into a high-value virtual partnership.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="font-bold">
                            <Link href="/register">Start Your 30-Day Free Trial</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
