import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Landmark } from "lucide-react";

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
