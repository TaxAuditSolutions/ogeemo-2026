
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    Calculator, 
    ArrowRight, 
    Database, 
    ShieldCheck, 
    TrendingUp,
    FileText,
    Clock,
    Coins,
    BookOpen,
    MessageSquare,
    BarChart
} from 'lucide-react';

export default function ForAccountantsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary">FOR ACCOUNTANTS</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">The Modern Accountant's <br /> Secret Weapon.</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Transition from bookkeeper to strategic advisor with real-time financial orchestration.</p>
                    </div>
                </section>

                {/* Audit Ready Section */}
                <section className="py-20 container px-4 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold font-headline">Audit-Ready, Every Day.</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Ogeemo's BKS system is designed to provide clean, structured data that makes year-end procedures a non-event. No more chasing clients for lost receipts.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-1" />
                                    <span><strong className="text-foreground">Digital Source Documents:</strong> Every transaction is linked to its original file.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-1" />
                                    <span><strong className="text-foreground">Accrual Adjustments:</strong> Easily bridge cash vs. accrual accounting.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-1" />
                                    <span><strong className="text-foreground">Tax Forms:</strong> Categories mapped directly to CRA line numbers.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-primary/5 border-primary/10">
                                <CardHeader className="p-4">
                                    <Database className="h-6 w-6 text-primary" />
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <h4 className="font-bold">Clean Data</h4>
                                    <p className="text-xs text-muted-foreground">Standardized tax categorization.</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-primary/5 border-primary/10">
                                <CardHeader className="p-4">
                                    <ShieldCheck className="h-6 w-6 text-primary" />
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <h4 className="font-bold">Security</h4>
                                    <p className="text-xs text-muted-foreground">Bank-level data protection.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Accountant Benefits Section */}
                <section className="py-20 bg-muted/30 border-y">
                    <div className="container px-4 max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">The Accountant's Edge</h2>
                            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                                Ogeemo doesn't just manage data; it optimizes your entire practice's workflow.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <Clock className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Instant Information Access</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Stop the endless email back-and-forth. With all client records saved and accessible, you can retrieve any document in seconds, saving hours of administrative overhead per file.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <Coins className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Recover Billable Time</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Stop leaking revenue through unrecorded advice. Ogeemo's high-fidelity time orchestration ensures that even quick consults are tracked and ready for billing.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <BookOpen className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Automated Working Papers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        The BKS system automatically organizes source documents against ledger entries. Your working papers are essentially "pre-built" as the client operates their business.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <MessageSquare className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Elevated Client Communication</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Communicate with clarity. Use Ogeemo's shared document views and financial snapshots to facilitate meaningful, data-driven conversations with your clients.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <BarChart className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Value-Added Advisory</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Spend less time on manual reconciliations and more time providing strategic billable services. Use Ogeemo's reporting to help clients optimize their operations.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-primary/5 border-primary/20">
                                <CardHeader>
                                    <TrendingUp className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Scalable Capacity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        By reducing the "administrative gap" for every client, you increase your firm's capacity to handle more volume without increasing headcount or burnout.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Elevate your practice.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">Join the waitlist for our professional accounting dashboard and start orchestrating your practice.</p>
                        <Button asChild size="lg" variant="secondary" className="font-bold">
                            <Link href="/contact">Schedule a Practitioner Demo</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}

function Check({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    )
}
