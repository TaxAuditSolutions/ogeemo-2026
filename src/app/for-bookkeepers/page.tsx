
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    BookOpen, 
    ArrowRight, 
    Clock, 
    CheckCircle,
    Landmark
} from 'lucide-react';

export default function ForBookkeepersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary">FOR BOOKKEEPERS</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">Bookkeeping, <br /> Kept Simple.</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">The BKS method allows you to manage more clients with less effort and zero paper trails.</p>
                    </div>
                </section>

                <section className="py-20 container px-4 max-w-5xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold font-headline">Designed for Efficiency</h2>
                        <p className="text-muted-foreground">Ogeemo unifies the bookkeeper's workflow into one streamlined interface.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="border-primary/10">
                            <CardHeader>
                                <Clock className="h-8 w-8 text-primary mb-2" />
                                <CardTitle>Time Tracking to Ledger</CardTitle>
                                <CardDescription>Billable hours flow directly into invoices and income ledgers.</CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="border-primary/10">
                            <CardHeader>
                                <Landmark className="h-8 w-8 text-primary mb-2" />
                                <CardTitle>Bank Reconciliation</CardTitle>
                                <CardDescription>Match imported bank statements to ledger entries with one click.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </section>

                <section className="py-20 bg-muted/30 border-y text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl font-bold font-headline">Reimagine your workflow.</h2>
                        <Button asChild size="lg">
                            <Link href="/register">Join the Beta</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
