import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { ScrollButton } from "@/components/landing/scroll-button";
import Link from 'next/link';
import { BrainCircuit, Briefcase, Users2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 flex flex-col items-center text-center relative z-10">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
            The Future of Business Operations
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold font-headline text-primary tracking-tighter mb-6 max-w-4xl">
            One Command Centre. <br /> Total Business Orchestration.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Stop juggling disconnected apps. Ogeemo unifies accounting, project execution, and client relationships into a single AI-powered "Master Mind."
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button asChild size="lg" className="h-12 px-8 text-lg font-bold">
              <Link href="/register">Start 30-Day Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg">
              <Link href="/features">Explore Features</Link>
            </Button>
          </div>
          <ScrollButton />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
      </section>

      {/* Visionaries Section (The "About" Hook) */}
      <section id="visionaries-section" className="py-20 bg-white border-y">
        <div className="container px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Designed for the Visionaries.</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Ogeemo wasn't built in a boardroom; it was built in the trenches. We realized that small business owners spend 40% of their time just moving data between different tools. 
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our mission is to eliminate "invisible work." We provide the platform that does the thinking, the linking, and the tracking for you, so you can focus on the vision that started it all.
              </p>
              <div className="pt-4">
                <Button asChild variant="link" className="p-0 text-primary font-bold">
                  <Link href="/about">Read our full story <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5">
              <ImagePlaceholder id="website-hero" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* The Three Pillars */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary tracking-tight">The Three Pillars of Ogeemo</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A unified architecture designed to scale with your ambition.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-none shadow-none bg-transparent text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <BrainCircuit className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Intelligence</CardTitle>
              <CardContent className="px-0">
                <p className="text-muted-foreground">The AI Dispatcher and Master Mind schedule your day, categorize your spending, and find any document with a single natural language command.</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-transparent text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <Briefcase className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Operations</CardTitle>
              <CardContent className="px-0">
                <p className="text-muted-foreground">High-fidelity project execution with real-time time tracking, dynamic temporal granularity, and automated BKS (Bookkeeping Kept Simple).</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-transparent text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <Users2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Relationships</CardTitle>
              <CardContent className="px-0">
                <p className="text-muted-foreground">A unified Contact Hub that links communication history, project status, and financial statements to every client and lead.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust/CTA Section */}
      <section className="py-20">
        <div className="container px-4">
          <Card className="bg-primary text-primary-foreground overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 md:p-16 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to reclaim your time?</h2>
                <p className="text-primary-foreground/80 text-lg">Join the hundreds of visionaries who have simplified their business with Ogeemo. No credit card required to start.</p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" variant="secondary" className="font-bold">
                    <Link href="/register">Start Your Free Trial</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    <Link href="/contact">Request a Demo</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-5 w-5" /> Secure Data
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-5 w-5" /> Instant Setup
                  </div>
                </div>
              </div>
              <div className="hidden md:block relative">
                <ImagePlaceholder id="pitch-strategy" className="object-cover h-full" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
