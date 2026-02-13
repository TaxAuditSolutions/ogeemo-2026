
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";

export default function ContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const recipient = 'dan@ogeemo.com';
        const mailSubject = encodeURIComponent(`[Ogeemo Inquiry] ${subject || 'General Question'}`);
        const body = encodeURIComponent(
            `Name: ${name}\n` +
            `Reply-To: ${email}\n\n` +
            `Message:\n${message}`
        );

        // Standard Gmail compose URL with pre-filled fields
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${mailSubject}&body=${body}`;
        
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="container mx-auto px-4 py-8 md:py-16">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                        Get in Touch
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        We'd love to hear from you. Whether you have a question about features, trials, or anything else, our team is ready to answer all your questions.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="md:col-span-1 space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Mail className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Dan White, President</h3>
                                <p className="text-muted-foreground">dan@ogeemo.com</p>
                                <a href="https://www.ogeemo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.ogeemo.com</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Phone className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Phone</h3>
                                <p className="text-muted-foreground">Mon-Fri from 9am to 5pm</p>
                                <a href="tel:902-510-1967" className="text-primary hover:underline">902-510-1967</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <MapPin className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Office</h3>
                                <p className="text-muted-foreground">6860 Highway 101, <br/>Plympton, NS B0W 2R0</p>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Send us a message</CardTitle>
                                <CardDescription>This will open a pre-filled draft in your Gmail account.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input 
                                                id="name" 
                                                placeholder="Your Name" 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                placeholder="Your Email" 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input 
                                            id="subject" 
                                            placeholder="What can we help with?" 
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea 
                                            id="message" 
                                            placeholder="Your message..." 
                                            rows={5} 
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full sm:w-auto">
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Message via Gmail
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
