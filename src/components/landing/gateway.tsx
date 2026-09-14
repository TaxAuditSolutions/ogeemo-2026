'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { useAuth } from "@/context/auth-context";
import {
    ArrowRight,
    BookOpenCheck,
    Clock,
    Code2,
    Compass,
    Crown,
    FileText,
    Handshake,
    HeartHandshake,
    Sparkles,
    Users,
    Zap
} from 'lucide-react';
import { useState } from 'react';

/**
 * @fileOverview The "Ogeemo Gateway" landing page.
 * Welcomes visitors, asks what brings them in today, then routes each intent
 * to the appropriate part of the marketing site or the member Suite.
 */

type Role = 'solo' | 'builder' | 'partner';

const ROLES: { value: Role; label: string; hint: string }[] = [
    { value: 'solo', label: 'Solo Business Owner', hint: 'I need to run my business' },
    { value: 'builder', label: 'Community Builder', hint: 'I am here for the movement' },
    { value: 'partner', label: 'Partner / Developer', hint: 'I am evaluating the system' },
];

const BUSINESS_INTENTS = [
    {
        icon: BookOpenCheck,
        title: 'Get my books in order',
        description: 'Audit-ready accounting and continuous bookkeeping.',
        href: '/for-accountants',
    },
    {
        icon: Users,
        title: 'Track clients & leads',
        description: 'One CRM for contacts, clients, and follow-ups.',
        href: '/solutions',
    },
    {
        icon: FileText,
        title: 'Quote & invoice jobs',
        description: 'Smart quotes, estimates, and automated invoicing.',
        href: '/lead-to-ledger',
    },
    {
        icon: Clock,
        title: 'Manage my time & team',
        description: 'The Activity Manager: calendar, dispatch, and time control.',
        href: '/features',
    },
    {
        icon: Compass,
        title: 'Not sure yet',
        description: 'Show me everything Ogeemo can do.',
        href: '/explore',
    },
];

export function Gateway() {
    const { user, isLoading } = useAuth();
    const [role, setRole] = useState<Role | null>(null);

    const highlight = (door: Role) =>
        role === door
            ? 'ring-2 ring-primary shadow-2xl border-primary/40'
            : 'ring-0 shadow-lg border-primary/10';

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <SiteHeader />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-16 md:py-24 overflow-hidden bg-gradient-to-b from-primary/5 to-background text-foreground border-b">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl opacity-50" />
                    <div className="container px-4 max-w-6xl mx-auto relative z-10 text-center space-y-6">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            One business. One system.
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight leading-tight">
                            Welcome! What brings you in today?
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                            Ogeemo is an anti-greed, success-scaled business operating system — and a community
                            of the people who run one. Tell us what brings you here, and we will take you
                            straight to it.
                        </p>

                        {/* Role toggle */}
                        <div className="pt-4">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                                Pick the closest match (optional)
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {ROLES.map((r) => (
                                    <Button
                                        key={r.value}
                                        variant={role === r.value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setRole(role === r.value ? null : r.value)}
                                        className="rounded-full"
                                        title={r.hint}
                                    >
                                        {r.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Three Doors */}
                <section className="py-16 md:py-24">
                    <div className="container px-4 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                            {/* Door A: Community */}
                            <Card className={`border transition-all duration-300 h-full flex flex-col ${highlight('builder')}`}>
                                <CardHeader>
                                    <HeartHandshake className="h-10 w-10 text-primary mb-4" />
                                    <CardTitle className="text-2xl font-bold font-headline">I&apos;m here for the community</CardTitle>
                                    <CardDescription>Join the people building and running businesses on Ogeemo.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1 flex flex-col">
                                    <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed flex-1">
                                        <li className="flex items-start gap-2"><Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Co-create software with a developer-first, user-focused team.</li>
                                        <li className="flex items-start gap-2"><Users className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Direct input on what gets built next.</li>
                                        <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" /> One access model, one price — the full Ogeemo engine, no paywalled modules.</li>
                                    </ul>
                                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                                        <p className="flex items-center gap-2 text-sm font-bold text-primary">
                                            <Crown className="h-4 w-4 shrink-0" /> The Founding 100
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Claim 1 of 100 Founding Builder spots — <span className="font-semibold text-foreground">6 months free + 50% off for life.</span>
                                        </p>
                                    </div>
                                    <Button asChild size="lg" className="w-full font-bold">
                                        <Link href="/pricing">Become a Member</Link>
                                    </Button>
                                    <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
                                        <Link href="/about">Read our story <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Door B: Business Operations */}
                            <Card className={`border transition-all duration-300 h-full flex flex-col ${highlight('solo')}`}>
                                <CardHeader>
                                    <Zap className="h-10 w-10 text-primary mb-4" />
                                    <CardTitle className="text-2xl font-bold font-headline">I need to run my business</CardTitle>
                                    <CardDescription>One system for books, clients, quoting, and time.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-1 flex flex-col">
                                    <div className="space-y-2 flex-1">
                                        {BUSINESS_INTENTS.map((intent) => (
                                            <Link
                                                key={intent.href + intent.title}
                                                href={intent.href}
                                                className="flex items-center gap-3 p-3 rounded-xl border border-primary/10 bg-background hover:bg-primary/5 hover:border-primary/30 transition-all group"
                                            >
                                                <intent.icon className="h-5 w-5 text-primary shrink-0" />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm font-bold text-foreground">{intent.title}</span>
                                                    <span className="block text-xs text-muted-foreground truncate">{intent.description}</span>
                                                </span>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href="/solutions">Explore Solutions</Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Door C: Partners & Developers */}
                            <Card className={`border transition-all duration-300 h-full flex flex-col ${highlight('partner')}`}>
                                <CardHeader>
                                    <Handshake className="h-10 w-10 text-primary mb-4" />
                                    <CardTitle className="text-2xl font-bold font-headline">I&apos;m evaluating or partnering</CardTitle>
                                    <CardDescription>Partnership pathways, architecture, and integration.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1 flex flex-col">
                                    <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed flex-1">
                                        <li className="flex items-start gap-2"><Code2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> The Master Action Chip and Action-to-Protocol Bridge connect ideas to billable work.</li>
                                        <li className="flex items-start gap-2"><Code2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Audit-ready data schemas on resilient infrastructure.</li>
                                        <li className="flex items-start gap-2"><Handshake className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Collaboration, white-label, and ecosystem programs.</li>
                                    </ul>
                                    <Button asChild size="lg" variant="outline" className="w-full font-bold">
                                        <Link href="/partners">Review Partnership Paths</Link>
                                    </Button>
                                    <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
                                        <Link href="/features">See the Feature Set</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Returning members */}
                        <div className="mt-12 text-center">
                            {!isLoading && user ? (
                                <Button asChild size="lg" className="h-14 px-10 text-lg font-bold shadow-lg">
                                    <Link href="/welcome">Welcome back — Go to the Ogeemo Suite <ArrowRight className="ml-2 h-5 w-5" /></Link>
                                </Button>
                            ) : (
                                <Button asChild size="lg" variant="ghost" className="text-muted-foreground">
                                    <Link href="/login">Already a member? Log in to the Suite</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 text-center space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold font-headline">Ready to take back command?</h2>
                        <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">Become a member and find sanity in the Ogeemo Spider Web.</p>
                        <div className="flex flex-wrap justify-center gap-4 pt-4">
                            <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold shadow-2xl">
                                <Link href="/register">Start Your Free Trial</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                                <Link href="/contact">Get in Touch</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}