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
    HeartHandshake,
    Scale,
    Zap
} from 'lucide-react';

export default function AboutLandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background text-black">
          <div className="container px-4 flex flex-col items-center text-center relative z-10">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Built for Us, Not for Wall Street
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-primary tracking-tighter mb-6 max-w-5xl">
              One Command Centre. <br className="hidden sm:block" /> A Unified Community.
            </h1>

            {/* Strategic Header Image */}
            <div className="w-full max-w-3xl aspect-[2/1] mb-6 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white relative">
                <ImagePlaceholder id="about-header-graphic" className="object-cover" />
            </div>

            <p className="text-lg md:text-xl font-medium italic text-primary/80 mb-8 max-w-3xl leading-relaxed">
              "We didn't build a utility; we built a digital nervous system for the modern visionary."
            </p>

            <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              Ogeemo was born in the trenches of real business. We're a community of freelancers, consultants, and small business owners taking back control from fragmented corporate software.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button asChild size="lg" className="h-12 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                <Link href="/register">Join the Movement</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg">
                <Link href="/pricing">View Our Member's Manifesto</Link>
              </Button>
            </div>
            <ScrollButton />
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
        </section>

        {/* The "Main Street" Story */}
        <section id="visionaries-section" className="py-24 bg-white border-y text-black">
          <div className="container px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="outline" className="text-primary border-primary">OUR ORIGIN</Badge>
                <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary tracking-tight">Built in the Trenches.</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Ogeemo wasn't conceived in a Silicon Valley boardroom. It was forged by entrepreneurs tired of the "Corporate Trap"—fragmented tools, endless upsells, and a total lack of empathy for the small business owner.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We realized that we were spending 40% of our time just managing our tools instead of running our businesses. We built Ogeemo to be the single, unified engine we always wanted—accessible to everyone without gating.
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
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 border-8 border-slate-50">
                <ImagePlaceholder id="website-hero" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Anti-Greed Values */}
        <section className="py-24 bg-muted/30 text-black">
            <div className="container px-4 max-w-5xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900 uppercase">The Ogeemo Difference</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic">"We prioritize community over quarterly earnings."</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="text-center p-8 border-primary/10 bg-white shadow-xl hover:shadow-2xl transition-all">
                        <CardContent className="pt-6 space-y-4">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">No Feature Gating</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">We don't hold your tools hostage. Every member gets the full Ogeemo engine, from Payroll to AI, regardless of their plan.</p>
                        </CardContent>
                    </Card>
                    <Card className="text-center p-8 border-primary/10 bg-white shadow-xl hover:shadow-2xl transition-all">
                        <CardContent className="pt-6 space-y-4">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">Audit Ready</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">Built on the BKS method to keep you defensible and compliant 365 days a year, by design.</p>
                        </CardContent>
                    </Card>
                    <Card className="text-center p-8 border-primary/10 bg-white shadow-xl hover:shadow-2xl transition-all">
                        <CardContent className="pt-6 space-y-4">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                <Scale className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">Ethical Ethics</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">Price locks, easy exits, and community dividends. We treat our members as partners, not targets.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Community Proof */}
        <section className="py-24 bg-white text-black">
            <div className="container px-4 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="aspect-square relative rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-50">
                        <ImagePlaceholder id="about-team" className="object-cover" />
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
                            <Users className="h-8 w-8" />
                            Join the Collective.
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            You aren't just another 'subscriber' at Ogeemo. You are a member of a collective that is rewriting the rules of business management. 
                        </p>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Together, we are building a more transparent, more efficient, and more human way to run a business.
                        </p>
                        <Button asChild variant="secondary" className="font-bold">
                            <Link href="/pricing">Read the Full Manifesto <ArrowRight className="ml-2 h-4 w-4"/></Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container px-4 text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">Ready to take back command?</h2>
            <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">Join the visionaries who have found sanity in the Ogeemo Spider Web.</p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold shadow-2xl">
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
