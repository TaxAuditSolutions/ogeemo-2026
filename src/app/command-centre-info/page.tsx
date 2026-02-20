
'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    BrainCircuit, 
    Clock, 
    Zap, 
    Target, 
    ArrowRight,
    LayoutDashboard,
    Layers,
    Cpu,
    CheckCircle2
} from 'lucide-react';

export default function CommandCentreInfoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container px-4 flex flex-col items-center text-center relative z-10">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              The Heart of the Spider Web
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-headline text-primary tracking-tighter mb-6 max-w-4xl">
              The Command Centre
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              Where strategy meets high-fidelity execution. Ogeemo's Command Centre is the central nervous system that orchestrates your time, your tasks, and your billing.
            </p>
            <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border-8 border-white bg-muted relative mb-12">
                <ImagePlaceholder id="command-centre-hero" className="object-cover" />
            </div>
            <div className="flex gap-4">
                <Button asChild size="lg" className="font-bold">
                    <Link href="/register">Try the Engine</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href="/features">See All Modules</Link>
                </Button>
            </div>
          </div>
        </section>

        {/* Temporal Matrix Section */}
        <section className="py-24 bg-white">
          <div className="container px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="p-3 bg-primary/10 rounded-xl w-fit">
                    <Clock className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-4xl font-bold font-headline text-primary">The Temporal Matrix</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Most calendars are lists of appointments. The Ogeemo Command Centre is a list of <strong>actions</strong>. 
                </p>
                <p className="text-lg text-muted-foreground">
                  With dynamic temporal granularity, you can divide every hour into 5-minute increments. This allows you to track the "micro-tasks"—the quick client consults, the rapid document reviews—that usually fall through the administrative cracks.
                </p>
                <ul className="space-y-4 pt-4">
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                        <span><strong className="text-foreground">Precision Billing:</strong> Convert 5-minute slots directly into billable ledger entries.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                        <span><strong className="text-foreground">Live Orchestration:</strong> Track actual vs. projected time in real-time.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                        <span><strong className="text-foreground">Sync Native:</strong> Changes in the Command Centre update your projects and invoices instantly.</span>
                    </li>
                </ul>
              </div>
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border bg-muted">
                  <ImagePlaceholder id="action-chips-spider-web" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Workspace Sculpting Section */}
        <section className="py-24 bg-muted/30 border-y">
          <div className="container px-4">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">The Power of Managing Action Chips</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Sculpt Ogeemo to match your unique business mind.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="bg-white border-primary/10 shadow-lg p-8 flex flex-col items-center text-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Zap className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">One-Click Pivots</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Your most critical business functions follow you. Managing your chips creates a custom "Command Strip" in your sidebar for instant navigation between hubs.
                    </p>
                </Card>
                <Card className="bg-white border-primary/10 shadow-lg p-8 flex flex-col items-center text-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Layers className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Digital Declutter</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Stop hunting for features you don't use. Turn off entire modules and keep your Command Centre focused strictly on your current business mission.
                    </p>
                </Card>
                <Card className="bg-white border-primary/10 shadow-lg p-8 flex flex-col items-center text-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Cpu className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Action Plans</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Group chips into "Action Plans" for specific recurring projects. Orchestrate complex workflows with a pre-configured dashboard of tools.
                    </p>
                </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary text-primary-foreground text-center">
          <div className="container px-4 space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">Take Command.</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">Experience the platform that thinks with you. Start your 30-day trial today.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="font-bold">
                <Link href="/register">Start My Free Trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link href="/contact">Speak with a Specialist</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
