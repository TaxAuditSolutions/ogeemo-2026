'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    BrainCircuit, 
    Zap, 
    Target, 
    ArrowRight,
    LayoutDashboard,
    Compass,
    Star,
    Layers
} from 'lucide-react';

export default function ActionChipsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container px-4 flex flex-col items-center text-center relative z-10">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Unique Innovation
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-headline text-primary tracking-tighter mb-6 max-w-4xl">
              The Magic of Action Chips
            </h1>
            
            {/* Spider Web Image Placeholder */}
            <div className="w-full max-w-4xl aspect-[2/1] mb-10 rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-muted relative">
                <ImagePlaceholder id="action-chips-spider-web" className="object-cover" />
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-20">The Ogeemo Spider Web</span>
                </div>
            </div>

            <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              The Ogeemo Action Chip is a revolutionary breakthrough in business management. 
              It is not just a button; it is the control node for your <strong>Spider Web</strong> of operations.
            </p>
          </div>
        </section>

        {/* Core Value Props */}
        <section className="py-24 bg-white">
          <div className="container px-4">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <h2 className="text-4xl font-bold font-headline text-primary">Sculpt Your Workspace</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Unique to Ogeemo, no other software allows you to sculpt your workspace so precisely. 
                  By managing your chips, you eliminate digital noise and focus on what matters.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <LayoutDashboard className="h-5 w-5" />
                      <h4 className="font-bold">Total User Control</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Organize Ogeemo to suit your exact wants, needs, and wishes. You decide which elements of the spider web are visible and active.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Zap className="h-5 w-5" />
                      <h4 className="font-bold">Zero Clutter, Maximum Time</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">By managing your chips, you eliminate digital noise. See only what you use, saving hours of navigation time every week.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Compass className="h-5 w-5" />
                      <h4 className="font-bold">Learn the Ogeemo Method</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Managing your chips is a core part of TOM. It teaches you the scope of Ogeemo's features while you build your own "Favorites" sidebar.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Star className="h-5 w-5" />
                      <h4 className="font-bold">The "Favorites" Engine</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Your curated Action Chips automatically populate your left sidebar, creating a personalized command strip that reflects your unique workflow.</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border bg-muted">
                    <ImagePlaceholder id="features-dashboard" className="object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 bg-muted/30 border-y">
            <div className="container px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <Card className="bg-white border-primary/10 shadow-lg p-8 flex flex-col items-center text-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <BrainCircuit className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">Orchestrate the Web</CardTitle>
                        <CardDescription>
                            Direct the flow of information across the nodes of your business web with one-click pivots.
                        </CardDescription>
                    </Card>
                    <Card className="bg-white border-primary/10 shadow-lg p-8 flex flex-col items-center text-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Layers className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">Customizable Triage</CardTitle>
                        <CardDescription>
                            Turn entire managers on or off. Keep your dashboard clean, professional, and optimized for speed.
                        </CardDescription>
                    </Card>
                    <Card className="bg-white border-primary/10 shadow-lg p-8 flex flex-col items-center text-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Target className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">Mission Focused</CardTitle>
                        <CardDescription>
                            Build "Action Plans" by grouping chips together for specific types of recurring business projects.
                        </CardDescription>
                    </Card>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container px-4 text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">Control your spider web.</h2>
            <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">Stop letting your tools manage you. Take command with Action Chips.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="font-bold">
                <Link href="/register">Start Your Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
