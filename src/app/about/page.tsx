import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Globe, Users, Target, Rocket } from "lucide-react";

export default function AboutUsPage() {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
            {/* Hero */}
            <section className="bg-primary text-primary-foreground py-20">
                <div className="container px-4 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">The Ogeemo Story</h1>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">Reimagining the architecture of modern business operations.</p>
                </div>
            </section>

            {/* Content */}
            <section className="py-16 container px-4">
                <div className="max-w-4xl mx-auto space-y-16">
                    {/* Mission */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
                                <Target className="h-8 w-8" />
                                Our Mission
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                To provide small businesses, accountants, and visionaries with a unified digital nervous system. We believe that professional success shouldn't require a fragmented tech stack.
                            </p>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Ogeemo was born from the frustration of toggling between seven different browsers tabs just to answer a simple client question. We've consolidated those tabs into a single, intuitive interface.
                            </p>
                        </div>
                        <div className="aspect-square relative rounded-2xl overflow-hidden shadow-xl">
                            <ImagePlaceholder id="about-team" className="object-cover" />
                        </div>
                    </div>

                    {/* Core Values */}
                    <div className="space-y-8">
                        <h2 className="text-3xl font-bold font-headline text-center text-primary">Our Core Values</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="text-center p-6 border-primary/10">
                                <CardContent className="pt-6 space-y-2">
                                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-bold text-xl">Radical Unity</h3>
                                    <p className="text-sm text-muted-foreground">Every piece of data in Ogeemo is connected. Invoices link to time logs, which link to projects, which link to clients.</p>
                                </CardContent>
                            </Card>
                            <Card className="text-center p-6 border-primary/10">
                                <CardContent className="pt-6 space-y-2">
                                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                        <Rocket className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-bold text-xl">Audit Ready</h3>
                                    <p className="text-sm text-muted-foreground">We prioritize compliance. Our BKS system is built to make tax season a non-event by keeping you "audit ready" 365 days a year.</p>
                                </CardContent>
                            </Card>
                            <Card className="text-center p-6 border-primary/10">
                                <CardContent className="pt-6 space-y-2">
                                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-bold text-xl">Human First</h3>
                                    <p className="text-sm text-muted-foreground">While we love AI, we design for humans. Ogeemo is built to reduce cognitive load and stress, not just increase efficiency.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Founders */}
                    <div className="space-y-8">
                        <h2 className="text-3xl font-bold font-headline text-center text-primary">The Visionaries</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                                    <ImagePlaceholder id="about-dan" className="object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Dan White</h4>
                                    <p className="text-sm text-muted-foreground">Founder & Lead Visionary</p>
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                                    <ImagePlaceholder id="about-nick" className="object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Nick Illiopoulos</h4>
                                    <p className="text-sm text-muted-foreground">Lead Systems Architect</p>
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                                    <ImagePlaceholder id="about-julie" className="object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Julie White</h4>
                                    <p className="text-sm text-muted-foreground">Strategic Financial Advisor</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
        <SiteFooter />
      </div>
    );
}
