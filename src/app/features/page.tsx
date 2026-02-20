'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Calculator, 
    Briefcase, 
    Users, 
    BrainCircuit, 
    Calendar, 
    ShieldCheck, 
    ArrowRight,
    Search,
    Clock,
    Zap,
    Layers,
    FileDigit,
    LayoutDashboard,
    Globe,
    Bot,
    FolderSync
} from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

export default function FeaturesPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="outline" className="text-primary border-primary px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            Feature Deep-Dive
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">The Ecosystem of Efficiency.</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Ogeemo isn't a collection of tools; it's a single, interconnected ecosystem designed to run your entire business from one tab.
                        </p>
                    </div>
                </section>

                {/* Core Pillars Grid */}
                <section className="py-24 container px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <CardTitle>Action Chips</CardTitle>
                                <CardDescription>The control nodes of your business spider web.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>Manage your own custom dashboard of "Favorite" actions that follow you everywhere.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Total Workspace Control</li>
                                    <li>Zero-clutter navigation</li>
                                    <li>One-click hub pivots</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                    <BrainCircuit className="h-6 w-6" />
                                </div>
                                <CardTitle>Command Centre</CardTitle>
                                <CardDescription>High-fidelity temporal execution engine.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>A 5-minute granularity calendar that turns intentions into tracked, billable reality.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Live Session Tracking</li>
                                    <li>Dynamic Time Slots</li>
                                    <li>AI Dispatch Terminal</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                    <Calculator className="h-6 w-6" />
                                </div>
                                <CardTitle>BKS Accounting</CardTitle>
                                <CardDescription>Bookkeeping Kept Simple & Audit-Ready.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>Cash-based accounting that links every single ledger entry to a source document.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Sales Tax Calculator</li>
                                    <li>Income Statement</li>
                                    <li>Financial Reports</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <CardTitle>Project Forge</CardTitle>
                                <CardDescription>Multi-step goal orchestration.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>Visual Kanban boards that sync natively with your schedule and billing.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Reusable Templates</li>
                                    <li>Automated Task Flow</li>
                                    <li>Idea board triage</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* The "Spider Web" Integration Section */}
                <section className="py-24 bg-muted/30 border-y">
                    <div className="container px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border-8 border-white">
                                <ImagePlaceholder id="action-chips-spider-web" className="object-cover" />
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h2 className="text-4xl font-bold font-headline text-primary">Native Integration. No "Gaps."</h2>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        Traditional software creates "administrative gaps"—time spent moving data from your email to your calendar, or your timer to your invoice. Ogeemo solves this by treating every item as a node on your <strong>Business Spider Web</strong>.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                            <FolderSync className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Unified Document Manager</h4>
                                            <p className="text-muted-foreground">Manage Google Drive directly from your contact records. Every client file is exactly where it belongs.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Relationship Intelligence</h4>
                                            <p className="text-muted-foreground">A Contact Hub that tracks communication history, project status, and financial balance in one view.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                            <Bot className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">AI Dispatch Terminal</h4>
                                            <p className="text-muted-foreground">Give commands instead of clicking buttons. "Start meeting with Acme" triggers the timer and opens the notes.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Detailed Features Grid */}
                <section className="py-24 container px-4">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">Everything, in one tab.</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">Ogeemo replaces your fragmented tech stack with high-fidelity modules.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-2">
                                <ShieldCheck className="h-5 w-5 text-primary" /> Audit-Ready BKS
                            </h3>
                            <p className="text-sm text-muted-foreground">Keep your books compliant 365 days a year. Categorize transactions by CRA line numbers and link every expense to a digital source document.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-2">
                                <Clock className="h-5 w-5 text-primary" /> Live Time Orchestration
                            </h3>
                            <p className="text-sm text-muted-foreground">Capture billable time as it happens. Use the "Field App" for mobile workers or the "Master Mind" for deep desk work.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-2">
                                <FileDigit className="h-5 w-5 text-primary" /> Professional Invoicing
                            </h3>
                            <p className="text-sm text-muted-foreground">Generate invoices directly from your time logs. Automatically calculate sales tax and track payments in your Accounts Receivable ledger.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-2">
                                <Users className="h-5 w-5 text-primary" /> Human Resources
                            </h3>
                            <p className="text-sm text-muted-foreground">Manage employees and contractors. Track vacation time, process payroll runs, and manage source deduction remittances.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-2">
                                <Search className="h-5 w-5 text-primary" /> Global Discovery
                            </h3>
                            <p className="text-sm text-muted-foreground">Find anything instantly. Search across contacts, projects, files, and ledger entries with one powerful, unified search bar.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-2">
                                <LayoutDashboard className="h-5 w-5 text-primary" /> Managed Security
                            </h3>
                            <p className="text-sm text-muted-foreground">Your data is yours. Trigger point-in-time backups of your entire database and user records directly to your secure cloud bucket.</p>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Ready to unify your business?</h2>
                        <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">Experience the Ogeemo Method today with a 30-day free trial.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button asChild size="lg" variant="secondary" className="font-bold">
                                <Link href="/register">Start Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Get in Touch</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}