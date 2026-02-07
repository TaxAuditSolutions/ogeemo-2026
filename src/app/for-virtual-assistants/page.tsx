
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Users2, Clock, Briefcase, ListTodo, Mail, FileDigit } from "lucide-react";

const benefits = [
    {
        icon: Users2,
        title: "Multi-Client Workspace",
        description: "Seamlessly switch between client accounts without logging in and out. Keep all your work organized and separate."
    },
    {
        icon: Clock,
        title: "Integrated Time Tracking",
        description: "Log every billable minute against specific tasks and projects. Justify your invoices with detailed time reports."
    },
    {
        icon: ListTodo,
        title: "Unified Task Management",
        description: "Manage to-do lists, project tasks, and calendar events for all your clients from a single, powerful interface."
    },
    {
        icon: Mail,
        title: "Centralized Communication",
        description: "Log important client emails and link them directly to tasks or projects, creating a complete audit trail of communication."
    },
    {
        icon: FileDigit,
        title: "Simplified Invoicing",
        description: "Turn your tracked time into professional invoices with just a few clicks. Spend less time on billing and more on doing."
    },
    {
        icon: Briefcase,
        title: "Secure Document Handling",
        description: "Use the integrated file manager to securely store and share client documents, keeping everything organized and accessible."
    }
]

export default function ForVirtualAssistantsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main>
                <section className="py-20 md:py-32 bg-slate-50">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mx-auto w-fit bg-primary/10 p-4 rounded-full mb-6">
                            <Users2 className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary">
                            Ogeemo for Virtual Assistants
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Manage multiple clients, track time effortlessly, and handle administrative tasks with unparalleled efficiency on one unified platform.
                        </p>
                    </div>
                </section>
                 <section className="py-16 md:py-24 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Your All-In-One Command Center</h2>
                            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                                Ogeemo is designed to be the single platform you need to manage your entire VA business.
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
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Supercharge Your Services?</h2>
                        <div className="mt-8">
                            <Button asChild size="lg">
                                <Link href="/register">Sign Up Now</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
