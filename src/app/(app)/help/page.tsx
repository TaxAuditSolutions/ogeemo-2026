'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Compass, Scale, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * The single Help entry point (navigation tier: utilities). Every how-to
 * guide, principle page and the guided tour live here so the sidebar keeps
 * work destinations only — guidance never competes with navigation.
 */

const guideSections: { title: string; description: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Getting started',
    description: 'Start here if Ogeemo is new to you.',
    links: [
      { label: 'Learn Ogeemo — guided tour', href: '/learn' },
      { label: 'Customize Shortcuts', href: '/action-chips-info' },
      { label: 'Daily and weekly rituals', href: '/settings/rituals/instructions' },
    ],
  },
  {
    title: 'Workspace guides',
    description: 'How your day-to-day tools work.',
    links: [
      { label: 'Activity Manager guide', href: '/event-manager/instructions' },
      { label: 'Tasks, projects and GTD', href: '/event-manager/gtd-instructions' },
      { label: 'Calendar guide', href: '/calendar/instructions' },
      { label: 'Customize My Shortcuts', href: '/action-manager/manage/instructions' },
      { label: 'Document Manager guide', href: '/document-manager/instructions' },
      { label: 'Meetings guide', href: '/meetings/instructions' },
      { label: 'Projects guide', href: '/projects/instructions' },
    ],
  },
  {
    title: 'Accounting guides',
    description: 'Bookkeeping, invoices and tax workflows.',
    links: [
      { label: 'BKS bookkeeping guide', href: '/accounting/bks-instructions' },
      { label: 'Invoices guide', href: '/accounting/invoices/instructions' },
      { label: 'Quotes guide', href: '/accounting/quotes/instructions' },
      { label: 'Receipt Intake guide', href: '/accounting/receipt-processor/instructions' },
      { label: 'Accounting navigation guide', href: '/accounting/manage-navigation/instructions' },
    ],
  },
  {
    title: 'Administration guides',
    description: 'Managing people and workspaces.',
    links: [
      { label: 'User Manager guide', href: '/user-manager/instructions' },
      { label: 'User list guide', href: '/user-list/instructions' },
      { label: 'Tenant Manager guide', href: '/tenant-manager/instructions' },
    ],
  },
];

const principleLinks = [
  { label: 'Record Keeping Credo', href: '/philosophy/record-keeping', icon: Scale, description: 'How Ogeemo thinks about evidence and records.' },
  { label: 'Audit Ready', href: '/accounting/audit-readiness', icon: ShieldCheck, description: 'Building a defensible bookkeeping trail.' },
  { label: 'Mentor Mediation', href: '/support/mentor-mediation', icon: Compass, description: 'How mentor and mediation sessions work.' },
];

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Help &amp; Guides</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Everything that teaches Ogeemo lives here, so the sidebar stays focused on your work.
        </p>
      </header>

      {guideSections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              {section.title}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 sm:grid-cols-2">
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <span className="truncate">{link.label}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-primary" />
            Principles
          </CardTitle>
          <CardDescription>The ideas behind how Ogeemo is built.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {principleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className="h-4 w-4 text-primary" />
                  {link.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
