
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { CheckCircle } from "lucide-react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

const benefitsSmallBusiness = [
    {
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        title: "All-in-One Platform",
        description: "Replace multiple subscriptions. Manage accounting, projects, CRM, and more from a single dashboard."
    },
    {
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        title: "AI-Powered Automation",
        description: "Let Ogeemo handle the tedious work. From generating invoices to organizing your schedule, our AI works for you."
    },
    {
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        title: "Audit-Ready Books",
        description: "With our unique BKS (Bookkeeping Kept Simple) system, your finances are organized and ready for tax time by default."
    }
];

const benefitsAccountants = [
    {
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        title: "Seamless Client Collaboration",
        description: "Work directly inside your client's workspace. No more chasing files or reconciling spreadsheets."
    },
    {
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        title: "Advisory-First Tools",
        description: "With real-time data at your fingertips, you can provide proactive, high-value advice that helps your clients grow."
    },
    {
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        title: "Track & Bill Every Minute",
        description: "Use Ogeemo's time and client managers to ensure every second of your valuable consulting time is accounted for and billed."
    }
];


export default function ExplorePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1">
                {/* For Small Businesses Section */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">For Small Businesses & Freelancers</h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Stop juggling apps. Ogeemo unifies your accounting, projects, and client management into one intelligent platform, so you can focus on what you do best.
                            </p>
                            <div className="mt-8 space-y-6">
                                {benefitsSmallBusiness.map(benefit => (
                                    <div key={benefit.title} className="flex items-start gap-4">
                                        {benefit.icon}
                                        <div>
                                            <h4 className="font-semibold">{benefit.title}</h4>
                                            <p className="text-muted-foreground">{benefit.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8">
                                <Button asChild size="lg">
                                    <Link href="/for-small-businesses">Learn More</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="relative h-80 md:h-full w-full">
                            <ImagePlaceholder data-ai-hint="business dashboard" className="rounded-lg h-full w-full" />
                        </div>
                    </div>
                </section>
                
                {/* For Accountants Section */}
                <section className="py-16 md:py-24 bg-muted">
                     <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                        <div className="relative h-80 md:h-full w-full md:order-2">
                            <ImagePlaceholder data-ai-hint="financial analytics" className="rounded-lg h-full w-full" />
                        </div>
                        <div className="md:order-1">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">For Accountants & Bookkeepers</h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Move beyond compliance and become an indispensable financial partner. Ogeemo is the collaborative platform that turns bookkeeping into a gateway for high-value advisory services.
                            </p>
                            <div className="mt-8 space-y-6">
                                {benefitsAccountants.map(benefit => (
                                    <div key={benefit.title} className="flex items-start gap-4">
                                        {benefit.icon}
                                        <div>
                                            <h4 className="font-semibold">{benefit.title}</h4>
                                            <p className="text-muted-foreground">{benefit.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                             <div className="mt-8">
                                <Button asChild size="lg">
                                    <Link href="/for-accountants">Learn More</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* CTA Section */}
                <section className="py-20 md:py-28">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Build Your Empire on a Single Platform?</h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Join our beta program and be among the first to experience the future of business management.</p>
                        <div className="mt-8">
                            <Button asChild size="lg">
                                <Link href="/register">Become a Beta Tester</Link>
                            </Button>
                        </div>
                    </div>
                </section>

            </main>
            <SiteFooter />
        </div>
    );
}
