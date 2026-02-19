
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    Scale, 
    ArrowRight, 
    ShieldAlert, 
    Clock,
    Folder
} from 'lucide-react';

export default function ForLawyersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary">FOR LAWYERS</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">Legal Case Management, <br /> Orchestrated.</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">A unified hub for case documentation, billable time, and client communication.</p>
                    </div>
                </section>

                <section className="py-20 container px-4 max-w-5xl mx-auto space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold font-headline">Precision Billing</h2>
                            <p className="text-lg text-muted-foreground">
                                Use Ogeemo's dynamic temporal granularity to capture every minute of billable work, from 5-minute client calls to hours of legal research.
                            </p>
                            <div className="flex gap-4">
                                <Button asChild variant="outline">
                                    <Link href="/features">See Invoicing Features</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="relative aspect-video bg-white rounded-xl shadow-lg border p-8 flex items-center justify-center">
                            <Scale className="h-24 w-24 text-primary/20" />
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
