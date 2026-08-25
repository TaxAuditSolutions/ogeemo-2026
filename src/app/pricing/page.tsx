'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { 
    Check,
    Zap,
    Scale,
    ShieldCheck,
    ArrowRight,
    Users,
    Handshake,
    GraduationCap
} from 'lucide-react';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { MEMBERSHIP_FEE } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1 text-foreground">
        {/* The Member's Manifesto Hero */}
        <section className="py-20 md:py-32 bg-slate-950 text-white border-b border-white/10 relative overflow-hidden">
          <div className="container px-4 mx-auto text-center max-w-4xl space-y-8 relative z-10">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              The Ogeemo Circle
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter leading-tight text-white">
              One price. <br />
              <span className="text-primary">One platform. Total clarity.</span>
            </h1>
            
            <div className="prose prose-invert max-w-2xl mx-auto text-slate-300 text-lg leading-relaxed text-center space-y-6">
                <p>
                    Ogeemo is built for members, partners, and mentors who want one operating system without hidden fees, feature traps, or artificial tier walls.
                </p>
                <p className="text-white font-bold text-2xl italic font-headline">
                    "Clear pricing. Full access. No nonsense."
                </p>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="h-14 px-10 text-xl font-bold shadow-xl">
                    <Link href="/register">Join the Circle</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-10 text-xl font-bold bg-transparent border-white text-white hover:bg-white/10">
                    <Link href="/about#ethics">Compare Our Ethics</Link>
                </Button>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <ImagePlaceholder id="pitch-strategy" className="object-cover" />
          </div>
        </section>

        {/* Membership Pricing Card */}
        <section className="py-24 bg-muted/30 border-y">
          <div className="container px-4 mx-auto">
            <Card className="max-w-2xl mx-auto border-2 border-primary shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform bg-card text-card-foreground">
                <CardHeader className="bg-primary text-primary-foreground text-center py-12">
                    <h2 className="text-3xl font-headline uppercase tracking-tight">Circle Membership</h2>
                    <div className="mt-4 flex flex-col items-center">
                        <div className="flex items-baseline gap-1">
                            <span className="text-6xl font-bold font-mono">${MEMBERSHIP_FEE}.00</span>
                            <span className="text-primary-foreground/80">/month total</span>
                        </div>
                        <div className="mt-4 space-y-1">
                            <p className="font-bold uppercase tracking-[0.2em] text-sm opacity-90">Locked for life • Full access</p>
                            <p className="text-xs font-medium opacity-80 italic">Includes 5 seats. Additional seats are $5.00 each per month.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-10 space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg uppercase tracking-widest text-primary flex items-center gap-2">
                            <Zap className="h-5 w-5" /> The Full Ogeemo Suite
                        </h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                            {[
                                "BKS Ledger & Audit Shield",
                                "Neural AI Ingestion Terminal",
                                "Integrated Payroll & Remittances",
                                "GDrive Dual-Mirror Management",
                                "Project Forge & Kanban Boards",
                                "Live Time Tracking Hub",
                                "Unified Relationship CRM & Leads",
                                "Inventory Manager & POS",
                                "Capital Asset Management (CCA)",
                                "Advanced AI Search & Dispatch",
                                "Hytexercise Wellness Manager",
                                "Data Portability & Secure Backups",
                                "High-Fidelity Invoicing & Reports",
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
                    <div className="bg-muted/50 p-4 rounded-xl border border-dashed text-xs text-muted-foreground italic">
                        "Every member gets the full engine. We scale with your impact, not by nickel-and-diming your features."
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-8">
                    <Button asChild className="w-full h-14 text-xl font-bold">
                        <Link href="/register">Start Your 30-Day Free Trial</Link>
                    </Button>
                </CardFooter>
            </Card>
          </div>
        </section>

        {/* Members / Partners / Mentors */}
        <section className="py-24">
            <div className="container px-4 mx-auto max-w-6xl space-y-12">
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                        Members & Partners
                    </Badge>
                    <h3 className="text-3xl md:text-5xl font-bold font-headline uppercase tracking-tight">One community. Three distinct roles.</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Ogeemo is not a traditional software product with locked tiers. It is a working ecosystem where members, partners, and mentors create mutual value and share in the result.
                    </p>
                </div>

                <Tabs defaultValue="members" className="w-full">
                    <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-3 h-14 bg-card shadow-xl border border-primary/10 rounded-full p-1">
                        <TabsTrigger value="members" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Members</TabsTrigger>
                        <TabsTrigger value="partners" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Partners</TabsTrigger>
                        <TabsTrigger value="mentors" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Mentors</TabsTrigger>
                    </TabsList>

                    <TabsContent value="members" className="mt-8">
                        <Card className="border-2 border-primary/10 shadow-xl bg-card">
                            <CardContent className="p-8 md:p-10 grid md:grid-cols-[auto_1fr] gap-6 items-start">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Users className="h-7 w-7" />
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-2xl font-bold font-headline text-primary">Members get the full platform.</h4>
                                    <p className="text-muted-foreground leading-relaxed text-lg">
                                        Your membership gives you access to the complete Ogeemo stack without hidden feature gates, upsells, or artificial limits. You are part of the operating system, not just another customer in a sales funnel.
                                    </p>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Full-suite access for your business or organization</span></li>
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Shared roadmap voting and direct community influence</span></li>
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Transparent pricing and portable data if you ever leave</span></li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="partners" className="mt-8">
                        <Card className="border-2 border-primary/10 shadow-xl bg-card">
                            <CardContent className="p-8 md:p-10 grid md:grid-cols-[auto_1fr] gap-6 items-start">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Handshake className="h-7 w-7" />
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-2xl font-bold font-headline text-primary">Partners expand the ecosystem.</h4>
                                    <p className="text-muted-foreground leading-relaxed text-lg">
                                        We build with partners, not at their expense. Strategic alliances, service collaborations, and shared growth opportunities are part of the Ogeemo model, not a separate premium layer hidden behind a sales pitch.
                                    </p>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Referral, collaboration, and co-selling opportunities</span></li>
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Shared operational leverage through the common platform</span></li>
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Longer-term alignment instead of transactional upsells</span></li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="mentors" className="mt-8">
                        <Card className="border-2 border-primary/10 shadow-xl bg-card">
                            <CardContent className="p-8 md:p-10 grid md:grid-cols-[auto_1fr] gap-6 items-start">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <GraduationCap className="h-7 w-7" />
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-2xl font-bold font-headline text-primary">Mentors help members succeed.</h4>
                                    <p className="text-muted-foreground leading-relaxed text-lg">
                                        Our mentors are real professionals committed to your growth. They are here to advise, challenge, and accelerate your plans without the fluff, the nonsense, or the sales pressure.
                                    </p>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Direct access to experienced operators and advisers</span></li>
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Real accountability and professional standards</span></li>
                                        <li className="flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-1" /><span>Support that reinforces the collective, not a paid gate</span></li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </section>

        {/* Anti-Greed Promises */}
        <section className="py-24">
            <div className="container px-4 mx-auto max-w-5xl space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Scale className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline uppercase tracking-tight">The Ethical Exit</h3>
                        <p className="text-muted-foreground leading-relaxed text-lg">
                            Paradoxically, the easier it is to leave, the more likely people are to stay. If you ever decide Ogeemo isn't for you, your data goes with you. No hidden fees to export your own records.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline uppercase tracking-tight">Mentor Accountability</h3>
                        <p className="text-muted-foreground leading-relaxed text-lg">
                            We don't hide behind bots. Our mentors are real professionals committed to your growth. If you ever feel misled, our mediation protocol ensures the lead team resolves it personally.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container px-4 mx-auto space-y-8">
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
