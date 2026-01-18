
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Landmark, Briefcase, Clock, Folder, Mail, ShieldCheck, Users } from "lucide-react";

const benefits = [
    {
        icon: Briefcase,
        title: "Unified Case Management",
        description: "Organize every case into a dedicated project. Manage tasks, deadlines, documents, and client communication all in one secure place."
    },
    {
        icon: Clock,
        title: "Precise Time & Billing",
        description: "Track every billable increment against specific matters and clients. Generate detailed invoices that clearly justify your work and improve collection rates."
    },
    {
        icon: Folder,
        title: "Secure Document Hub",
        description: "Leverage our dual file management system to integrate with Google Drive or use Ogeemo's secure storage for sensitive case files, contracts, and evidence."
    },
    {
        icon: Mail,
        title: "Streamlined Client Communication",
        description: "Log important client emails and link them directly to the relevant case file, creating a complete and auditable communication history."
    },
    {
        icon: Users,
        title: "Conflict Checking",
        description: "Use the centralized contact database to quickly check for potential conflicts of interest before taking on a new case."
    },
    {
        icon: ShieldCheck,
        title: "Financial Clarity",
        description: "Keep your firm's finances and your clients' trust accounts separate and audit-ready with our BKS (Bookkeeping Kept Simple) accounting system."
    }
]


export default function ForLawyersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main>
                <section className="py-20 md:py-32 bg-slate-50">
                    <div className="container mx-auto px-4 text-center">
                        <div className="mx-auto w-fit bg-primary/10 p-4 rounded-full mb-6">
                            <Landmark className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary">
                            Ogeemo for Legal Professionals
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Unify case management, client billing, and document handling in a secure, integrated platform designed for the modern legal practice.
                        </p>
                    </div>
                </section>
                <section className="py-16 md:py-24 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">The Modern Practice, Unified</h2>
                            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                                From client intake to final billing, manage your firm's entire workflow in one place.
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
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Transform Your Firm?</h2>
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
