'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, ArrowRight, BookOpen, Sparkles, LayoutDashboard, Wand2, Users, Calendar,
  Landmark, Bot, HeartHandshake, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface LearnStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  links: Array<{ label: string; href: string }>;
}

const LEARN_STEPS: LearnStep[] = [
  {
    id: 'what-is-ogeemo',
    icon: Sparkles,
    title: 'What Ogeemo is',
    description:
      'One place for your whole operation — built on a record-keeping discipline: everything captured, everything findable. Start by reading the credo behind it.',
    links: [{ label: 'Read the Record-Keeping Credo', href: '/philosophy/record-keeping' }],
  },
  {
    id: 'action-manager',
    icon: LayoutDashboard,
    title: 'Start with My Shortcuts',
    description:
      'Your dashboard and the heartbeat of Ogeemo — tasks, actions, and your day at a glance. Spend real time here; everything else orbits it.',
    links: [{ label: 'Open My Shortcuts', href: '/action-manager' }],
  },
  {
    id: 'make-it-yours',
    icon: Wand2,
    title: 'Make it your own',
    description:
      'Shortcuts are one-click launchers that shape Ogeemo around the way you work. Learn them once, then shape the workspace around how you work.',
    links: [
      { label: 'Customize Shortcuts', href: '/action-chips-info' },
      { label: 'Customize My Shortcuts', href: '/action-manager/manage' },
    ],
  },
  {
    id: 'people-records',
    icon: Users,
    title: 'Your people & records',
    description:
      'Contacts is your data home — every person and relationship. The Document Manager keeps the paperwork right beside it.',
    links: [
      { label: 'Open Contacts', href: '/contacts' },
      { label: 'Open Document Manager', href: '/document-manager' },
    ],
  },
  {
    id: 'time-meetings',
    icon: Calendar,
    title: 'Time, tasks & meetings',
    description:
      'The Calendar, To-Do list, and Activity Manager keep your day moving — schedule, track, and never lose a follow-up.',
    links: [
      { label: 'Open the Calendar', href: '/calendar' },
      { label: 'Open To-Do', href: '/to-do' },
    ],
  },
  {
    id: 'money',
    icon: Landmark,
    title: 'The money side',
    description:
      'Invoices, quotes, receivables — and the Audit-Ready ledger that keeps you ahead of the tax conversation instead of behind it.',
    links: [
      { label: 'Open Accounting', href: '/accounting' },
      { label: 'Audit Ready', href: '/accounting/audit-readiness' },
    ],
  },
  {
    id: 'co-pilot',
    icon: Bot,
    title: 'Meet your Co-Pilot',
    description:
      'Your AI assistant — ask it anything about Ogeemo or your work. It is also a teacher when you get stuck.',
    links: [{ label: 'Open the Co-Pilot', href: '/co-pilot' }],
  },
  {
    id: 'people-behind',
    icon: HeartHandshake,
    title: 'The people behind Ogeemo',
    description:
      'You are not alone in here. Mentors, support, and mediation are one click away whenever you need a human.',
    links: [{ label: 'Mentor access & support', href: '/support/mentor-mediation' }],
  },
];

/** Every tool guide, as chapters of the Learn Ogeemo library (docs/help-standard.md). */
const LEARN_GUIDES: { group: string; guides: { slug: string; title: string; description: string }[] }[] = [
  {
    group: 'Workspace guides',
    guides: [
      { slug: 'activity-manager', title: 'Activity Manager', description: 'Plan and run your day: events, tasks, and follow-ups in one place.' },
      { slug: 'gtd', title: 'Tasks, projects and GTD', description: 'How work flows through Ogeemo, from idea to done.' },
      { slug: 'calendar', title: 'Calendar', description: 'Scheduling, reminders, and planning rituals on one calendar.' },
      { slug: 'meetings', title: 'Meetings & agendas', description: 'Build meeting agendas and send them to the calendar.' },
      { slug: 'projects', title: 'Projects', description: 'Group related work together and track it to completion.' },
      { slug: 'document-manager', title: 'Document Manager', description: 'Keep paperwork beside the records it belongs to.' },
      { slug: 'customize-shortcuts', title: 'Customize My Shortcuts', description: 'Choose the Ogeemo tools you want available from My Shortcuts.' },
      { slug: 'rituals', title: 'Daily & weekly rituals', description: 'Set up the routines that keep your business on schedule.' },
    ],
  },
  {
    group: 'Accounting guides',
    guides: [
      { slug: 'bookkeeping', title: 'BKS bookkeeping', description: 'How Ogeemo records money in and money out.' },
      { slug: 'invoices', title: 'Invoices', description: 'Create, send, and track invoices for your work.' },
      { slug: 'quotes', title: 'Quotes', description: 'Prepare quotes and turn them into invoices.' },
      { slug: 'receipt-intake', title: 'Receipt intake', description: 'Get receipts and statements into your books.' },
      { slug: 'accounting-navigation', title: 'Accounting navigation', description: 'Find your way around the accounting hub.' },
      { slug: 'inventory', title: 'Inventory', description: 'Add items, update stock, and read the transaction history.' },
    ],
  },
  {
    group: 'Administration guides',
    guides: [
      { slug: 'user-manager', title: 'User Manager', description: 'Add people and set what they can access.' },
      { slug: 'user-list', title: 'User list', description: 'See everyone who can sign in to your workspace.' },
      { slug: 'tenant-manager', title: 'Tenant Manager', description: 'Manage workspaces and how they connect.' },
    ],
  },
];

const PROGRESS_KEY = 'ogeemo-learn-progress';

export default function LearnOgeemoPage() {
  // useSearchParams (topic deep-links) requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LearnOgeemoContent />
    </Suspense>
  );
}

function LearnOgeemoContent() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Deep-link support: /learn?topic=<step-or-guide-id> scrolls to the entry
  // and rings it briefly, so contextual "Learn more" links land on the exact
  // topic instead of dropping users at the top of the page.
  useEffect(() => {
    if (!topic) return;
    const el = document.querySelector(`[data-topic="${CSS.escape(topic)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlighted(topic);
    const timer = window.setTimeout(() => setHighlighted(null), 4000);
    return () => window.clearTimeout(timer);
  }, [topic]);

  const storageKeyFor = useCallback(
    () => `${PROGRESS_KEY}-${user?.uid || 'anon'}`,
    [user]
  );

  useEffect(() => {
    try {
      // toggleStep writes ONE map keyed by user id under PROGRESS_KEY; read
      // the same shape here so progress survives reloads (the old lookup used
      // a per-user key that was never written).
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      setCompleted(new Set(all[user?.uid || 'anon'] ?? []));
    } catch {
      setCompleted(new Set());
    }
    setIsLoading(false);
  }, [storageKeyFor]);

  const toggleStep = useCallback(
    (stepId: string) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(stepId)) next.delete(stepId);
        else next.add(stepId);
        try {
          const raw = window.localStorage.getItem(PROGRESS_KEY);
          const data = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
          data[user?.uid || 'anon'] = Array.from(next);
          window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
        } catch {
          // Storage unavailable — progress stays in memory for this session.
        }
        return next;
      });
    },
    [user]
  );

  const completedCount = LEARN_STEPS.filter((step) => completed.has(step.id)).length;
  const progressPct = Math.round((completedCount / LEARN_STEPS.length) * 100);

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="outline" size="sm">
          <Link href="/welcome">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Welcome
          </Link>
        </Button>

        <header className="text-center mb-8 mt-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary">Learn Ogeemo</h1>
          <p className="text-muted-foreground">
            A guided path through the whole engine — in the order a person should meet it.
          </p>
        </header>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              {completedCount} of {LEARN_STEPS.length} steps complete
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="space-y-4 pb-6">
          {LEARN_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isDone = completed.has(step.id);
            return (
              <Card
                key={step.id}
                data-topic={step.id}
                className={`${isDone ? 'border-primary/30 bg-primary/5' : ''} ${highlighted === step.id ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="flex gap-4 p-5">
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => toggleStep(step.id)}
                    aria-label={`Mark "${step.title}" complete`}
                    className="mt-1"
                  />
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <StepIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        Step {index + 1}
                      </p>
                      <h3 className="font-bold text-primary">{step.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.links.map((link) => (
                          <Button key={link.href + link.label} asChild size="sm" variant="outline" className="h-8">
                            <Link href={link.href}>{link.label}</Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Level 3 library: every tool guide is a chapter here (help-standard). */}
        <div className="space-y-6 pb-6">
          <div className="text-center">
            <h2 className="text-xl font-bold font-headline text-primary">Guides</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deep dives into individual tools. Every ? in the app lands here.
            </p>
          </div>
          {LEARN_GUIDES.map((section) => (
            <div key={section.group} className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {section.group}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {section.guides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/learn/guides/${guide.slug}`}
                    data-topic={`guide-${guide.slug}`}
                    className={`group rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50 ${highlighted === `guide-${guide.slug}` ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{guide.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{guide.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pb-10 text-center">
          <p className="text-xs text-muted-foreground">
            Finished the path? You are ready for everyday work —{' '}
            <Link href="/welcome" className="underline">
              back to Welcome
            </Link>{' '}
            or straight to the{' '}
            <Link href="/action-manager" className="underline">
              My Shortcuts
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}