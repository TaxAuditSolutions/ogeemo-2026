'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from 'next/link';
import { 
    FileText, 
    ArrowRight, 
    Search, 
    Clock, 
    FolderOpen,
    CheckCircle2,
    ShieldCheck,
    Users,
    Zap
} from 'lucide-react';

export default function ForParalegalsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-muted/30 py-20 border-b">
                    <div className="container px-4 text-center space-y-6">
                        <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            FOR PARALEGALS
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
                            Streamline the Grind. <br /> Master the Matter.
                        </h1>
                        
                        <div className="w-full max-w-4xl mx-auto aspect-[3/1] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-muted my-8">
                            <ImagePlaceholder id="paralegal-hero" className="object-cover" />
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Ogeemo is the ultimate workspace for paralegals who manage high-volume case files and need absolute precision in their daily output.
                        </p>
                    </div>
                </section>

                {/* The "Power User" Section */}
                <section className="py-24 container px-4 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Your Case Discovery, Unified.</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Paralegals are the engine room of the law firm. Ogeemo reduces the friction of document management by linking your research, drafting, and discovery files directly to the client's matter record.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Native Drive Integration:</strong> Access every pleading and exhibit without leaving the Ogeemo project board.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Automated Time Cards:</strong> Capture your billable research time as it happens, ensuring the firm never misses a second of your work.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                    <p><strong className="text-foreground">Global Search:</strong> Find specific mentions across all case folders instantly with our integrated intelligence tools.</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border bg-white p-8 flex flex-col justify-center gap-6">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <FileText className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Document Orchestration</h4>
                                    <p className="text-sm text-muted-foreground">Drafting and review cycles are tracked as nodes on the firm's web.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Users className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Client Communication</h4>
                                    <p className="text-sm text-muted-foreground">Keep every partner and client in the loop with synchronized status updates.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <Clock className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold">Audit-Ready Timelines</h4>
                                    <p className="text-sm text-muted-foreground">A defensible record of exactly when and how a file was processed.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Specialized Paralegal Benefits */}
                <section className="py-24 bg-muted/30 border-y">
                    <div className="container px-4 max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">Elevate Your Role</h2>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                Ogeemo transforms you from an administrative support staff to a strategic business partner.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <FolderOpen className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Case Stewardship</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Maintain the firm's high standards. Organize discovery, manage deadlines, and ensure the "Spider Web" of evidence is always intact.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Efficiency Breakthroughs</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Use Action Chips to pivot between litigation files, corporate filings, and client billing in one click. Zero unbilled time.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>Risk Management</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Build "Action Plans" for standard protocols. Ensure every mandatory filing and client check is completed perfectly every time.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Ready to reclaim your day?</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Join the Ogeemo community and experience the difference of a truly orchestrated legal workspace.
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
