
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
    PackageSearch
} from 'lucide-react';

export default function ForSmallBusinessesPage() {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
            {/* Hero */}
            <section className="bg-primary text-primary-foreground py-20">
                <div className="container px-4 text-center space-y-6">
                    <Badge className="bg-white/20 text-white border-white/30 px-4 py-1 uppercase tracking-widest text-[10px] font-bold">Solutions</Badge>
                    <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">Scale Your Vision, <br /> Not Your Cognitive Load.</h1>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">The Ogeemo platform is the silent business partner every small business owner deserves.</p>
                </div>
            </section>

            {/* Pain Points - Bookkeeping & Relationships */}
            <section className="py-20 container px-4 bg-white">
                <div className="max-w-5xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Stop Being the Data Middleman</h2>
                        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Traditional small businesses lose hours every week toggling between unrelated tools. Ogeemo ends the fragmentation.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                            <ImagePlaceholder id="pitch-architecture" className="object-cover" />
                        </div>
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Automated Bookkeeping</h4>
                                    <p className="text-muted-foreground">BKS turns your daily operations into a ledger. Tax season becomes just another Friday.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                    <LayoutDashboard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">One Source of Truth</h4>
                                    <p className="text-muted-foreground">Every client record contains their project status, communication history, and outstanding balance.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                    <FileDigit className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Professional Invoicing</h4>
                                    <p className="text-muted-foreground">Generate invoices directly from your time logs. Get paid faster with integrated payment tracking.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* New Inventory Section */}
            <section className="py-20 bg-muted/30 border-y">
                <div className="container px-4">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 order-2 md:order-1">
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Unified Inventory Control</h2>
                                <p className="text-lg text-muted-foreground">Track what you sell and what you use without the spreadsheet headache.</p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                        <PackageSearch className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">Real-Time Stock Tracking</h4>
                                        <p className="text-muted-foreground">Always know exactly what you have on hand. Automated logs track every addition, sale, and consumption.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                        <Store className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">Integrated Point of Sale</h4>
                                        <p className="text-muted-foreground">Process sales directly in Ogeemo. Your inventory levels and income ledger update in a single click.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">Audit-Ready Valuation</h4>
                                        <p className="text-muted-foreground">BKS calculates your inventory value for year-end reporting, ensuring your books are always accurate and defensible.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl order-1 md:order-2 border-8 border-white bg-white">
                            <ImagePlaceholder id="features-dashboard" className="object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Cards */}
            <section className="py-20 bg-white">
                <div className="container px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="text-center p-6 border-primary/10 bg-primary/5">
                            <CardContent className="pt-6 space-y-2">
                                <h3 className="font-bold text-4xl text-primary">40%</h3>
                                <p className="text-sm font-semibold uppercase tracking-widest">Time Saved</p>
                                <p className="text-xs text-muted-foreground italic">on administrative busywork per week.</p>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-6 border-primary/10 bg-primary/5">
                            <CardContent className="pt-6 space-y-2">
                                <h3 className="font-bold text-4xl text-primary">365</h3>
                                <p className="text-sm font-semibold uppercase tracking-widest">Audit Ready</p>
                                <p className="text-xs text-muted-foreground italic">days of compliance, built-in.</p>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-6 border-primary/10 bg-primary/5">
                            <CardContent className="pt-6 space-y-2">
                                <h3 className="font-bold text-4xl text-primary">1</h3>
                                <p className="text-sm font-semibold uppercase tracking-widest">Single Unified Hub</p>
                                <p className="text-xs text-muted-foreground italic">for your entire operation.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 container px-4 text-center space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold font-headline">Ready to work on your business, not in it?</h2>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button asChild size="lg" className="h-12 px-10 text-lg font-bold">
                        <Link href="/register">Start Your 30-Day Free Trial</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 px-10 text-lg">
                        <Link href="/contact">Speak with a Specialist</Link>
                    </Button>
                </div>
            </section>
        </main>
        <SiteFooter />
      </div>
    );
}
