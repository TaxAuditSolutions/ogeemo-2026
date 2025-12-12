
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, FileSearch, HardHat } from "lucide-react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import Link from "next/link";

const benefits = [
    {
        icon: <HardHat className="h-8 w-8 text-primary" />,
        title: "Effortless Accounting",
        description: "Audit-ready by design, even for non-accountants. Scan tax returns to auto-populate data and gain peace of mind."
    },
    {
        icon: <Clock className="h-8 w-8 text-primary" />,
        title: "Intuitive Time & Task Tracking",
        description: "Easily manage projects, track billable hours, and invoice clients. See exactly where your time goes."
    },
    {
        icon: <FileSearch className="h-8 w-8 text-primary" />,
        title: "No More Software Overload",
        description: "Replace multiple, confusing subscriptions with one comprehensive platform that handles everything from files to finances."
    }
]

export default function ForSmallBusinessesPage() {
    return (
        <main>
            {/* Hero Section */}
            <section className="py-20 md:py-32 bg-slate-50">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary">
                        Run Your Small Business with Confidence
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        Ogeemo simplifies your daily operations, from tracking sales to managing finances, so you can focus on growth, not complexity.
                    </p>
                    <div className="mt-8">
                        <Button asChild size="lg">
                            <Link href="/register">Join Beta Program</Link>
                        </Button>
                    </div>
                </div>
            </section>
            
            {/* Benefits Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        {benefits.map(benefit => (
                             <div key={benefit.title} className="flex flex-col items-center">
                                {benefit.icon}
                                <h3 className="mt-4 text-xl font-bold">{benefit.title}</h3>
                                <p className="mt-2 text-muted-foreground">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-16 md:py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                     <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">How Ogeemo Works</h2>
                        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                            Get started in minutes. No complex setup required.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">1</div>
                                <div>
                                    <h4 className="font-semibold text-lg">Log in with Google</h4>
                                    <p className="text-muted-foreground">Ogeemo is powered by Google's robust technology. Simply use your existing Google account to sign in securely.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">2</div>
                                <div>
                                    <h4 className="font-semibold text-lg">Start Using Ogeemo Instantly</h4>
                                    <p className="text-muted-foreground">No complex setup or lengthy onboarding. If you can type or talk, you can manage your business. Features are there when you need them.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">3</div>
                                <div>
                                    <h4 className="font-semibold text-lg">Gain Peace of Mind</h4>
                                    <p className="text-muted-foreground">Your records are organized and audit-ready by default. Stop worrying about tax time and focus on your passion.</p>
                                </div>
                            </div>
                        </div>
                        <ImagePlaceholder data-ai-hint="business dashboard" className="rounded-lg h-[400px] w-full" />
                    </div>
                </div>
            </section>

             {/* CTA Section */}
            <section className="py-20 md:py-28">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Focus on Growth, Not Complexity?</h2>
                <div className="mt-8">
                <Button asChild size="lg">
                    <Link href="/register">Join our Ogeemo Beta Tester Community</Link>
                </Button>
                </div>
            </div>
            </section>

        </main>
    );
}
