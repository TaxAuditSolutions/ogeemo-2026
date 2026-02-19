
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
    FileDigit
} from 'lucide-react';

export default function ForSmallBusinessesPage() {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
            {/* Hero */}
            <section className="bg-primary text-primary-foreground py-20">
                <div className="container px-4 text-center space-y-6">
                    <Badge className="bg-white/20 text-white border-white/30 px-4 py-1">SOLUTIONS</Badge>
                    <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">Scale Your Vision, <br /> Not Your Cognitive Load.</h1>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">The Ogeemo platform is the silent business partner every small business owner deserves.</p>
                </div>
            </section>

            {/* Pain Points */}
            <section className="py-20 container px-4">
                <div className="max-w-5xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold font-headline text-primary">Stop Being the Data Middleman</h2>
                        <p className="text-muted-foreground">Traditional small businesses lose hours every week toggling between unrelated tools. Ogeemo ends the fragmentation.</p>
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

            {/* Trust Cards */}
            <section className="py-20 bg-muted/30">
                <div className="container px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="text-center p-6">
                            <CardContent className="pt-6 space-y-2">
                                <h3 className="font-bold text-4xl text-primary">40%</h3>
                                <p className="text-sm font-semibold uppercase tracking-widest">Time Saved</p>
                                <p className="text-xs text-muted-foreground italic">on administrative busywork per week.</p>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-6">
                            <CardContent className="pt-6 space-y-2">
                                <h3 className="font-bold text-4xl text-primary">365</h3>
                                <p className="text-sm font-semibold uppercase tracking-widest">Audit Ready</p>
                                <p className="text-xs text-muted-foreground italic">days of compliance, built-in.</p>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-6">
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
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to work on your business, not in it?</h2>
                <Button asChild size="lg" className="h-12 px-10 text-lg">
                    <Link href="/register">Start Your Free Trial</Link>
                </Button>
            </section>
        </main>
        <SiteFooter />
      </div>
    );
}
