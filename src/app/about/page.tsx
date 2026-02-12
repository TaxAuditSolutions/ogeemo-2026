import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Users, Target, Lightbulb, ArrowRight, Layers, Zap, ShieldCheck, MousePointerClick, CheckCircle } from "lucide-react";

const teamMembers = [
    {
        name: "Dan White",
        role: "Founder & CEO",
        bio: "With over 40 years of experience helping small businesses navigate complex business landscapes, Dan architected Ogeemo to solve the #1 problem he saw every day: software that creates more work instead of just simplifying processes. His vision is to empower entrepreneurs with a tool that is as ambitious as the 'Ogeemo Project'.",
        imageId: "about-dan"
    },
    {
        name: "Julie White",
        role: "Founder & Accounting Specialist",
        bio: "Julie has over 20 years of in depth experience with Accounting Software. She ensures that the accounting software is audit ready and meets the needs of our clients.",
        imageId: "about-julie"
    },
    {
        name: "Nick Illiopoulos",
        role: "Founder & Software Engineer",
        bio: "Nick is the technical genius behind the Ogeemo Technology. A full-stack developer with a passion for clean architecture and seamless user experiences, he leads the team in building a robust, scalable, and secure platform. He believes technology should be an invisible enabler of success.",
        imageId: "about-nick"
    }
];

const principles = [
    {
        icon: Users,
        title: "Human-Centric Design",
        description: "We build for people, not for an endless list of features. Every tool within Ogeemo is designed to be intuitive, solve real-world problems, and reduce your learning curve, empowering you to get back to the work you love."
    },
    {
        icon: Target,
        title: "Integration Over Isolation",
        description: "Your business is a single, connected entity. Your software should be too. Ogeemo breaks down the silos between your finances, projects, and client relationships to create a single source of truth, where every action informs the next."
    },
    {
        icon: Lightbulb,
        title: "AI as a Partner",
        description: "We leverage artificial intelligence not to replace human intuition, but to augment it. Ogeemo acts as your smart assistant, automating mundane tasks, providing timely insights, and connecting the dots across your entire workflow so you can focus on the meaningful decisions that drive growth."
    }
];

export default function AboutUsPage() {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main>
            <section className="py-16 md:py-24 bg-muted">
                <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                            Our Mission: To Simplify Your Ambition
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                            We believe the power to build a successful business belongs to the creators, the builders, and the dreamers—not just those who can navigate a labyrinth of complex software. Ogeemo was born from a simple, powerful question: <strong>"What if one platform could do it all, intelligently?"</strong>
                        </p>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                            Tired of juggling apps for accounting, project management, client relationships, and time tracking? You're not alone. The digital fatigue is real. That's why we built Ogeemo: to unify every part of your business into a single, cohesive command center.
                        </p>
                    </div>
                    <div className="relative h-80 md:h-96 w-full">
                        <ImagePlaceholder id="about-team" className="rounded-lg h-full w-full object-cover" />
                    </div>
                </div>
            </section>

             <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Meet the Founders</h2>
                        <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                            The visionaries behind the mission. We're a dedicated team passionate about building tools that empower small businesses.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {teamMembers.map(member => (
                            <Card key={member.name} className="border-0 shadow-none bg-transparent">
                                <CardContent className="flex flex-col items-center text-center p-0">
                                    <div className="relative w-32 h-32 mb-4 overflow-hidden rounded-full border-2 border-primary/20">
                                        <ImagePlaceholder id={member.imageId} />
                                    </div>
                                    <CardTitle className="text-xl">{member.name}</CardTitle>
                                    <p className="text-primary font-semibold text-sm mb-3 uppercase tracking-wider">{member.role}</p>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{member.bio}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            
            <section className="py-16 md:py-24 bg-muted">
                <div className="container mx-auto px-4">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">The Ogeemo Philosophy</h2>
                        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                            Our development is guided by three core principles that ensure we build a platform that truly serves you.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {principles.map(p => (
                            <Card key={p.title} className="text-center hover:shadow-lg transition-shadow">
                                <CardHeader className="items-center">
                                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                                        <p.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle>{p.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground text-center">
                                        {p.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12">The Root Orchestrator: Our Architectural Innovation</h2>
                    
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                                <Layers className="h-6 w-6" />
                                1. The Master Action Chip: "The Root Orchestrator"
                            </h3>
                            <p className="text-muted-foreground">
                                In the Ogeemo architecture, the Master Action Chip (located in the main header) acts as the System State Manager. It is the "single point of entry" that determines the functional context of the entire application.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li><strong>Dynamic Discovery:</strong> When the Master Chip is engaged, it pings the Functional Registry to inventory all available modules.</li>
                                <li><strong>Path Synthesis:</strong> It creates the initial routing to the two primary navigators: the Action Manager (The Global Web) and the Accounting Hub (The BKS Specialized Web).</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                                <Zap className="h-6 w-6" />
                                2. Integrated Workflow: From Master to Hub
                            </h3>
                            <p className="text-muted-foreground">To show the "Spider Web" in action through the Master Chip:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg bg-background">
                                    <h4 className="font-bold mb-1">Level 1: The Master</h4>
                                    <p className="text-xs text-muted-foreground">The user clicks the Master Chip. The system initializes the session.</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-background">
                                    <h4 className="font-bold mb-1">Level 2: The Navigators</h4>
                                    <p className="text-xs text-muted-foreground">The user chooses the Action Manager. The system pulls the "Global Inventory" (Ideas, Projects, Calendar).</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-background">
                                    <h4 className="font-bold mb-1">Level 3: The Hubs</h4>
                                    <p className="text-xs text-muted-foreground">The user switches to the Accounting Hub. The Master Chip re-routes the "Action-to-Protocol Bridge" to focus specifically on BKS Evidentiary Data.</p>
                                </div>
                            </div>
                        </div>

                        <Card className="border-black border-2 shadow-lg">
                            <CardHeader className="bg-black text-white">
                                <CardTitle className="text-xl text-white">"One Action Chip To Rule Them All"</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-base leading-relaxed space-y-4">
                                    <p className="font-semibold italic">A computer-implemented method for navigating a unified relational database, made simple:</p>
                                    <ul className="list-disc pl-6 space-y-3">
                                        <li><strong>One Master Chip:</strong> A single button that can call up any and all desired actions across the entire platform instantly.</li>
                                        <li><strong>The Action Manager:</strong> A dedicated space where you can collect all your favorites. You build your own command center by choosing exactly what you need to see.</li>
                                        <li><strong>Beyond Ogeemo:</strong> The system allows you to create custom chips that connect to any URL or app outside the Ogeemo world, making it a true gateway for your entire business.</li>
                                    </ul>
                                    <p className="font-medium">
                                        This architecture gets rid of screen clutter and reduces user time, allowing you to toggle between high-level project management and detailed bookkeeping without losing your place.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-8 bg-primary/10 rounded-xl border border-primary/20 text-center">
                            <h3 className="text-2xl font-bold font-headline mb-4">The "Aha!" Moment for the User</h3>
                            <div className="grid md:grid-cols-2 gap-8 text-left">
                                <div>
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><MousePointerClick className="h-4 w-4" /> The Experience</h4>
                                    <p className="text-sm text-muted-foreground">
                                        The user is deep in the "Spider Web" of a project. She needs to check her tax readiness. She doesn't "leave" the screen or open a new app; she simply hits the Master Chip, selects the Accounting Hub, and the same client data she was just looking at is now presented in a Tax-Form-Identical ledger view.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><MousePointerClick className="h-4 w-4" /> The Relief</h4>
                                    <p className="text-sm text-muted-foreground">
                                        The "One Action Chip" gives her the feeling of total control. She knows that no matter where she is in Ogeemo, the Master Navigator always knows where her data is and how to get her to the next step.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

             <section className="py-16 md:py-24 bg-muted">
                <div className="container mx-auto px-4 text-center">
                     <h2 className="text-3xl md:text-4xl font-bold font-headline">A Foundation You Can Trust</h2>
                      <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                         Ogeemo is built entirely on Google's robust and secure cloud technology. By deeply integrating with the Google Workspace you already know and trust, we provide a seamless and secure experience from day one. Your data's security isn't an afterthought; it's part of our foundation.
                      </p>
                </div>
            </section>
            
            <section className="py-20 md:py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold font-headline">Ready to See How It Works?</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Explore the features that make Ogeemo the last business platform you'll ever need.</p>
                    <div className="mt-8">
                        <Button asChild size="lg">
                            <Link href="/features">
                                Explore Features <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
        <SiteFooter />
      </div>
    );
}
