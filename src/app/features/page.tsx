'use client';

import { useState } from 'react';
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
    FolderSync,
    Info,
    CheckCircle2,
    MousePointerClick,
    Settings,
    Timer,
    PlusCircle
} from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface FeatureDetailProps {
    title: string;
    description: string;
    icon: React.ElementType;
    overview: string;
    usageSteps: { title: string; description: string; icon: React.ElementType }[];
}

const FeatureDeepDive = ({ isOpen, onOpenChange, feature }: { isOpen: boolean; onOpenChange: (open: boolean) => void; feature: FeatureDetailProps | null }) => {
    if (!feature) return null;
    const Icon = feature.icon;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 shrink-0 bg-primary/5 border-b">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-primary/10">
                            <Icon className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-2xl font-headline">{feature.title} Deep Dive</DialogTitle>
                    </div>
                    <DialogDescription className="text-base text-muted-foreground">
                        {feature.description}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-6">
                    <div className="space-y-8">
                        <section className="space-y-3">
                            <h4 className="font-bold text-lg flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary" />
                                What is this?
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">
                                {feature.overview}
                            </p>
                        </section>

                        <Separator />

                        <section className="space-y-6">
                            <h4 className="font-bold text-lg flex items-center gap-2">
                                <MousePointerClick className="h-5 w-5 text-primary" />
                                How to use it
                            </h4>
                            <div className="grid gap-6">
                                {feature.usageSteps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold border border-primary/20">
                                            {idx + 1}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <step.icon className="h-4 w-4 text-primary" />
                                                <h5 className="font-semibold">{step.title}</h5>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/30 shrink-0">
                    <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Close Deep Dive</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function FeaturesPage() {
    const [selectedFeature, setSelectedFeature] = useState<FeatureDetailProps | null>(null);
    const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

    const featureDetails: Record<string, FeatureDetailProps> = {
        actionChips: {
            title: "Action Chips",
            description: "The control nodes of your business spider web.",
            icon: Zap,
            overview: "Action Chips are revolutionary control nodes that allow you to sculpt Ogeemo to match your exact business mind. They aren't just shortcuts; they are programmable entry points that carry your context across the platform, eliminating digital noise and maximizing navigation speed.",
            usageSteps: [
                { title: "Personalize Your Hub", description: "Visit the Action Manager Settings to view all available modules. Drag your most-used tools into the 'Selected' list.", icon: Settings },
                { title: "One-Click Hub Pivots", description: "Your chips automatically populate your dashboard and sidebar 'Command Strip'. Click a chip to jump between context hubs instantly.", icon: Zap },
                { title: "Sculpt Your Focus", description: "Remove chips for modules you don't use. This keeps your workspace clean, professional, and optimized for high-speed operation.", icon: Layers }
            ]
        },
        commandCentre: {
            title: "Command Centre",
            description: "High-fidelity temporal execution engine.",
            icon: BrainCircuit,
            overview: "Built on a Temporal Matrix, the Command Centre allows you to divide every hour into 5-minute increments. This provides the granularity needed to track 'invisible work'—the quick client calls and rapid administrative tasks that usually go unrecorded.",
            usageSteps: [
                { title: "Schedule with Fidelity", description: "Drag tasks from your project Forge directly into the calendar. Use the slots to define exactly when work will happen.", icon: Calendar },
                { title: "Start Live Sessions", description: "Use the 'Master Mind' card to start a live timer. Your active context follows you across the app as you work.", icon: Timer },
                { title: "Capture the Micro", description: "Record even 5-minute consults. These slots sync natively with BKS Accounting for precision billable time recovery.", icon: Clock }
            ]
        },
        bksAccounting: {
            title: "BKS Accounting",
            description: "Bookkeeping Kept Simple & Audit-Ready.",
            icon: Calculator,
            overview: "BKS is a cash-basis system designed to build a 'Black Box of Evidence'. It prioritizes audit-readiness by creating a one-to-one link between every ledger entry and its digital source document, categorized natively by CRA line numbers.",
            usageSteps: [
                { title: "Post Transactions", description: "Enter income and expenses as they happen. Map them to standard CRA categories to stay compliant 365 days a year.", icon: PlusCircle },
                { title: "Link Digital Proof", description: "Upload or link a PDF receipt to every expense entry. This creates a defensible audit trail that accountants respect.", icon: FolderSync },
                { title: "Review Financial Snapshots", description: "Check your YTD profitability and tax position instantly. Use the Sales Tax Calculator to prepare for quarterly remittances.", icon: FileDigit }
            ]
        },
        projectForge: {
            title: "Project Forge",
            description: "Multi-step goal orchestration.",
            icon: Briefcase,
            overview: "The Project Forge is where your high-level goals are broken down into actionable reality. It combines visual Kanban boards with reusable templates to ensure that your business protocols are followed perfectly every time.",
            usageSteps: [
                { title: "Blueprint Your Outcomes", description: "Define a project for any goal requiring multiple steps. Use the 'Project Plan' view to list out every mandatory action.", icon: Route },
                { title: "Forge Reusable Templates", description: "Save successful project structures as templates. Next time, launch a full task board with one click.", icon: FilePlus2 },
                { title: "Kanban Execution", description: "Move tasks from 'To Do' to 'Done'. Completed tasks sync with your time logs and client communication history.", icon: ListChecks }
            ]
        }
    };

    const handleInfoClick = (key: string) => {
        setSelectedFeature(featureDetails[key]);
        setIsDeepDiveOpen(true);
    };

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
                        
                        <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-muted my-8">
                            <ImagePlaceholder id="features-ecosystem" className="object-cover" />
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Ogeemo isn't a collection of tools; it's a single, interconnected ecosystem designed to run your entire business from one Action Chip.
                        </p>
                    </div>
                </section>

                {/* Core Pillars Grid */}
                <section className="py-24 container px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 text-primary rounded-full hover:bg-primary/10"
                                onClick={() => handleInfoClick('actionChips')}
                            >
                                <Info className="h-5 w-5" />
                            </Button>
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

                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 text-primary rounded-full hover:bg-primary/10"
                                onClick={() => handleInfoClick('commandCentre')}
                            >
                                <Info className="h-5 w-5" />
                            </Button>
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

                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 text-primary rounded-full hover:bg-primary/10"
                                onClick={() => handleInfoClick('bksAccounting')}
                            >
                                <Info className="h-5 w-5" />
                            </Button>
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
                                    <li>Income Statement</li>
                                    <li>Financial Reports</li>
                                    <li>Sales Tax Calculator</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 text-primary rounded-full hover:bg-primary/10"
                                onClick={() => handleInfoClick('projectForge')}
                            >
                                <Info className="h-5 w-5" />
                            </Button>
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
                <section className="py-24 container px-4">
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
                </section>

                {/* Detailed Features Grid */}
                <section className="py-24 container px-4">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">Everything is connected by the Spider Web.</h2>
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

            <FeatureDeepDive 
                isOpen={isDeepDiveOpen} 
                onOpenChange={setIsDeepDiveOpen} 
                feature={selectedFeature} 
            />
        </div>
    );
}
