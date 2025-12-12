import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
    return (
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
                            <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" placeholder="Your Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" placeholder="Your Email" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input id="subject" placeholder="What can we help with?" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea id="message" placeholder="Your message..." rows={5} />
                                </div>
                                <Button type="submit">Send Message</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
