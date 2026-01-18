import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Users2 } from "lucide-react";

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
                <section className="py-20 md:py-28">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Supercharge Your Services?</h2>
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
