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
    Briefcase, 
    Users2, 
    ArrowRight, 
    ShieldCheck, 
    Zap, 
    Target, 
    Rocket, 
    Globe,
    Users,
    Quote,
    CheckCircle2,
    Network,
    X,
    MousePointerClick,
    Layers,
    Activity,
    AlertTriangle,
    Star
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

        {/* Action Chips: The Secret Sauce */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <Badge variant="outline" className="text-primary border-primary">Innovation</Badge>
                <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">The Magic of Action Chips</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  The Ogeemo Action Chip is more than a button—it's a <strong>Pivot Point</strong>. Most apps trap you in a linear flow. Ogeemo uses Action Chips to bridge the gap between abstract ideas and concrete execution.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Zap className="h-5 w-5" />
                      <h4 className="font-bold">Instant Transformation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">One click to turn an inbox item into a scheduled project or a billable time log.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Star className="h-5 w-5" />
                      <h4 className="font-bold">Personalized Favorites</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage your chips to show only the features you use most. These curated shortcuts appear in your left sidebar under "Favorites."</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Layers className="h-5 w-5" />
                      <h4 className="font-bold">Multi-View Pivoting</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Switch between high-level strategy and micro-tasking without losing your context.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Activity className="h-5 w-5" />
                      <h4 className="font-bold">Zero Friction</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Drag, drop, and pivot. The administrative gap between thought and record vanishes.</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <Card className="bg-white border-primary/10 shadow-xl p-6 flex flex-col items-center text-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <BrainCircuit className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">The Bridge</CardTitle>
                  <CardDescription className="text-xs">Connecting the "Idea Board" directly to the "Temporal Matrix."</CardDescription>
                </Card>
                <Card className="bg-white border-primary/10 shadow-xl p-6 mt-8 flex flex-col items-center text-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Star className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Command Focus</CardTitle>
                  <CardDescription className="text-xs">Your most critical managers, always available in your "Favorites" sidebar.</CardDescription>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Sarah's Story Section */}
        <section className="py-24 bg-white border-y">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center mb-16 space-y-4">
              <Badge variant="outline" className="text-primary border-primary">User Spotlight</Badge>
              <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">The Story of Sarah</h2>
              <p className="text-xl text-muted-foreground font-medium">From Fragmentation to the "Spider Web"</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-black/5">
                  <ImagePlaceholder id="story-sarah" className="object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                    <p className="font-bold text-lg">Sarah Jenkins</p>
                    <p className="text-sm opacity-90">Virtual Business Partner & CEO</p>
                  </div>
                </div>
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <Quote className="h-8 w-8 mb-4 opacity-50" />
                    <p className="text-lg italic leading-relaxed">
                      "I realized I was app-juggling. My tools didn't talk to each other. I was multi-tasking myself into a state of assumptive liability."
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3 space-y-10">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    The Office Grind and the Virtual Leap
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Sarah was done with the commute. When her agency ordered her back to the cubicle, she made a choice: she wouldn’t just be an Administrative Assistant; she would be a Virtual Business Partner. She had the skills, the drive, and the ambition to build something of her own.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    The "App-Juggling" Trap
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Sarah started where everyone does: Google Workspace. It felt safe. She added Zoom for her VOIP lines, a great webcam for her brand, and a headset for clarity. She was "ready."
                  </p>
                  <div className="bg-muted/50 rounded-lg p-6 space-y-4 border">
                    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">The administrative nightmare:</p>
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-sm">
                        <X className="h-5 w-5 text-destructive shrink-0" />
                        <span><strong>Gmail was a goldmine of billable info,</strong> but logging that time was a second job she kept forgetting to do.</span>
                      </li>
                      <li className="flex gap-3 text-sm">
                        <X className="h-5 w-5 text-destructive shrink-0" />
                        <span><strong>Google Calendar was a list of "hopes,"</strong> not a record of "done."</span>
                      </li>
                      <li className="flex gap-3 text-sm">
                        <X className="h-5 w-5 text-destructive shrink-0" />
                        <span><strong>Google Drive became a digital junk drawer</strong> where client files went to hide.</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-muted-foreground italic text-sm">
                    Sarah realized she was multi-tasking herself into a state of "Assumptive Liability"—guessing at her time, her billing, and her future.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Network className="h-6 w-6 text-primary" />
                    Discovering the Ogeemo "Spider Web"
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Then, Sarah found Ogeemo. It wasn’t another app to learn; it was a SaaS wrapper that integrated natively with her Google Workspace. The moment Sarah logged in, the fragmentation vanished. Ogeemo introduced her to the **"Spider Web" Architecture**:
                  </p>
                  <ul className="space-y-6">
                    <li className="flex gap-4 items-start">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Zap className="h-5 w-5 text-primary"/></div>
                        <div>
                            <h4 className="font-bold text-lg">The Master Action Chip</h4>
                            <p className="text-sm text-muted-foreground">From one central header, Sarah could pivot her entire business view. She customized her dashboard to show only the tools she used daily, making them instantly accessible in her "Favorites" sidebar menu.</p>
                        </div>
                    </li>
                    <li className="flex gap-4 items-start">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0"><BrainCircuit className="h-5 w-5 text-primary"/></div>
                        <div>
                            <h4 className="font-bold text-lg">The Command Centre (The Calendar)</h4>
                            <p className="text-sm text-muted-foreground">For Sarah, the Ogeemo Calendar became the brain of her business. When she dragged an Idea into a time slot, Ogeemo’s "Action-to-Protocol Bridge" did the heavy lifting. It wasn't just an "event" anymore; it was a billable project that automatically updated her ledgers.</p>
                        </div>
                    </li>
                    <li className="flex gap-4 items-start">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Briefcase className="h-5 w-5 text-primary"/></div>
                        <div>
                            <h4 className="font-bold text-lg">The CRM & File Manager</h4>
                            <p className="text-sm text-muted-foreground">No more hunting through G-Drive. Every prospect, every file, and every task was a "Node" on her web, connected and instantly accessible.</p>
                        </div>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    BKS: The "Sleep Well at Night" Factor
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The biggest transformation was the BKS (Bookkeeping Kept Simple) system. Sarah used to dread the "B-word" (Bookkeeping). With Ogeemo, she learned TOM—The Ogeemo Method.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    She realized that by following the intuitive "Info Icons" and the 3-dot discovery menus, she was building a <strong>Black Box of Evidence</strong>. Ogeemo's "Audit-Ready" mandate meant every expense was linked to a source document. If a client ever questioned her, she didn't have to "find" the proof. She just had to click.
                  </p>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-3xl font-bold text-primary mb-4">A Business, Not Just a Job</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    Sarah is no longer an administrative assistant "grinding" from home. She is a CEO. Because Ogeemo handles the "Administrative Gap" in the background, she spends her time doing what she loves: helping her clients grow.
                  </p>
                  <Button asChild size="lg" className="h-12 px-8">
                    <Link href="/register">Join Sarah in the Ogeemo World <ArrowRight className="ml-2 h-4 w-4"/></Link>
                  </Button>
                </div>
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
