
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { BookUser, Share2, Clock, ShieldCheck, Zap, BarChart3, Users2 } from "lucide-react";

const benefits = [
    {
        icon: Zap,
        title: "Automated Data Entry",
        description: "Dramatically reduce manual entry with AI-powered data extraction and categorization."
    },
    {
        icon: Share2,
        title: "Real-Time Collaboration",
        description: "Access client books in real-time. No more waiting for files or dealing with outdated data."
    },
    {
        icon: Clock,
        title: "Efficient Bank Reconciliation",
        description: "Our smart reconciliation tools make matching bank transactions to ledger entries faster than ever."
    },
    {
        icon: Users2,
        title: "Multi-Client Dashboard",
        description: "Manage your entire client portfolio from a single, intuitive dashboard."
    },
    {
        icon: ShieldCheck,
        title: "Standardized Chart of Accounts",
        description: "Ensure consistency and accuracy across all your clients with standardized, CRA-aligned categories."
    },
    {
        icon: BarChart3,
        title: "Direct Reporting",
        description: "Generate professional financial statements, sales tax reports, and remittance summaries with one click."
    }
]

export default function ForBookkeepersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main>
                <section className="py-20 md:py-32 bg-slate-50">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mx-auto w-fit bg-primary/10 p-4 rounded-full mb-6">
                            <BookUser className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary">
                            Ogeemo for Bookkeepers
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Streamline client management, automate data entry, and offer higher-value advisory services with a single, collaborative platform.
                        </p>
                    </div>
                </section>
                
                <section className="py-16 md:py-24 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">The Bookkeeper's Toolkit, Reimagined</h2>
                            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                                Spend less time on tedious data entry and more time providing valuable insights.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {benefits.map(benefit => (
                                <div key={benefit.title} className="flex flex-col items-start text-left p-6 border rounded-lg hover:shadow-lg transition-shadow bg-background">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <benefit.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="mt-4 text-xl font-bold">{benefit.title}</h3>
                                    <p className="mt-2 text-muted-foreground flex-1">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 md:py-28">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Modernize Your Practice?</h2>
                        <div className="mt-8">
                            <Button asChild size="lg">
                                <Link href="/register">Join the Beta</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
