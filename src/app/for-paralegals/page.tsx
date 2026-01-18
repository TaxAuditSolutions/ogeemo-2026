
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { FileText, Folder, Clock, Zap, MessageSquare, ListTodo } from "lucide-react";

const benefits = [
    {
        icon: Folder,
        title: "Centralized Case Information",
        description: "Access all case documents, deadlines, and task lists from a single dashboard. Spend less time searching and more time supporting your legal team."
    },
    {
        icon: Clock,
        title: "Effortless Time Tracking",
        description: "Log your time against specific tasks and matters. Ensure every minute of your work is captured for accurate billing and reporting."
    },
    {
        icon: Zap,
        title: "Automated Document Assembly",
        description: "(Coming Soon) Use AI-powered tools to quickly generate standard legal documents, letters, and forms from templates, reducing manual drafting time."
    },
    {
        icon: MessageSquare,
        title: "Seamless Team Collaboration",
        description: "Work in sync with lawyers on shared projects and task boards. See real-time updates and ensure everyone is on the same page."
    },
    {
        icon: ListTodo,
        title: "Organized Research",
        description: "Use the built-in Research Hub to collect sources, take notes, and get AI-powered summaries, keeping all your case research organized and accessible."
    },
    {
        icon: FileText,
        title: "Task & Deadline Management",
        description: "Never miss a deadline. Get a clear view of all your tasks across all cases on your personal calendar and project boards."
    }
]


export default function ForParalegalsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main>
                <section className="py-20 md:py-32 bg-slate-50">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mx-auto w-fit bg-primary/10 p-4 rounded-full mb-6">
                            <FileText className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary">
                            Ogeemo for Paralegals
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Organize case files, track billable hours with precision, and collaborate seamlessly with your legal team, all in one place.
                        </p>
                    </div>
                </section>
                <section className="py-16 md:py-24 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">The Ultimate Paralegal Productivity Suite</h2>
                            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                                Ogeemo gives you the tools to excel, from initial research to final documentation.
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
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Boost Your Productivity?</h2>
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
