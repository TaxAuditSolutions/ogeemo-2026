'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, MapPin, LoaderCircle, CheckCircle, ArrowRight, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Simulating a successful submission for the marketing site
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast({
            title: "Connection Initiated",
            description: "Your signal has been received. Our concierge team will be in touch shortly.",
        });
        
        setIsSuccess(true);
        (e.target as HTMLFormElement).reset();
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 opacity-50 translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 opacity-50 -translate-x-1/2 translate-y-1/2" />

                <div className="container px-4 py-20 md:py-32 max-w-6xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-10">
                            <div className="space-y-6">
                                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                                    GET IN TOUCH
                                </Badge>
                                <h1 className="text-6xl md:text-8xl font-bold font-headline text-primary tracking-tighter leading-none">
                                    Ogeemo.
                                </h1>
                                <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                                    Let's Orchestrate Your Future.
                                </p>
                                <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-md">
                                    Ready to unify your digital nervous system? Our team is here to help you bridge the administrative gap.
                                </p>
                            </div>

                            <div className="space-y-8 pt-4">
                                <div className="flex items-center gap-6 group">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                        <Mail className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Direct Channel</h4>
                                        <p className="text-muted-foreground font-medium underline decoration-primary/30 hover:decoration-primary transition-all">clients@ogeemo.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 group">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                        <MapPin className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl tracking-tight">Global Command</h4>
                                        <p className="text-muted-foreground font-medium">Vancouver, BC, Canada</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <div className="p-6 bg-slate-900 text-white rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                                    <p className="text-lg leading-relaxed relative z-10 italic opacity-90">
                                        "The transition to Ogeemo starts with a single signal. Let us help you find the fidelity your business deserves."
                                    </p>
                                    <Zap className="absolute -bottom-6 -right-6 h-32 w-32 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                                </div>
                            </div>
                        </div>

                        <Card className="shadow-[0_0_50px_rgba(0,0,0,0.1)] border-primary/5 rounded-[3rem] overflow-hidden bg-card">
                            {isSuccess ? (
                                <CardContent className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in-95">
                                    <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle className="h-10 w-10 text-green-500" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-primary tracking-tight">Signal Received.</h2>
                                    <p className="text-muted-foreground mt-4 max-w-xs font-medium">
                                        Your request has been logged in the Ogeemo database. Expect a response through your preferred channel shortly.
                                    </p>
                                    <Button variant="outline" className="mt-10 rounded-full px-8" onClick={() => setIsSuccess(false)}>
                                        Send Another Signal
                                    </Button>
                                </CardContent>
                            ) : (
                                <>
                                    <CardHeader className="p-10 pb-2">
                                        <CardTitle className="text-3xl font-bold tracking-tight">Initiate Connection</CardTitle>
                                        <CardDescription className="text-lg">Enter your details below to reach our concierge team.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-10 pt-6">
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="first-name" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">First Name</Label>
                                                    <Input id="first-name" name="first-name" placeholder="John" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="last-name" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Last Name</Label>
                                                    <Input id="last-name" name="last-name" placeholder="Doe" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" required />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Work Email</Label>
                                                <Input id="email" name="email" type="email" placeholder="john@example.com" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="subject" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Subject</Label>
                                                <Input id="subject" name="subject" placeholder="Professional Orchestration" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="message" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Message</Label>
                                                <Textarea id="message" name="message" placeholder="Describe your operational goals..." className="bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20 min-h-[150px]" required />
                                            </div>
                                            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all" disabled={isSubmitting}>
                                                {isSubmitting ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
                                                {isSubmitting ? "Orchestrating..." : "Send Connection Signal"}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </>
                            )}
                        </Card>
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
