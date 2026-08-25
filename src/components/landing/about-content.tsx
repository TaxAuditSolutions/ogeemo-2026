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
                                    Built for operators, not investors
                                </Badge>
                                <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold font-orbitron text-primary tracking-tighter leading-none mb-4 uppercase">
                                    OGEEMO
                                </h1>

                                <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                                    One operating system. Zero chaos.
                                </p>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                    Ogeemo was built for founders, consultants, and operators who need one system for work, visibility, and growth without the software clutter.
                                </p>

                                <p className="text-lg font-medium italic text-primary/70 max-w-3xl leading-relaxed">
                                    "We built a digital operating layer for the people doing the real work."
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                                    <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                        <Link href="/pricing">Join the Movement</Link>
                                    </Button>
                                    <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg">
                                        <Link href="/solutions">Explore Solutions</Link>
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
                            <TabsList className="grid w-full max-w-2xl grid-cols-3 h-14 bg-card/80 backdrop-blur-md shadow-xl border border-primary/10 rounded-full p-1">
                                <TabsTrigger value="story" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Our Story</TabsTrigger>
                                <TabsTrigger value="system" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">How It Works</TabsTrigger>
                                <TabsTrigger value="membership" className="text-base font-bold rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Membership</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="story" className="mt-0 space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-500">

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
                                                We realized that we were spending too much time managing tools instead of running businesses. We built Ogeemo to be one operating system for the people doing the work: founders, consultants, accountants, and operators who need clarity, not complexity.
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

                            <section className="py-24 text-foreground">
                                <div className="container px-4 max-w-5xl mx-auto space-y-16">
                                    <div className="text-center space-y-4">
                                        <h2 className="text-3xl md:text-5xl font-bold font-headline text-foreground uppercase">The Ogeemo Difference</h2>
                                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic">"We prioritize community and clarity over corporate friction."</p>
                                    </div>

                                    <div id="ethics" className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <Card className="text-center p-8 border-primary/10 bg-card shadow-xl hover:shadow-2xl transition-all">
                                            <CardContent className="pt-6 space-y-4">
                                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                                    <Zap className="h-6 w-6" />
                                                </div>
                                                <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">One Platform</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">Everything lives in one place so your team can move from client work to operations without the tool sprawl.</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center p-8 border-primary/10 bg-card shadow-xl hover:shadow-2xl transition-all">
                                            <CardContent className="pt-6 space-y-4">
                                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                                    <Scale className="h-6 w-6" />
                                                </div>
                                                <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">Transparent Pricing</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">No feature tricks, no surprise upsells, and no bait-and-switch pricing. We keep the model honest.</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center p-8 border-primary/10 bg-card shadow-xl hover:shadow-2xl transition-all">
                                            <CardContent className="pt-6 space-y-4">
                                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                                    <HeartHandshake className="h-6 w-6" />
                                                </div>
                                                <h3 className="font-bold text-xl uppercase tracking-tighter font-headline">Human by Design</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">We treat members as partners and operators as people, not as a revenue funnel to optimize.</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </section>

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
                                                You aren't just another subscriber. You are a member of a growing network building better systems for the modern business.
                                            </p>
                                            <p className="text-lg text-muted-foreground leading-relaxed">
                                                Together, we are building a more transparent, more efficient, and more human way to run a business.
                                            </p>
                                            <Button asChild variant="secondary" className="font-bold">
                                                <Link href="/pricing">See Membership Options <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                        </TabsContent>

                        <TabsContent value="system" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="py-20 bg-card text-card-foreground rounded-3xl shadow-xl border-2 border-primary/5">
                                <div className="container px-4 lg:px-12 max-w-6xl mx-auto space-y-12">
                                    <div className="text-center space-y-6">
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-transparent py-1.5 px-6 font-bold tracking-widest uppercase">HOW OGEEMO WORKS</Badge>
                                        <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">Clear operations. Better decisions. More time back.</h2>
                                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                                            Ogeemo brings your client work, operations, and accountability into one place so your business can run without the chaos of disconnected tools.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <Card className="border border-primary/10 bg-background shadow-lg h-full">
                                            <CardHeader>
                                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                                    <Target className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-2xl font-bold font-headline">1. Capture</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-muted-foreground leading-relaxed">Track leads, clients, projects, and communications in one operational hub.</p>
                                                <p className="text-sm font-medium text-primary">No more hidden work and no more scattered updates.</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="border border-primary/10 bg-background shadow-lg h-full">
                                            <CardHeader>
                                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                                    <BrainCircuit className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-2xl font-bold font-headline">2. Organize</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-muted-foreground leading-relaxed">Turn client activity into clean workflows, priorities, and accountability.</p>
                                                <p className="text-sm font-medium text-primary">Every task, note, and document has a place and a purpose.</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="border border-primary/10 bg-background shadow-lg h-full">
                                            <CardHeader>
                                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                                                    <Rocket className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-2xl font-bold font-headline">3. Grow</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-muted-foreground leading-relaxed">Use the data to forecast, improve delivery, and scale without sacrificing control.</p>
                                                <p className="text-sm font-medium text-primary">The system helps you make smarter choices with less operational drag.</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 text-center">
                                        <h3 className="text-2xl md:text-3xl font-bold font-headline text-foreground mb-4">The result: a business that feels more focused and less fragile.</h3>
                                        <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                                            Whether you are running a solo operation, a growing consultancy, or a multi-service firm, Ogeemo gives you the structure to work with confidence and operate with clarity.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </TabsContent>

                        <TabsContent value="membership" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="py-20 bg-card text-card-foreground rounded-3xl shadow-xl border-2 border-primary/5">
                                <div className="container px-4 lg:px-12 max-w-6xl mx-auto">
                                    <div className="text-center space-y-6 mb-12">
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-transparent py-1.5 px-6 font-bold tracking-widest uppercase">MEMBERSHIP</Badge>
                                        <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">Built for the people running real work.</h2>
                                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                                            Membership is simple: one access model, one price point, and one promise — the full Ogeemo engine is available to the people who need it most.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <Card className="border border-primary/10 bg-background shadow-lg h-full">
                                            <CardHeader>
                                                <Globe className="h-10 w-10 text-primary mb-4" />
                                                <CardTitle className="text-2xl font-bold font-headline">Members</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                                                <p>Founders, operators, consultants, and small business owners who want a smarter system without software overhead.</p>
                                                <p className="font-medium text-primary">Full access to the platform, with clear pricing and no hidden gatekeeping.</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="border border-primary/10 bg-background shadow-lg h-full">
                                            <CardHeader>
                                                <Users className="h-10 w-10 text-primary mb-4" />
                                                <CardTitle className="text-2xl font-bold font-headline">Partners</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                                                <p>Organizations that want to build with Ogeemo, amplify the mission, or support the ecosystem with aligned programs.</p>
                                                <p className="font-medium text-primary">Explore collaboration pathways through the partner program.</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="border border-primary/10 bg-background shadow-lg h-full">
                                            <CardHeader>
                                                <GraduationCap className="h-10 w-10 text-primary mb-4" />
                                                <CardTitle className="text-2xl font-bold font-headline">Mentors</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                                                <p>Trusted experts who help members operationalize better systems and turn complexity into clean execution.</p>
                                                <p className="font-medium text-primary">Support the community while building a stronger, more resilient network.</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="mt-10 text-center">
                                        <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                            <Link href="/pricing">Review Pricing <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                        </Button>
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
