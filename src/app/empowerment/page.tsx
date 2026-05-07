'use client';

import React from 'react';
import Link from 'next/link';
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { 
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { 
    ShieldCheck, 
    Zap, 
    Layers, 
    BarChart3, 
    ArrowRight, 
    CheckCircle2, 
    Search, 
    Clock, 
    Quote,
    GraduationCap,
    Rocket,
    BookOpen,
    Users,
    TrendingUp,
    FileText
} from 'lucide-react';

export default function EmpowermentPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-b">
          <div className="container px-4 max-w-6xl mx-auto relative z-10 text-center">
            <Badge className="mb-6 bg-primary/15 text-primary hover:bg-primary/20 border-primary/20 px-6 py-2 rounded-full uppercase tracking-widest text-[11px] font-bold shadow-sm">
              Empower Your Business
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-headline text-primary tracking-tighter mb-8 leading-tight">
              Keep Your Business Organized <br className="hidden md:block" /> and Ready for Tax Audits
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              Ogeemo streamlines your operations with powerful tools designed to boost productivity and maintain flawless records, ensuring your business is always audit-ready.
            </p>
            <div className="flex justify-center items-center">
                <Button asChild size="lg" className="h-14 px-10 text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
                    <Link href="#solutions">Learn More</Link>
                </Button>
            </div>

            {/* Decorative background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10 opacity-60" />
          </div>
        </section>

        {/* Core Value Proposition */}
        <section className="py-24 container px-4 max-w-5xl mx-auto text-center" id="solutions">
            <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-foreground tracking-tight">Streamline Your Business with Ogeemo</h2>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                    Ogeemo empowers businesses to stay organized, prepared for tax audits, and optimized for productivity with innovative management tools designed to boost efficiency and growth.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 text-left">
                {[
                    {
                        title: "Organized Document Storage",
                        desc: "Securely store and easily retrieve all your essential business documents in one centralized system.",
                        icon: Layers,
                        color: "text-blue-500",
                        bg: "bg-blue-500/10"
                    },
                    {
                        title: "Audit-Ready Compliance",
                        desc: "Stay prepared for tax audits with automated compliance checks and detailed record-keeping.",
                        icon: ShieldCheck,
                        color: "text-green-500",
                        bg: "bg-green-500/10"
                    },
                    {
                        title: "Task and Project Management",
                        desc: "Manage tasks and projects seamlessly to enhance team collaboration and meet deadlines.",
                        icon: Zap,
                        color: "text-orange-500",
                        bg: "bg-orange-500/10"
                    },
                    {
                        title: "Productivity Analytics",
                        desc: "Gain insights into your business performance with real-time analytics to optimize productivity.",
                        icon: BarChart3,
                        color: "text-purple-500",
                        bg: "bg-purple-500/10"
                    }
                ].map((pillar, idx) => (
                    <Card key={idx} className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-card/50 backdrop-blur-sm border-primary/5">
                        <CardHeader className="pb-4">
                            <div className={`w-12 h-12 ${pillar.bg} rounded-xl flex items-center justify-center ${pillar.color} mb-4 group-hover:scale-110 transition-transform`}>
                                <pillar.icon className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-bold leading-tight">{pillar.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {pillar.desc}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

        {/* Insights / Blog Feature */}
        <section className="py-24 bg-muted/30 border-y">
            <div className="container px-4 max-w-6xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-16 items-center">
                    <div className="flex-1 space-y-8">
                        <Badge variant="outline" className="text-primary border-primary font-bold px-4 py-1">INSIGHTS</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">How Ogeemo Helps Businesses Achieve Their Goals</h2>
                        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
                            <p className="font-medium text-foreground">
                                Explore our collection of expert articles and practical tips designed to enhance your business management and boost your productivity.
                            </p>
                            <p>
                                This paragraph serves as an introduction to your blog post. Begin by discussing the primary theme or topic that you plan to cover, ensuring it captures the reader’s interest from the very first sentence. Share a brief overview that highlights why this topic is important and how it can provide value.
                            </p>
                            <div className="bg-card p-8 rounded-3xl border-l-8 border-primary shadow-xl relative overflow-hidden group">
                                <Quote className="absolute top-4 right-4 h-12 w-12 text-primary/10 group-hover:text-primary/20 transition-colors" />
                                <p className="text-xl italic font-serif text-foreground relative z-10">
                                    "Sometimes, the simplest moments hold the deepest wisdom. Let your thoughts settle, and clarity will find you."
                                </p>
                                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-primary">— Ogeemo Reflections</p>
                            </div>
                            <p>
                                This paragraph dives deeper into the topic introduced earlier, expanding on the main idea with examples, analysis, or additional context. Use this section to elaborate on specific points, ensuring that each sentence builds on the last to maintain a cohesive flow.
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { title: "How Ogeemo Helps Goals", date: "April 18, 2026", cat: "Growth" },
                                { title: "Tax Audit Prep Made Easy", date: "April 18, 2026", cat: "Compliance" },
                                { title: "Maximizing Efficiency", date: "April 18, 2026", cat: "Strategy" },
                                { title: "Streamlined Operations", date: "April 18, 2026", cat: "Operations" }
                            ].map((post, idx) => (
                                <Card key={idx} className="overflow-hidden hover:shadow-md transition-all border-primary/5 bg-card">
                                    <div className="h-32 bg-muted relative">
                                        <ImagePlaceholder id={`post-thumb-${idx}`} className="object-cover" />
                                        <Badge className="absolute top-3 left-3 bg-primary/80 backdrop-blur-sm text-[10px] uppercase font-bold">{post.cat}</Badge>
                                    </div>
                                    <CardHeader className="p-4">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{post.date}</p>
                                        <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors leading-tight line-clamp-2">
                                            {post.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardFooter className="p-4 pt-0">
                                        <Button variant="link" size="sm" className="p-0 text-xs font-bold text-primary flex items-center gap-1">
                                            Read More <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                        <div className="mt-8 text-center">
                            <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                                View All Insights
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Success Stories Section */}
        <section className="py-24 container px-4 max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
                <Badge className="bg-primary/10 text-primary">CASE STUDIES</Badge>
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-foreground">Success Stories from Ogeemo Users</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Discover how Ogeemo simplifies business management, helping you stay organized, ready for audits, and boost productivity step-by-step.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 overflow-hidden border-primary/10 shadow-2xl bg-gradient-to-br from-card to-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="h-full min-h-[350px] relative">
                            <ImagePlaceholder id="tas-team-story" className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                <p className="text-white text-xs font-bold uppercase tracking-widest opacity-80">The TAS Founders: Dan, Nick & Julie</p>
                            </div>
                        </div>
                        <div className="p-8 md:p-12 space-y-6 flex flex-col justify-center">
                            <Badge variant="outline" className="w-fit text-primary border-primary font-bold">OUR ORIGIN</Badge>
                            <h3 className="text-2xl md:text-4xl font-bold font-headline leading-tight">From Internal Tool to Universal Engine: The Tax Audit Solutions Story</h3>
                            <div className="space-y-4">
                                <p className="text-muted-foreground leading-relaxed">
                                    Tax Audit Solutions (TAS) didn't set out to build a software company. They were too busy running a business in the high-stakes world of financial audits and corporate compliance.
                                </p>
                                <p className="text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-4">
                                    "We realized that the 'Corporate Trap'—fragmented tools and lack of audit-level data integrity—was stifling our growth. We needed a digital nervous system."
                                </p>
                                <p className="text-muted-foreground leading-relaxed">
                                    What started as a private internal advantage for TAS is now the blueprint for the Ogeemo collective.
                                </p>
                            </div>
                            <Button asChild className="w-fit font-bold group mt-4">
                                <Link href="/empowerment/tas-manifesto">
                                    Read the TAS Manifesto <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </Card>
                
                <div className="space-y-8">
                    <Card className="p-8 border-primary/5 hover:border-primary/20 transition-all bg-card shadow-lg h-full">
                        <CardHeader className="p-0 mb-4">
                            <TrendingUp className="h-8 w-8 text-primary mb-4" />
                            <CardTitle className="text-xl font-bold leading-tight">Driving Sustainable Growth Through Smart Management</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Learn how a business tackled challenges and maximized efficiency using Ogeemo’s comprehensive management tools.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="p-8 border-primary/5 hover:border-primary/20 transition-all bg-card shadow-lg h-full">
                        <CardHeader className="p-0 mb-4">
                            <Rocket className="h-8 w-8 text-primary mb-4" />
                            <CardTitle className="text-xl font-bold leading-tight">Revolutionizing Business Operations with Ogeemo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Discover how a company optimized processes, cut expenses, and expanded effectively by integrating Ogeemo’s system.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Mission Statement / Comprehensive Solutions */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
            <div className="container px-4 max-w-4xl mx-auto text-center space-y-8 relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold font-headline leading-tight">Optimize Your Business Workflow with Comprehensive Solutions</h2>
                <p className="text-xl opacity-90 leading-relaxed">
                    Ogeemo is dedicated to empowering businesses through organization and efficiency. Our mission is to simplify management, ensuring companies stay audit-ready and maximize productivity with innovative tools that drive success.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-md border border-white/20">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h4 className="font-bold text-lg">Workflow Management</h4>
                        <p className="text-sm opacity-80">Manage all your tasks seamlessly, keeping your team aligned.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-md border border-white/20">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <h4 className="font-bold text-lg">Audit Preparedness</h4>
                        <p className="text-sm opacity-80">Automatically organize financial records and documents.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-md border border-white/20">
                            <Zap className="h-8 w-8" />
                        </div>
                        <h4 className="font-bold text-lg">Productivity Tools</h4>
                        <p className="text-sm opacity-80">Leverage smart features designed to accelerate business growth.</p>
                    </div>
                </div>
            </div>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 container px-4 max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-16">
                <Badge variant="secondary" className="font-bold">FAQ</Badge>
                <h2 className="text-3xl md:text-5xl font-bold font-headline text-foreground">Keep Your Business Organized and Audit-Ready Every Day</h2>
                <p className="text-lg text-muted-foreground">Find clear answers to frequent questions, making it easy to navigate Ogeemo.</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                    { q: "How does Ogeemo help with tax audit preparation?", a: "Ogeemo organizes your financial records and documentation, ensuring you’re always ready for tax audits with minimal stress." },
                    { q: "Can Ogeemo improve my business productivity?", a: "Yes, Ogeemo streamlines your workflows and centralizes management tools to boost overall productivity." },
                    { q: "What types of businesses can use Ogeemo?", a: "Ogeemo is designed for businesses of all sizes looking to enhance organization and operational efficiency." },
                    { q: "Is my data secure with Ogeemo?", a: "Absolutely. Ogeemo employs robust security measures to keep your business data safe and confidential." },
                    { q: "How easy is it to integrate Ogeemo with other tools?", a: "Ogeemo offers seamless integration options with popular business software to fit your existing tech stack." },
                    { q: "Does Ogeemo provide customer support?", a: "Yes, our dedicated support team is available to assist you whenever you need help with Ogeemo." }
                ].map((item, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="bg-card rounded-2xl border border-primary/5 px-6 shadow-sm hover:shadow-md transition-all">
                        <AccordionTrigger className="text-left font-bold text-lg py-6 hover:text-primary transition-colors no-underline">
                            {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6 border-t pt-4">
                            {item.a}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>

        {/* Learning Hub / Final CTA Grid */}
        <section className="py-24 bg-muted/50">
            <div className="container px-4 max-w-6xl mx-auto">
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-foreground tracking-tight">Streamline Your Business Operations Efficiently</h2>
                    <p className="text-lg text-muted-foreground">Discover essential tools crafted to enhance your business management skills.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="group hover:border-primary/50 transition-all border-2 bg-card">
                        <CardHeader className="text-center p-8">
                            <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                <BookOpen className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-2xl font-bold mb-4">Getting Started</CardTitle>
                            <CardDescription className="text-base">Understand the basics to effectively organize and manage your business workflows.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center pb-8">
                            <Button asChild variant="outline" className="font-bold border-primary/20 group-hover:border-primary transition-all">
                                <Link href="/register">Learn More</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="group hover:border-primary/50 transition-all border-2 bg-card">
                        <CardHeader className="text-center p-8">
                            <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                <Rocket className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-2xl font-bold mb-4">Advanced Features</CardTitle>
                            <CardDescription className="text-base">Master sophisticated tools designed to boost productivity and compliance.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center pb-8">
                            <Button asChild variant="outline" className="font-bold border-primary/20 group-hover:border-primary transition-all">
                                <Link href="/register">Learn More</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="group hover:border-primary/50 transition-all border-2 bg-card">
                        <CardHeader className="text-center p-8">
                            <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-2xl font-bold mb-4">Audit Preparedness</CardTitle>
                            <CardDescription className="text-base">Gain insights into maintaining records and processes ready for tax audits.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center pb-8">
                            <Button asChild variant="outline" className="font-bold border-primary/20 group-hover:border-primary transition-all">
                                <Link href="/register">Learn More</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Final Final CTA */}
                <div className="mt-24 text-center space-y-8 bg-card border-2 border-primary/10 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary tracking-tight">Organize Your Business, Maximize Efficiency</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Discover how Ogeemo streamlines your operations to boost productivity and ensure audit readiness.</p>
                    <Button asChild size="lg" className="h-16 px-12 text-xl font-bold shadow-xl hover:shadow-2xl transition-all">
                        <Link href="/register">Get Started Free Today</Link>
                    </Button>
                    {/* Decorative icons */}
                    <Zap className="absolute -bottom-8 -left-8 h-32 w-32 text-primary/5 -rotate-12" />
                    <ShieldCheck className="absolute -top-8 -right-8 h-32 w-32 text-primary/5 rotate-12" />
                </div>
            </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
