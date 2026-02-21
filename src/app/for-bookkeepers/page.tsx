import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from 'next/link';
import { 
    BookOpen, 
    Clock, 
    CheckCircle,
    Landmark,
    TrendingUp,
    ShieldCheck,
    Users,
    Briefcase,
    Zap,
    BarChart3,
    ArrowRightLeft,
    Handshake
} from 'lucide-react';

export default function ForBookkeepersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            FOR BOOKKEEPERS
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
                            Bookkeeping, <br /> Kept Simple.
                        </h1>
                        
                        <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-muted my-8">
                            <ImagePlaceholder id="bookkeeper-hero" className="object-cover" />
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            The BKS method allows you to manage more clients with less effort and zero paper trails.
                        </p>
                    </div>
                </section>

                {/* Collaboration Section */}
                <section className="py-20 bg-primary/5">
                    <div className="container px-4 max-w-5xl mx-auto">
                        <div className="text-center mb-12 space-y-4">
                            <h2 className="text-3xl font-bold font-headline text-primary">The Shared Ledger Advantage</h2>
                            <p className="text-lg text-muted-foreground">Stop chasing data. Start managing it alongside your clients.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="bg-white border-primary/10">
                                <CardHeader>
                                    <ArrowRightLeft className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Direct Data Flow</CardTitle>
                                    <CardDescription>Clients record, you reconcile.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        By sharing an Ogeemo environment, your clients can log their own expenses and time as they happen. You no longer have to spend hours on data entry; instead, you focus on the high-value work of reconciliation and financial accuracy.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-primary/10">
                                <CardHeader>
                                    <Handshake className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Professional Synergy</CardTitle>
                                    <CardDescription>A unified portal for client and pro.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Give your clients a professional command centre that they actually *want* to use. When they see the value of Action Chips and the Master Mind, they are more likely to stay compliant, making your job easier and more profitable.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Professional Personas Section */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <div className="p-3 bg-primary/10 rounded-xl w-fit">
                                <Briefcase className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-3xl font-bold font-headline">Scale Your Practice</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                For self-employed bookkeepers, Ogeemo is your growth engine. By eliminating the manual "admin gap," you can handle a higher volume of clients while maintaining radical accuracy.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <span>Manage 3x more clients without increasing your hours.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <span>Provide clients with a professional, unified portal.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <span>Eliminate the "shoebox of receipts" forever.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <div className="p-3 bg-primary/10 rounded-xl w-fit">
                                <Users className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-3xl font-bold font-headline">The Internal Value Partner</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                For employee bookkeepers, Ogeemo transforms you from a data processor into a strategic asset. Spend less time hunting for info and more time providing insights that drive the business forward.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <span>Real-time oversight of projects, payroll, and cash flow.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <span>Automated audit trails that simplify compliance.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <span>A workspace that organizes the business around your standards.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Value-Added Services Section */}
                <section className="py-24 bg-muted/30 border-y">
                    <div className="container px-4 max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">New Revenue Streams</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                Stop selling hours and start selling high-margin value. Ogeemo enables you to offer premium advisory services.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <BarChart3 className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Financial Architecture</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Help clients design their custom "Action Chips" and workflows to align their daily operations with their financial goals.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <Landmark className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Proactive Tax Planning</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        With BKS keeping data current daily, you can provide year-round tax positioning and sales tax remittance guidance.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <TrendingUp className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Operational Auditing</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Analyze project-based profitability by comparing time-log data directly against invoicing and expense ledgers.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Key Benefits Grid */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-6 flex flex-col items-center text-center gap-2">
                                    <Zap className="h-6 w-6 text-primary" />
                                    <h4 className="font-bold text-sm">Instant Imports</h4>
                                </Card>
                                <Card className="p-6 flex flex-col items-center text-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-primary" />
                                    <h4 className="font-bold text-sm">Digital Evidence</h4>
                                </Card>
                                <Card className="p-6 flex flex-col items-center text-center gap-2">
                                    <Clock className="h-6 w-6 text-primary" />
                                    <h4 className="font-bold text-sm">Unified Timing</h4>
                                </Card>
                                <Card className="p-6 flex flex-col items-center text-center gap-2">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                    <h4 className="font-bold text-sm">TOM Certified</h4>
                                </Card>
                            </div>
                        </div>
                        <div className="space-y-6 order-1 md:order-2">
                            <h2 className="text-3xl font-bold font-headline">The BKS Advantage</h2>
                            <p className="text-lg text-muted-foreground">
                                Ogeemo is built on the philosophy that bookkeeping shouldn't be a post-mortem event. It's a live part of the business heartbeat.
                            </p>
                            <p className="text-muted-foreground">
                                Our platform forces a one-to-one connection between transactions and source documents, ensuring that every entry is defensible and clear.
                            </p>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Reimagine your workflow.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Join the Ogeemo professional community and start delivering radical value to your clients or employer.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="font-bold">
                            <Link href="/register">Start Your Professional Trial</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
