'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { ScrollButton } from "@/components/landing/scroll-button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    BrainCircuit, 
    ArrowRight, 
    ShieldCheck, 
    Target, 
    Rocket, 
    Globe,
    Users,
    CheckCircle2
} from 'lucide-react';

export default function AboutLandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
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

        {/* Visionaries Section */}
        <section id="visionaries-section" className="py-20 bg-white border-y">
          <div className="container px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Designed for the Visionaries.</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Ogeemo wasn't built in a boardroom; it was built in the trenches. We realized that small business owners spend 40% of their time just moving data between different tools. 
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our mission is to provide a single digital nervous system. We believe that professional success shouldn't require a fragmented tech stack.
                </p>
                <div className="flex items-center gap-6 pt-4">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-primary/20">
                            <ImagePlaceholder id="about-dan" className="object-cover" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight">Dan White</p>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-primary/20">
                            <ImagePlaceholder id="about-nick" className="object-cover" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight">Nick Illiopoulos</p>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-primary/20">
                            <ImagePlaceholder id="about-julie" className="object-cover" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight">Julie White</p>
                    </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <ImagePlaceholder id="website-hero" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-20 bg-muted/30">
            <div className="container px-4 max-w-4xl mx-auto space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
                            <Target className="h-8 w-8" />
                            Our Mission
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Ogeemo was born from the frustration of toggling between seven different browser tabs just to answer a simple client question. 
                        </p>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            We've consolidated those tabs into a single, intuitive interface. We prioritize radical unity, audit-readiness, and human-centric design.
                        </p>
                    </div>
                    <div className="aspect-square relative rounded-2xl overflow-hidden shadow-xl">
                        <ImagePlaceholder id="about-team" className="object-cover" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="text-center p-6 border-primary/10 bg-primary/5">
                        <CardContent className="pt-6 space-y-2">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                <Globe className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl">Radical Unity</h3>
                            <p className="text-sm text-muted-foreground">Every piece of data is connected. Invoices link to time logs, which link to projects.</p>
                        </CardContent>
                    </Card>
                    <Card className="text-center p-6 border-primary/10 bg-primary/5">
                        <CardContent className="pt-6 space-y-2">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                <Rocket className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl">Audit Ready</h3>
                            <p className="text-sm text-muted-foreground">BKS keeps you prepared for tax season 365 days a year by default.</p>
                        </CardContent>
                    </Card>
                    <Card className="text-center p-6 border-primary/10 bg-primary/5">
                        <CardContent className="pt-6 space-y-2">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl">Human First</h3>
                            <p className="text-sm text-muted-foreground">Designed to reduce cognitive load and stress, not just increase efficiency.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container px-4 text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">Ready to reclaim your time?</h2>
            <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">Join the visionaries who have simplified their business with Ogeemo.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="font-bold">
                <Link href="/register">Start Your Free Trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
