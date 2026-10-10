'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Building2, Palette, PanelLeft, Settings, Workflow, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * "Make It Your Own" — the personalization pathway from the home screen
 * (beta feedback: personalization should be a primary user pathway, with AI
 * supporting rather than replacing it). An intro that routes to where
 * personalization actually lives (Customize My Shortcuts, Workflows and
 * Settings) instead of duplicating those controls.
 */

const personalizeSections: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: { label: string; href: string }[];
}[] = [
  {
    title: 'Your shortcuts',
    description: "Add, remove and reorder shortcuts — they appear on your dashboard and in the sidebar's Shortcuts section.",
    icon: Zap,
    links: [
      { label: 'Customize your dashboard', href: '/action-manager/manage' },
      { label: 'Read the Customize Shortcuts guide', href: '/action-chips-info' },
    ],
  },
  {
    title: 'Your workflows',
    description: 'Create named, ordered workflows — e.g. Bookkeeping or Quotes — from any destinations, then apply one so the sidebar Workspace follows your way of working. Start from a ready-made template (Accountant, Lawyer, Consultant and more) or build your own. Restore the default anytime.',
    icon: Workflow,
    links: [
      { label: 'Create a workflow', href: '/workflows' },
      { label: 'Start from a template', href: '/workflows?templates=1' },
    ],
  },
  {
    title: 'Your sidebar',
    description: 'Choose what the left sidebar shows: Groups, Full Menu or Favorite Actions — and whether Shortcuts starts expanded.',
    icon: PanelLeft,
    links: [{ label: 'Open the Sidebar Layout card in Settings', href: '/settings' }],
  },
  {
    title: 'Your header & identity',
    description: 'Turn the workspace button, role badge and home banner on or off — each button tooltip points here too.',
    icon: Building2,
    links: [{ label: 'Open Header & Identity in Settings', href: '/settings' }],
  },
  {
    title: 'Your look',
    description: 'Pick the theme colors and visual identity for your workspace.',
    icon: Palette,
    links: [{ label: 'Open Visual Identity in Settings', href: '/settings' }],
  },
  {
    title: 'Settings',
    description: 'Manage your profile, preferences and defaults — voice dictation, button tips, tax rate and planning rituals.',
    icon: Settings,
    links: [{ label: 'Open Settings', href: '/settings' }],
  },
  {
    title: 'Learn it first',
    description: 'The Make it your own chapter in Learn walks through each option step by step.',
    icon: BookOpen,
    links: [{ label: 'Open the Learn chapter', href: '/learn' }],
  },
];

export default function MakeItYourOwnPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/welcome">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Welcome
        </Link>
      </Button>

      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Make It Your Own</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Ogeemo adapts to how you work. Each area below opens where that personalization lives — your choices save to your account.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {personalizeSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.links.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="group flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                  >
                    <span className="truncate">{link.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
