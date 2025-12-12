import { Users, Target, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
    {
        icon: Users,
        title: "Human-Centric Design",
        description: "We build for people, not for features. Every tool is designed to be intuitive and solve real-world problems, reducing the learning curve and empowering you to get back to what you do best."
    },
    {
        icon: Target,
        title: "Integration Over Isolation",
        description: "Your business is a single, connected entity. Your software should be too. Ogeemo breaks down the silos between your finances, projects, and client relationships to create a single source of truth."
    },
    {
        icon: Lightbulb,
        title: "AI as a Partner",
        description: "We leverage artificial intelligence not to replace human intuition, but to augment it. Ogeemo is your smart assistant, automating the mundane so you can focus on the meaningful work that drives growth."
    }
];

export default function AboutUsPage() {
    return (
        <main>
            <section className="py-16 md:py-24 bg-muted">
                <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                            Our Mission: Simplify Your Business
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                            We believe that the power to build a successful business should be in the hands of the creators, the builders, and the dreamers—not just those who can navigate complex software. Ogeemo was born from a simple idea: what if one platform could do it all, intuitively?
                        </p>
                    </div>
                    <div className="relative h-80 md:h-96 w-full">
                        <ImagePlaceholder data-ai-hint="team business meeting" className="rounded-lg h-full w-full" />
                    </div>
                </div>
            </section>
            
            <section className="py-16 md:py-24">
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
                                <CardDescription className="px-6 pb-6">
                                    {p.description}
                                </CardDescription>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            
            <section className="py-16 md:py-20 bg-muted">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold font-headline">Ready to See How It Works?</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Explore the features that make Ogeemo the last business platform you'll ever need.</p>
                    <div className="mt-8">
                        <Button asChild size="lg">
                            <Link href="/explore">
                                Explore Features <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
