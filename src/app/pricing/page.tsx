
'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
    CheckCircle2, 
    ShieldCheck,
    Users,
    Vote,
    Unlock,
    Gift,
    Scale,
    Check,
    Zap,
    ArrowRight
} from 'lucide-react';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { MEMBERSHIP_FEE } from '@/lib/constants';

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1 text-black">
        {/* The Member's Manifesto Hero */}
        <section className="py-20 md:py-32 bg-slate-950 text-white border-b border-white/10 relative overflow-hidden">
          <div className="container px-4 text-center max-w-4xl mx-auto space-y-8 relative z-10">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              The Ogeemo Member's Manifesto
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter leading-tight text-white">
              One Price. <br />
              <span className="text-primary">One Community.</span>
            </h1>
            
            <div className="prose prose-invert max-w-2xl mx-auto text-slate-300 text-lg leading-relaxed text-center space-y-6">
                <p>
                    Software shouldn't be a hostage situation. We are moving to a single-tier subscription model that reflects our commitment to the collective success of our members.
                </p>
                <p className="text-white font-bold text-2xl italic font-headline">
                    "Locked for life. No tiers. No traps."
                </p>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="h-14 px-10 text-xl font-bold shadow-xl">
                    <Link href="/register">Join the Movement</Link>
                </Button>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <ImagePlaceholder id="pitch-strategy" className="object-cover" />
          </div>
        </section>

        {/* Single Tier Bold Card */}
        <section className="py-24 bg-slate-50 border-y text-black">
          <div className="container px-4">
            <Card className="max-w-xl mx-auto border-2 border-primary shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform">
                <CardHeader className="bg-primary text-primary-foreground text-center py-12">
                    <h2 className="text-3xl font-headline uppercase tracking-tight">Circle Membership</h2>
                    <div className="mt-4 flex flex-col items-center">
                        <div className="flex items-baseline gap-1">
                            <span className="text-6xl font-bold font-mono">${MEMBERSHIP_FEE}.00</span>
                            <span className="text-primary-foreground/80">/month (Total)</span>
                        </div>
                        <p className="mt-4 font-bold uppercase tracking-[0.2em] text-sm opacity-90">Locked for life • No Traps</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-10 space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg uppercase tracking-widest text-primary flex items-center gap-2">
                            <Zap className="h-5 w-5" /> The Full Ogeemo Suite
                        </h3>
                        <ul className="grid grid-cols-1 gap-3">
                            {[
                                "BKS Ledger & Audit Shield",
                                "Neural AI Ingestion Terminal",
                                "Integrated Payroll & Tax Remittance",
                                "GDrive Dual-Mirror Management",
                                "Project Forge & Live Time Tracking",
                                "Unified Relationship CRM",
                                "Direct Access to the Mentor Team",
                                "Voting Power on the Roadmap"
                            ].map((item) => (
                                <li key={item} className="flex gap-3 text-sm">
                                    <Check className="h-5 w-5 text-primary shrink-0" />
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <Separator />
                    <div className="bg-muted/30 p-4 rounded-xl border border-dashed text-xs text-muted-foreground italic">
                        "Every member gets the full engine. We scale with your impact, not by nickel-and-diming your features."
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t p-8">
                    <Button asChild className="w-full h-14 text-xl font-bold">
                        <Link href="/register">Start Your 30-Day Free Trial</Link>
                    </Button>
                </CardFooter>
            </Card>
          </div>
        </section>

        {/* Anti-Greed Promises */}
        <section className="py-24 bg-white text-black">
            <div className="container px-4 max-w-5xl mx-auto space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Scale className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline uppercase tracking-tight">The Ethical Exit</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Paradoxically, the easier it is to leave, the more likely people are to stay. If you ever decide Ogeemo isn't for you, your data goes with you. No hidden fees to export your own records.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline uppercase tracking-tight">Mentor Accountability</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We don't hide behind bots. Our Mentors are real professionals committed to your growth. If you ever feel misled, our mediation protocol ensures Dan White and the lead team resolve it personally.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container px-4 space-y-8">
            <h2 className="text-3xl md:text-6xl font-bold font-headline tracking-tighter">Ready to join the circle?</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">One price. Absolute power. Zero surprises.</p>
            <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold">
                <Link href="/register">Join the Ogeemo Circle</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
