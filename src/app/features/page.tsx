
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
    Clock
} from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function FeaturesPage() {
    const featureGroups = [
        {
            title: "Bookkeeping Kept Simple (BKS)",
            description: "Financial clarity without the headache of complex accounting software.",
            icon: Calculator,
            items: [
                "Cash-based General Ledger",
                "Automated Sales Tax Calculator",
                "Accounts Receivable & Invoicing",
                "Audit-ready Digital Source Documents",
                "Year-end Accrual Adjustments"
            ]
        },
        {
            title: "The Command Centre",
            description: "Your daily execution engine powered by AI and logic.",
            icon: BrainCircuit,
            items: [
                "AI Dispatcher for rapid navigation",
                "Dynamic Temporal Granularity (5-min precision)",
                "Live Session Time Tracking",
                "Integrated Scheduling Hub",
                "Automated Planning Rituals"
            ]
        },
        {
            title: "Project & Task Management",
            description: "High-fidelity orchestration of multi-step business goals.",
            icon: Briefcase,
            items: [
                "Unified Kanban Project Boards",
                "Reusable Project Step Templates",
                "Seamless Calendar Sync",
                "Global To-Do List Inbox",
                "Idea Board for rapid triage"
            ]
        }
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-4">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">Engineered for Efficiency.</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">A unified feature set that replaces five separate apps with one cohesive experience.</p>
                    </div>
                </section>

                {/* Grid */}
                <section className="py-20 container px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {featureGroups.map((group, i) => (
                            <Card key={i} className="flex flex-col border-primary/10 shadow-lg">
                                <CardHeader className="space-y-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                        <group.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">{group.title}</CardTitle>
                                        <CardDescription className="mt-2">{group.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {group.items.map((item, index) => (
                                            <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Detailed Features */}
                <section className="py-20 bg-muted/30 border-y">
                    <div className="container px-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6">
                            <Badge variant="outline" className="text-primary border-primary">Relationships</Badge>
                            <h2 className="text-3xl font-bold font-headline">The Contact Hub</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Not just a directory—a relationship engine. Ogeemo links every email, invoice, project, and time log to your contacts.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white rounded-lg shadow-sm border">
                                    <Search className="h-5 w-5 text-primary mb-2" />
                                    <h4 className="font-bold text-sm">Global Search</h4>
                                    <p className="text-xs text-muted-foreground">Find anything instantly.</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg shadow-sm border">
                                    <ShieldCheck className="h-5 w-5 text-primary mb-2" />
                                    <h4 className="font-bold text-sm">Secure Vault</h4>
                                    <p className="text-xs text-muted-foreground">Protect sensitive client data.</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-video bg-white rounded-2xl shadow-xl overflow-hidden border">
                            <ImagePlaceholder id="features-dashboard" className="object-cover" />
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 container px-4 text-center space-y-8">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Experience radical unity.</h2>
                    <div className="flex justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href="/register">Start Free Trial</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/contact">Book a Demo</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
