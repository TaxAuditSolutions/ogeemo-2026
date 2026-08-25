'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/landing/header';
import { SiteFooter } from '@/components/landing/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Building2, Briefcase, BookOpen, Users, Scale, Landmark, FileText } from 'lucide-react';

const solutionCards = [
  {
    title: 'For Small Businesses',
    description: 'One operating system for founders who need less chaos and more visibility.',
    href: '/for-small-businesses',
    icon: Building2,
  },
  {
    title: 'For Consultants',
    description: 'Turn project work, client communication, and profitability into one clear system.',
    href: '/for-consultants',
    icon: Briefcase,
  },
  {
    title: 'For Accountants',
    description: 'Keep client activity, compliance, and financial operations tightly aligned.',
    href: '/for-accountants',
    icon: Scale,
  },
  {
    title: 'For Bookkeepers',
    description: 'Bring bookkeeping, time, receipts, and reconciliation into one accurate flow.',
    href: '/for-bookkeepers',
    icon: BookOpen,
  },
  {
    title: 'For Virtual Assistants',
    description: 'Structure work, retain margins, and give every client an organized operating rhythm.',
    href: '/for-virtual-assistants',
    icon: Users,
  },
  {
    title: 'For Lawyers',
    description: 'Track client intake, work, deadlines, and trust-building operations without spreadsheet sprawl.',
    href: '/for-lawyers',
    icon: Landmark,
  },
  {
    title: 'For Paralegals',
    description: 'Organize evidence, deadlines, and case activity in one accountable workspace.',
    href: '/for-paralegals',
    icon: FileText,
  },
];

export default function SolutionsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b bg-slate-950 py-20 text-white">
          <div className="container mx-auto max-w-5xl px-4 text-center">
            <Badge className="mb-6 border border-primary/30 bg-primary/10 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              OGEEMO Solutions
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl font-orbitron uppercase text-primary">
              OGEEMO
            </h1>
            <p className="mt-4 text-2xl font-bold text-white/90 md:text-4xl">
              Built for the way real businesses work.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed">
              Ogeemo gives service businesses, operators, and professionals one operating system for work, accountability, and growth.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base font-bold">
                <Link href="/pricing">See Membership</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 border-white/20 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10">
                <Link href="/about">Learn Our Story</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl font-headline text-primary">
                Choose the workflow that fits your operation.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {solutionCards.map(({ title, description, href, icon: Icon }) => (
                <Card key={title} className="group border border-primary/10 bg-card shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-headline text-foreground">{title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed text-muted-foreground">
                      {description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 font-bold text-primary transition-colors hover:text-primary/80"
                    >
                      Explore this solution <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
