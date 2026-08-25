'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/landing/header';
import { SiteFooter } from '@/components/landing/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Building2, CircleDollarSign, Handshake, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react';

export default function PartnersPage() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const company = String(formData.get('company') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const focus = String(formData.get('focus') || '').trim();
    const website = String(formData.get('website') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const subject = encodeURIComponent(`Partnership Inquiry from ${name || 'New Applicant'}`);
    const body = encodeURIComponent(
      [
        'Partnership Application',
        '',
        `Name: ${name}`,
        `Organization: ${company}`,
        `Email: ${email}`,
        `Partnership Focus: ${focus}`,
        `Website: ${website || 'Not provided'}`,
        '',
        'Message:',
        message,
      ].join('\n')
    );

    window.location.href = `mailto:info@ogeemo.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/5 to-background py-20 md:py-28">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mx-auto max-w-3xl text-center space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                Partnership Program
              </Badge>
              <h1 className="font-orbitron text-5xl font-bold tracking-tight text-primary md:text-7xl uppercase">
                Grow with OGEEMO
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
                We build with strategic partners, referral allies, and implementation collaborators who want to help businesses grow more clearly, more efficiently, and more humanly.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-8 text-base font-bold">
                  <Link href="#apply">Apply to Partner</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-bold">
                  <Link href="mailto:info@ogeemo.com">Email Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-primary/10 bg-card shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Handshake className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-headline">Strategic Collaboration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We partner with firms and operators that want to share trust, capability, and outcomes instead of pushing a locked-in sales funnel.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-card shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CircleDollarSign className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-headline">Shared Growth Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Our partnerships are structured around mutual value creation, practical delivery, and long-term alignment rather than short-term commissions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-card shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-headline">Member-First Ecosystem</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    The program is designed to help members, partners, and mentors work together without hidden tiers, sales traps, or unfair gatekeeping.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-20">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                    Why partner with us
                  </Badge>
                  <h2 className="font-headline text-3xl font-bold tracking-tight md:text-5xl">
                    Built for long-term operating relationships.
                  </h2>
                </div>

                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Ogeemo is creating a practical ecosystem for businesses that want a better way to manage operations, relationships, and growth. Partnerships are a core part of that model.
                  </p>
                  <p>
                    We welcome partners in advisory, implementation, referrals, service integration, professional development, and community growth. If you serve founders, operators, or professional services businesses, we want to explore a working relationship.
                  </p>
                  <p>
                    Our focus is simple: help businesses become more operationally clear, financially disciplined, and ethically aligned while building sustainable growth ecosystems.
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">Partnership types</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-3"><ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" /> Referral partners who introduce Ogeemo to businesses they serve</li>
                    <li className="flex gap-3"><ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" /> Implementation partners who help clients onboard and operationalize the platform</li>
                    <li className="flex gap-3"><ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" /> Advisory and service partners in legal, accounting, finance, operations, and growth strategy</li>
                    <li className="flex gap-3"><ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" /> Strategic technology and ecosystem collaborators with aligned customer value</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/10 bg-card p-6 shadow-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Program overview</p>
                    <h3 className="font-headline text-2xl font-bold">Partnership Criteria</h3>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-primary shrink-0" /> Clear alignment with Ogeemo values and ethical operating standards</li>
                  <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-primary shrink-0" /> A credible customer or referral base in the small business, advisory, or service ecosystem</li>
                  <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-primary shrink-0" /> Ability to help clients implement, support, and grow their Ogeemo experience</li>
                  <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-primary shrink-0" /> A practical interest in building a long-term business relationship rather than a one-off sales deal</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="apply" className="py-20">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="mb-10 text-center">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                Apply now
              </Badge>
              <h2 className="mt-4 font-headline text-3xl font-bold tracking-tight md:text-5xl">
                Partnership application
              </h2>
            </div>

            <Card className="border-primary/10 bg-card shadow-2xl">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-semibold">Full name</label>
                      <input id="name" name="name" type="text" required className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-semibold">Email</label>
                      <input id="email" name="email" type="email" required className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" placeholder="you@example.com" />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="company" className="text-sm font-semibold">Organization / Company</label>
                      <input id="company" name="company" type="text" required className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" placeholder="Business or organization name" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="website" className="text-sm font-semibold">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        inputMode="url"
                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="focus" className="text-sm font-semibold">Partnership focus</label>
                    <select id="focus" name="focus" required className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <option value="">Select a partnership type</option>
                      <option value="Referral partner">Referral partner</option>
                      <option value="Implementation partner">Implementation partner</option>
                      <option value="Advisory or service partner">Advisory or service partner</option>
                      <option value="Strategic technology partner">Strategic technology partner</option>
                      <option value="Community collaborator">Community collaborator</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-semibold">Tell us about your partnership idea</label>
                    <textarea id="message" name="message" required rows={6} className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" placeholder="Share your business, your audience, what you believe the partnership could deliver, and how you’d like to collaborate." />
                  </div>

                  <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                      <p>
                        Please forward your application to <a href="mailto:info@ogeemo.com" className="font-semibold text-primary underline">info@ogeemo.com</a>. We will review it and follow up with next steps.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-muted-foreground">We review partnership applications on a rolling basis.</p>
                    <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold">
                      Send application
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
