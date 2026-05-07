'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { 
    CheckCircle2, 
    AlertTriangle, 
    Network, 
    ShieldCheck, 
    Quote, 
    ArrowRight,
    X,
    Zap,
    BrainCircuit,
    Briefcase
} from 'lucide-react';

export default function SarahStoryPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-muted/30 border-b relative overflow-hidden">
          <div className="container px-4 max-w-5xl mx-auto relative z-10">
            <div className="flex flex-col items-center text-center mb-16 space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-1.5 rounded-full uppercase tracking-widest text-[11px] font-bold">
                User Spotlight
              </Badge>
              <h1 className="text-5xl md:text-8xl font-bold font-headline text-primary tracking-tighter leading-none">
                The Story of Sarah
              </h1>
              <p className="text-2xl md:text-3xl text-muted-foreground font-medium tracking-tight">
                From Fragmentation to the "Spider Web"
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
              <div className="lg:col-span-2 space-y-8">
                <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white ring-1 ring-black/5 transform -rotate-1 hover:rotate-0 transition-transform duration-700">
                  <ImagePlaceholder id="story-sarah" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
                    <p className="font-bold text-2xl tracking-tight">Sarah Jenkins</p>
                    <p className="text-sm opacity-90 uppercase tracking-widest font-medium">Virtual Business Partner & CEO</p>
                  </div>
                </div>
                <Card className="bg-primary text-primary-foreground border-none shadow-xl rounded-[2rem] overflow-hidden relative">
                  <CardContent className="p-8">
                    <Quote className="h-12 w-12 mb-4 opacity-20 absolute -top-2 -left-2" />
                    <p className="text-xl italic leading-relaxed relative z-10 font-serif">
                      "I realized I was app-juggling. My tools didn't talk to each other. I was multi-tasking myself into a state of assumptive liability."
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3 space-y-12">
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight font-headline">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    The Office Grind and the Virtual Leap
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Sarah was done with the commute. When her agency ordered her back to the cubicle, she made a choice: she wouldn’t just be an Administrative Assistant; she would be a Virtual Business Partner. She had the skills, the drive, and the ambition to build something of her own.
                  </p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight font-headline">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-amber-500" />
                    </div>
                    The "App-Juggling" Trap
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Sarah started where everyone does: Google Workspace. It felt safe. She added Zoom for her VOIP lines, a great webcam for her brand, and a headset for clarity. She was "ready."
                  </p>
                  <div className="bg-muted p-8 rounded-[2rem] space-y-6 border border-primary/5 shadow-inner">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">The administrative nightmare:</p>
                    <ul className="space-y-4">
                      <li className="flex gap-4 text-base">
                        <div className="w-6 h-6 bg-destructive/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                            <X className="h-4 w-4 text-destructive" />
                        </div>
                        <span><strong>Gmail was a goldmine of billable info,</strong> but logging that time was a second job she kept forgetting to do.</span>
                      </li>
                      <li className="flex gap-4 text-base">
                        <div className="w-6 h-6 bg-destructive/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                            <X className="h-4 w-4 text-destructive" />
                        </div>
                        <span><strong>Google Calendar was a list of "hopes,"</strong> not a record of "done."</span>
                      </li>
                      <li className="flex gap-4 text-base">
                        <div className="w-6 h-6 bg-destructive/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                            <X className="h-4 w-4 text-destructive" />
                        </div>
                        <span><strong>Google Drive became a digital junk drawer</strong> where client files went to hide.</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-muted-foreground italic text-lg leading-relaxed border-l-4 border-primary/20 pl-6 py-2">
                    Sarah realized she was multi-tasking herself into a state of "Assumptive Liability"—guessing at her time, her billing, and her future.
                  </p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight font-headline">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Network className="h-6 w-6 text-primary" />
                    </div>
                    Discovering the Ogeemo "Spider Web"
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Then, Sarah found Ogeemo. It wasn’t another app to learn; it was a SaaS wrapper that integrated natively with her Google Workspace. The moment Sarah logged in, the fragmentation vanished. Ogeemo introduced her to the **"Spider Web" Architecture**:
                  </p>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex gap-6 items-start p-6 bg-card rounded-2xl border border-primary/5 hover:border-primary/20 transition-all shadow-sm">
                        <div className="p-3 bg-primary/10 rounded-xl shrink-0"><Zap className="h-6 w-6 text-primary"/></div>
                        <div>
                            <h4 className="font-bold text-xl mb-2">The Master Action Chip</h4>
                            <p className="text-muted-foreground leading-relaxed">From one central header, Sarah could pivot her entire business view. By managing her chips, she organized Ogeemo to suit her exact needs, reducing clutter and saving time. She gained absolute control over the elements of her spider web.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-start p-6 bg-card rounded-2xl border border-primary/5 hover:border-primary/20 transition-all shadow-sm">
                        <div className="p-3 bg-primary/10 rounded-xl shrink-0"><BrainCircuit className="h-6 w-6 text-primary"/></div>
                        <div>
                            <h4 className="font-bold text-xl mb-2">The Command Centre (The Calendar)</h4>
                            <p className="text-muted-foreground leading-relaxed">For Sarah, the Ogeemo Calendar became the brain of her business. When she dragged an Idea into a time slot, Ogeemo’s "Action-to-Protocol Bridge" did the heavy lifting. It wasn't just an "event" anymore; it was a billable project that automatically updated her ledgers.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-start p-6 bg-card rounded-2xl border border-primary/5 hover:border-primary/20 transition-all shadow-sm">
                        <div className="p-3 bg-primary/10 rounded-xl shrink-0"><Briefcase className="h-6 w-6 text-primary"/></div>
                        <div>
                            <h4 className="font-bold text-xl mb-2">The CRM & File Manager</h4>
                            <p className="text-muted-foreground leading-relaxed">No more hunting through G-Drive. Every prospect, every file, and every task was a "Node" on her web, connected and instantly accessible.</p>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight font-headline">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    BKS: The "Sleep Well at Night" Factor
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    The biggest transformation was the BKS (Bookkeeping Kept Simple) system. Sarah used to dread the "B-word" (Bookkeeping). With Ogeemo, she learned TOM—The Ogeemo Method.
                  </p>
                  <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <p className="text-lg leading-relaxed relative z-10">
                        She realized that by following the intuitive "Info Icons" and the 3-dot discovery menus, she was building a <strong>Black Box of Evidence</strong>. Ogeemo's "Audit-Ready" mandate meant every expense was linked to a source document. If a client ever questioned her, she didn't have to "find" the proof. She just had to click.
                    </p>
                    <ShieldCheck className="absolute -bottom-6 -right-6 h-32 w-32 text-white/5 rotate-12" />
                  </div>
                </div>

                <div className="pt-12 border-t border-primary/10 space-y-8">
                  <h3 className="text-4xl font-bold text-primary tracking-tight font-headline">A Business, Not Just a Job</h3>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Sarah is no longer an administrative assistant "grinding" from home. She is a CEO. Because Ogeemo handles the "Administrative Gap" in the background, Sarah spends her time doing what she loves: helping her clients grow.
                  </p>
                  <Button asChild size="lg" className="h-16 px-10 text-xl font-bold shadow-xl hover:scale-105 transition-transform">
                    <Link href="/register">Join Sarah in the Ogeemo World <ArrowRight className="ml-2 h-6 w-6 tracking-normal"/></Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative background effects */}
          <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
