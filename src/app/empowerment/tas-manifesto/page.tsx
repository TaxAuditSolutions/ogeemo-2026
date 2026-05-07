'use client';

import React from 'react';
import Link from 'next/link';
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    ShieldCheck, 
    Zap, 
    Scale, 
    ArrowRight, 
    CheckCircle2, 
    Quote,
    Flame,
    Lock,
    Globe,
    Cpu,
    ArrowLeft
} from 'lucide-react';

export default function TASManifestoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-40 overflow-hidden border-b border-white/10">
          <div className="container px-4 max-w-4xl mx-auto relative z-10 text-center space-y-8">
            <Link href="/empowerment" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-bold uppercase tracking-widest mb-8">
                <ArrowLeft className="h-4 w-4" /> Back to Empowerment
            </Link>
            <Badge className="bg-primary/20 text-primary border-primary/30 px-6 py-2 rounded-full uppercase tracking-widest text-[11px] font-bold">
              The Founding Document
            </Badge>
            <h1 className="text-5xl md:text-8xl font-bold font-headline text-white tracking-tighter leading-tight">
              The TAS <br /> <span className="text-primary">Manifesto.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
              This is the blueprint of the engine. Built in the trenches of Tax Audit Solutions to run our own company, now shared with the collective.
            </p>
          </div>

          {/* Background effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
        </section>

        {/* The Core Principles */}
        <section className="py-24 container px-4 max-w-4xl mx-auto">
            <div className="space-y-32">
                {/* Principle 1 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
                    <div className="md:col-span-2 space-y-4">
                        <div className="text-primary font-mono text-sm tracking-widest font-bold">01</div>
                        <h2 className="text-3xl font-bold font-headline text-white uppercase tracking-tight">Fidelity Over Features</h2>
                    </div>
                    <div className="md:col-span-3 space-y-6">
                        <p className="text-lg text-slate-400 leading-relaxed">
                            We don't build "bells and whistles" for marketing's sake. Every node in Ogeemo is built to handle the highest standard of audit-ready compliance. If a data point doesn't have a source, it doesn't belong in the ledger. 
                        </p>
                        <p className="text-slate-500 italic">
                            High-fidelity data is the only shield against administrative assumptions.
                        </p>
                    </div>
                </div>

                {/* Principle 2 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
                    <div className="md:col-span-2 space-y-4">
                        <div className="text-primary font-mono text-sm tracking-widest font-bold">02</div>
                        <h2 className="text-3xl font-bold font-headline text-white uppercase tracking-tight">The 40% Rule</h2>
                    </div>
                    <div className="md:col-span-3 space-y-6">
                        <p className="text-lg text-slate-400 leading-relaxed">
                            Administrative waste is the silent killer of independent professionals. Our goal is to eliminate 40% of the friction associated with running a business. No double-entry, no menu hunting, and zero "admin gaps" between your work and your billing.
                        </p>
                    </div>
                </div>

                {/* Principle 3 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
                    <div className="md:col-span-2 space-y-4">
                        <div className="text-primary font-mono text-sm tracking-widest font-bold">03</div>
                        <h2 className="text-3xl font-bold font-headline text-white uppercase tracking-tight">Audit-Ready 365</h2>
                    </div>
                    <div className="md:col-span-3 space-y-6">
                        <p className="text-lg text-slate-400 leading-relaxed">
                            Compliance isn't a year-end event; it's a daily discipline. The Ogeemo Spider Web ensures that your business is defensively documented in real-time. We don't just track time; we build the "Black Box of Evidence."
                        </p>
                    </div>
                </div>

                {/* Principle 4 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
                    <div className="md:col-span-2 space-y-4">
                        <div className="text-primary font-mono text-sm tracking-widest font-bold">04</div>
                        <h2 className="text-3xl font-bold font-headline text-white uppercase tracking-tight">Zero Gating, One Circle</h2>
                    </div>
                    <div className="md:col-span-3 space-y-6">
                        <p className="text-lg text-slate-400 leading-relaxed">
                            We treat our members as partners, not targets. There are no "Pro" tiers for the best tools. If we built it, you get it. Your membership price is locked for life, ensuring that as you grow, Ogeemo stays your most stable operational foundation.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* The TAS Commitment Quote */}
        <section className="py-32 bg-primary/5 border-y border-white/5">
            <div className="container px-4 max-w-3xl mx-auto text-center space-y-12">
                <div className="relative">
                    <Quote className="h-24 w-24 text-primary/10 absolute -top-12 -left-12 -z-10" />
                    <p className="text-3xl md:text-5xl font-bold font-headline text-white leading-tight italic">
                        "If it wasn't good enough to run Tax Audit Solutions, it's not good enough to be in the Ogeemo Suite."
                    </p>
                </div>
                <div className="space-y-2">
                    <p className="text-primary font-bold uppercase tracking-widest">The Lead Team</p>
                    <p className="text-slate-500 text-sm">Dan White • Nick Illiopoulos • Julie White</p>
                </div>
            </div>
        </section>

        {/* The Action Plan Section */}
        <section className="py-24 container px-4 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="bg-slate-900 border-white/10 p-8 space-y-4 group hover:border-primary/50 transition-all">
                    <Lock className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-bold text-white">Price Lock</h3>
                    <p className="text-sm text-slate-400">Your membership fee is your contribution to the collective. We lock it forever as a thank you for your early trust.</p>
                </Card>
                <Card className="bg-slate-900 border-white/10 p-8 space-y-4 group hover:border-primary/50 transition-all">
                    <Cpu className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-bold text-white">Open Roadmap</h3>
                    <p className="text-sm text-slate-400">Members vote on future modules. We build the tools the community actually needs, not what a sales team dictates.</p>
                </Card>
                <Card className="bg-slate-900 border-white/10 p-8 space-y-4 group hover:border-primary/50 transition-all">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-bold text-white">Audit Shield</h3>
                    <p className="text-sm text-slate-400">Every ledger entry is cryptographically linked to its source document, creating a defensible record for life.</p>
                </Card>
            </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 text-center">
            <div className="container px-4 space-y-12">
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-white">Ready to join the movement?</h2>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <Button asChild size="lg" className="h-16 px-12 text-xl font-bold shadow-2xl hover:scale-105 transition-transform">
                        <Link href="/register">Join the Collective</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="h-16 px-12 text-xl font-bold border-white/20 hover:bg-white/10">
                        <Link href="/empowerment">Return to Hub</Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
