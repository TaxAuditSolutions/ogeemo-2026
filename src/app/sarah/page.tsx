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
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1 bg-white">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-muted/30 border-b">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center mb-16 space-y-4">
              <Badge variant="outline" className="text-primary border-primary px-4 py-1">User Spotlight</Badge>
              <h1 className="text-5xl md:text-7xl font-bold font-headline text-primary tracking-tighter">The Story of Sarah</h1>
              <p className="text-2xl text-muted-foreground font-medium">From Fragmentation to the "Spider Web"</p>
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
                            <p className="text-sm text-muted-foreground">From one central header, Sarah could pivot her entire business view. By managing her chips, she organized Ogeemo to suit her exact needs, reducing clutter and saving time. She gained absolute control over the elements of her spider web.</p>
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
                    Sarah is no longer an administrative assistant "grinding" from home. She is a CEO. Because Ogeemo handles the "Administrative Gap" in the background, Sarah spends her time doing what she loves: helping her clients grow.
                  </p>
                  <Button asChild size="lg" className="h-12 px-8">
                    <Link href="/register">Join Sarah in the Ogeemo World <ArrowRight className="ml-2 h-4 w-4"/></Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
