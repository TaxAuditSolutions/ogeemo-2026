
'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, MapPin, LoaderCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { submitInquiry } from "@/services/inquiry-service";

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        try {
            await submitInquiry({
                firstName: formData.get('first-name') as string,
                lastName: formData.get('last-name') as string,
                email: formData.get('email') as string,
                subject: formData.get('subject') as string,
                message: formData.get('message') as string,
            });
            
            toast({
                title: "Message Captured!",
                description: "Your inquiry has been recorded in the database.",
            });
            setIsSuccess(true);
            form.reset();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error sending message",
                description: error.message || "Something went wrong. Please try again later.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1 bg-muted/10">
                <div className="container px-4 py-16 md:py-24 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">Let's Orchestrate.</h1>
                                <p className="text-xl text-muted-foreground">Have questions about Ogeemo? We're here to help you unify your workspace.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Email Us</h4>
                                        <p className="text-muted-foreground">Clients@ogeemo.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Our Headquarters</h4>
                                        <p className="text-muted-foreground">Vancouver, BC, Canada</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Card className="shadow-2xl border-primary/10">
                            {isSuccess ? (
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95">
                                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                    <h2 className="text-2xl font-bold text-primary">Message Logged!</h2>
                                    <p className="text-muted-foreground mt-2 max-w-xs">
                                        Your inquiry was successfully saved to the database. 
                                        <br/><br/>
                                        <span className="text-xs italic">Note: To receive real emails, ensure the 'Trigger Email from Firestore' extension is enabled in your Firebase console.</span>
                                    </p>
                                    <Button variant="outline" className="mt-8" onClick={() => setIsSuccess(false)}>
                                        Send Another Message
                                    </Button>
                                </CardContent>
                            ) : (
                                <>
                                    <CardHeader>
                                        <CardTitle>Send a Message</CardTitle>
                                        <CardDescription>Fill out the form below and our team will be in touch within 24 hours.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="first-name">First Name</Label>
                                                    <Input id="first-name" name="first-name" placeholder="John" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="last-name">Last Name</Label>
                                                    <Input id="last-name" name="last-name" placeholder="Doe" required />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Work Email</Label>
                                                <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Subject</Label>
                                                <Input id="subject" name="subject" placeholder="How can we help?" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="message">Message</Label>
                                                <Textarea id="message" name="message" placeholder="Tell us about your business..." rows={5} required />
                                            </div>
                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                                                {isSubmitting ? "Sending..." : "Send Message"}
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
