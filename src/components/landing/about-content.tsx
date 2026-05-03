'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { ScrollButton } from "@/components/landing/scroll-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Zap,
    GraduationCap,
    Crown
} from 'lucide-react';

export function AboutContent() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background text-foreground border-b">
          <div className="container px-4 max-w-6xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 text-center lg:text-left">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                        Built for Us, Not for Wall Street
                    </Badge>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold font-headline text-primary tracking-tighter leading-tight">
                        One Command Centre. <br className="hidden sm:block" /> A Unified Community.
                    </h1>
                    
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                        Ogeemo was born in the trenches of real business. We're a community of freelancers, consultants, and small business owners taking back control from fragmented corporate software.
                    </p>

                    <p className="text-lg font-medium italic text-primary/70 max-w-3xl leading-relaxed">
                        "We didn't build a utility; we built a digital nervous system for the modern visionary."
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                        <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                            <Link href="/register">Join the Movement</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg">
                            <Link href="/pricing">Read the Manifesto</Link>
                        </Button>
                    </div>
                </div>

                <div className="w-full max-w-md mx-auto lg:ml-auto aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-card bg-card relative rotate-1 hover:rotate-0 transition-transform duration-700">
                    <ImagePlaceholder id="about-header-graphic" className="object-cover" />
                </div>
            </div>
            
            <div className="flex justify-center pt-20">
                <ScrollButton />
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
        </section>

        <div className="container mx-auto px-4 -mt-10 relative z-20 pb-24">
          <Tabs defaultValue="story" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="grid w-full max-w-md grid-cols-2 h-14 bg-card/80 backdrop-blur-md shadow-xl border border-primary/10 rounded-full p-1">
                <TabsTrigger value="story" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Our Story</TabsTrigger>
                <TabsTrigger value="mentorship" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Members/Mentors</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="story" className="mt-0 space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* The "Main Street" Story */}
        <section id="visionaries-section" className="py-24 bg-card border-y text-card-foreground rounded-3xl">
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
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 border-8 border-muted/50">
                <ImagePlaceholder id="website-hero" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Anti-Greed Values */}
        <section className="py-24 text-foreground">
            <div className="container px-4 max-w-5xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-foreground uppercase">The Ogeemo Difference</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic">"We prioritize community over quarterly earnings."</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="text-center p-8 border-primary/10 bg-card shadow-xl hover:shadow-2xl transition-all">
                        <CardContent className="pt-6 space-y-4">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">No Feature Gating</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">We don't hold your tools hostage. Every member gets the full Ogeemo engine, from Payroll to AI, regardless of their plan.</p>
                        </CardContent>
                    </Card>
                    <Card className="text-center p-8 border-primary/10 bg-card shadow-xl hover:shadow-2xl transition-all">
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
        <section className="py-24 bg-card text-card-foreground rounded-3xl">
            <div className="container px-4 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="aspect-square relative rounded-3xl overflow-hidden shadow-2xl border-8 border-muted/50">
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

            </TabsContent>

            <TabsContent value="mentorship" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <section className="py-20 bg-card text-card-foreground rounded-3xl shadow-xl border-2 border-primary/5">
                   <div className="container px-4 lg:px-12 max-w-6xl mx-auto space-y-16">
                     
                     <div className="text-center space-y-6">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-transparent py-1.5 px-6 font-bold tracking-widest uppercase">THE OGEEMO MULTIPLIER</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">The Ogeemo Ecosystem:<br />Community & Suite</h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                          By separating the Community (The Ogeemo Web) from the Software (The Ogeemo Suite), we are building a walled garden ecosystem. The community acts as the gateway and the accelerator, while the software provides the professional utility.
                        </p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="border-2 border-primary/10 shadow-lg relative overflow-hidden bg-background">
                            <CardHeader className="bg-primary/5 pb-8">
                                <Globe className="h-10 w-10 text-primary mb-4" />
                                <CardTitle className="text-2xl font-bold font-headline">1. The Ogeemo Web (Community)</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <p className="text-muted-foreground leading-relaxed text-lg">The free-to-enter gateway. This acts as the social hub, the lead-generation engine, and the only place where a user can obtain access to the software.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-primary/10 shadow-lg relative overflow-hidden text-white bg-slate-900 border-slate-800">
                            <CardHeader className="pb-8 z-10 relative">
                                <BrainCircuit className="h-10 w-10 text-primary mb-4" />
                                <CardTitle className="text-2xl font-bold font-headline">2. The Ogeemo Suite (Software)</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 z-10 relative">
                                <p className="text-slate-300 leading-relaxed text-lg">The core utility (the CRM, Gen-2 Ledger, Action Manager). It is gated entirely by an active profile.</p>
                            </CardContent>
                            <div className="absolute top-0 right-0 h-48 w-48 bg-primary/20 blur-3xl rounded-full" />
                        </Card>
                     </div>

                     <div className="bg-muted/30 p-8 lg:p-12 rounded-3xl border border-border shadow-inner">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-primary/10 p-3 rounded-xl"><Target className="h-8 w-8 text-primary" /></div>
                            <h3 className="text-2xl md:text-3xl font-bold font-headline text-foreground">The Primary Output of Ogeemo</h3>
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-muted-foreground">
                            <p className="text-lg font-medium">To define our progression systems, we first have to answer: What is the primary "output" of the Ogeemo software?</p>
                            <p className="text-lg">Based on Ogeemo's architecture, the primary output is <strong>"The Audit-Ready Client Statement and Operational Data Report."</strong></p>
                            <p>Ogeemo isn't generating creative designs or marketing content; it is generating immaculate operational transparency. It tracks professional time, billable actions, and work activity to prevent "invisible work" and assumptive liability.</p>
                            <div className="bg-primary/5 border-l-4 border-primary p-6 mt-6 text-primary rounded-r-xl">
                                <p className="italic font-medium text-lg leading-relaxed">
                                  "Therefore, a 'Mentor' in the Ogeemo system isn't an artist—they are a Certified Systems Architect, Workflow Specialist, or Operational Auditor. They are the experts who know exactly how to structure an organization to maximize billable hours and remain bulletproof during audits."
                                </p>
                            </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                         <div className="text-center">
                            <h3 className="text-3xl md:text-4xl font-bold font-headline text-foreground">Mentorship Hierarchy</h3>
                            <p className="text-muted-foreground mt-2 text-lg">Using a progression ladder ensures quality control and prevents "Mentor Inflation."</p>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="hover:shadow-2xl transition-all duration-300 border-border bg-card">
                               <CardContent className="pt-8 space-y-4">
                                   <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4 font-bold border border-border">
                                      L1
                                   </div>
                                   <div className="min-h-[60px]">
                                      <h4 className="font-bold text-lg uppercase tracking-tighter">Apprentice (Viewer)</h4>
                                   </div>
                                   <ul className="text-sm text-muted-foreground space-y-3 pt-2 border-t">
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50"/><span><strong>Entry:</strong> Free Email Sign-up.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50"/><span><strong>Access:</strong> None (Sandbox Demo).</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50"/><span><strong>Role:</strong> Browse forums, webinars.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50"/><span><strong>Goal:</strong> Convert to member.</span></li>
                                   </ul>
                               </CardContent>
                            </Card>
                            
                            <Card className="hover:shadow-2xl transition-all duration-300 border-blue-200 bg-blue-50/10">
                               <CardContent className="pt-8 space-y-4">
                                   <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 mb-4 font-bold border border-blue-200">
                                      L2
                                   </div>
                                   <div className="min-h-[60px]">
                                      <h4 className="font-bold text-lg uppercase tracking-tighter text-blue-900 dark:text-blue-400">Member</h4>
                                   </div>
                                   <ul className="text-sm text-muted-foreground space-y-3 pt-2 border-t border-blue-200/50">
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-blue-400"/><span><strong>Entry:</strong> Paid Subscription & verified profile.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-blue-400"/><span><strong>Access:</strong> Full Ogeemo Suite via SSO.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-blue-400"/><span><strong>Role:</strong> Post in forums, join workgroups, earn badges.</span></li>
                                   </ul>
                               </CardContent>
                            </Card>
                            
                            <Card className="hover:shadow-2xl transition-all duration-300 border-primary/30 bg-primary/5">
                               <CardContent className="pt-8 space-y-4">
                                   <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-4 font-bold border border-primary/30">
                                      L3
                                   </div>
                                   <div className="min-h-[60px]">
                                      <h4 className="font-bold text-lg uppercase tracking-tighter text-primary">Mentor Apprentice</h4>
                                   </div>
                                   <ul className="text-sm text-muted-foreground space-y-3 pt-2 border-t border-primary/20">
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-primary/50"/><span><strong>Entry:</strong> 60+ days active, pass Standards Class.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-primary/50"/><span><strong>Access:</strong> Full + Beta tools.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-primary/50"/><span><strong>Role:</strong> Onboard members, answer Qs, earn rep.</span></li>
                                   </ul>
                               </CardContent>
                            </Card>
                            
                            <Card className="hover:shadow-2xl transition-all duration-300 bg-slate-900 text-white border-slate-700">
                               <CardContent className="pt-8 space-y-4">
                                   <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 mb-4 border border-yellow-500/30 font-bold">
                                      L4
                                   </div>
                                   <div className="min-h-[60px]">
                                      <h4 className="font-bold text-lg uppercase tracking-tighter text-yellow-400">Certified Mentor</h4>
                                   </div>
                                   <ul className="text-sm text-slate-300 space-y-3 pt-2 border-t border-slate-700">
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-yellow-500/50"/><span><strong>Entry:</strong> Peer-reviewed portfolio + 4.7/5 rating.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-yellow-500/50"/><span><strong>Access:</strong> Full Access.</span></li>
                                       <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-yellow-500/50"/><span><strong>Role:</strong> Paid workshops, 1-on-1 consulting.</span></li>
                                   </ul>
                               </CardContent>
                            </Card>
                         </div>
                         <div className="text-center text-sm text-muted-foreground italic pt-4 max-w-2xl mx-auto">
                            Note: We will institute a "Pro" Tier—where highly vetted CPAs, Lawyers, and Bookkeepers can skip the line via manual resume review.
                         </div>
                     </div>

                     <div className="bg-primary/5 p-8 lg:p-12 rounded-3xl border border-primary/10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Rocket className="h-48 w-48 text-primary" />
                        </div>
                        <div className="flex items-center gap-4 mb-10 relative z-10">
                            <div className="bg-card p-3 rounded-xl shadow-sm"><Rocket className="h-8 w-8 text-primary" /></div>
                            <h3 className="text-3xl font-bold font-headline">Implementation Plan</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-primary" /><h4 className="font-bold text-xl uppercase tracking-tighter">Phase 1: The Gateway</h4></div>
                                <p className="text-primary font-bold text-sm bg-card inline-block px-3 py-1 rounded w-fit shadow-sm">Core Objective: Build the SSO engine.</p>
                                <p className="text-muted-foreground leading-relaxed text-sm">Establish the front-end community app. The login used here becomes the central key. If a profile is flagged, deleted, or unpaid, Software access instantly locks down over API.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3"><HeartHandshake className="h-6 w-6 text-primary" /><h4 className="font-bold text-xl uppercase tracking-tighter">Phase 2: Software Hooks</h4></div>
                                <p className="text-primary font-bold text-sm bg-card inline-block px-3 py-1 rounded w-fit shadow-sm">Core Objective: Pull users back into community.</p>
                                <p className="text-muted-foreground leading-relaxed text-sm">Build a "Template Library" unlocked via rank. Embed an "Ask a Certified Mentor" SOS button globally inside the Software, redirecting to the Marketplace.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3"><Zap className="h-6 w-6 text-primary" /><h4 className="font-bold text-xl uppercase tracking-tighter">Phase 3: Mentor Marketplace</h4></div>
                                <p className="text-primary font-bold text-sm bg-card inline-block px-3 py-1 rounded w-fit shadow-sm">Core Objective: Launch the monetization engine.</p>
                                <p className="text-muted-foreground leading-relaxed text-sm">Deploy the directory where Members can hire Certified Mentors. Mentors charge via the App. Ogeemo handles transactions and takes a 10-20% platform commission.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3"><Crown className="h-6 w-6 text-primary" /><h4 className="font-bold text-xl uppercase tracking-tighter">Phase 4: "Shadow Tier" Strategy</h4></div>
                                <p className="text-primary font-bold text-sm bg-card inline-block px-3 py-1 rounded w-fit shadow-sm">Core Objective: Permanent legacy statuses.</p>
                                <p className="text-muted-foreground leading-relaxed text-sm">Mint a permanent "Founders" badge to the first 500 paid Members. This injects pure FOMO into early campaigns. These users become loud advocates, driven by status.</p>
                            </div>
                        </div>
                     </div>

                   </div>
               </section>
            </TabsContent>
          </Tabs>
        </div>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
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
