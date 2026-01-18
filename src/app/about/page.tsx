import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Users, Target, Lightbulb, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        title: "AI as a True Partner",
        description: "We leverage artificial intelligence not to replace human intuition, but to augment it. Ogeemo acts as your smart assistant, automating mundane tasks, providing timely insights, and connecting the dots across your entire workflow so you can focus on the meaningful decisions that drive growth."
    }
];

const teamMembers = [
    {
        name: "Dan White",
        role: "Founder & CEO",
        bio: "With over 20 years of experience helping small businesses navigate complex financial landscapes, Dan founded Ogeemo to solve the #1 problem he saw every day: software that creates more work instead of simplifying it. His vision is to empower entrepreneurs with a tool that is as ambitious as they are.",
        aiHint: "professional businessman portrait"
    },
    {
        name: "Alex Chen",
        role: "Lead Architect & Developer",
        bio: "Alex is the technical mastermind behind Ogeemo. A full-stack developer with a passion for clean architecture and seamless user experiences, he leads the team in building a robust, scalable, and secure platform. He believes technology should be an invisible enabler of success.",
        aiHint: "software developer portrait"
    }
]

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
                        <ImagePlaceholder data-ai-hint="team business meeting" className="rounded-lg h-full w-full object-cover" />
                    </div>
                </div>
            </section>

             <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Meet the Team</h2>
                        <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                            The minds behind the mission. We're a small, dedicated team passionate about building tools that empower small businesses.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {teamMembers.map(member => (
                            <Card key={member.name} className="border-0 shadow-none bg-transparent">
                                <CardContent className="flex flex-col items-center text-center p-0">
                                    <div className="relative w-32 h-32 mb-4">
                                        <ImagePlaceholder data-ai-hint={member.aiHint} className="rounded-full"/>
                                    </div>
                                    <CardTitle>{member.name}</CardTitle>
                                    <p className="text-primary font-semibold">{member.role}</p>
                                    <p className="mt-2 text-muted-foreground">{member.bio}</p>
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
                        <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
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
                                <CardDescription className="px-6 pb-6">
                                    {p.description}
                                </CardDescription>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

             <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 text-center">
                     <h2 className="text-3xl md:text-4xl font-bold font-headline">A Foundation You Can Trust</h2>
                      <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                         Ogeemo is built entirely on Google's robust and secure cloud technology. By deeply integrating with the Google Workspace you already know and trust, we provide a seamless and secure experience from day one. Your data's security isn't an afterthought; it's part of our foundation.
                      </p>
                </div>
            </section>
            
            <section className="py-20 md:py-20 bg-muted">
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