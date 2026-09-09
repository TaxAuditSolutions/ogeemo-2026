'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, BookOpen, Sparkles, LayoutDashboard, Wand2, Users, Calendar,
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
    title: 'Master the Action Manager',
    description:
      'Your dashboard and the heartbeat of Ogeemo — tasks, actions, and your day at a glance. Spend real time here; everything else orbits it.',
    links: [{ label: 'Open the Action Manager', href: '/action-manager' }],
  },
  {
    id: 'make-it-yours',
    icon: Wand2,
    title: 'Make it your own',
    description:
      'Action Chips are programmable shortcuts that shape Ogeemo around the way you work. Learn them once, then sculpt your workspace.',
    links: [
      { label: 'Action Chip Magic', href: '/action-chips-info' },
      { label: 'Action Manager Settings', href: '/action-manager/manage' },
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
      'The Calendar, To-Do list, and Event Manager keep your day moving — schedule, track, and never lose a follow-up.',
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

const PROGRESS_KEY = 'ogeemo-learn-progress';

export default function LearnOgeemoPage() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const storageKeyFor = useCallback(
    () => `${PROGRESS_KEY}-${user?.uid || 'anon'}`,
    [user]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKeyFor());
      setCompleted(new Set(raw ? (JSON.parse(raw) as string[]) : []));
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
        <Button asChild variant="ghost" size="sm">
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
              <Card key={step.id} className={isDone ? 'border-primary/30 bg-primary/5' : ''}>
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

        <div className="pb-10 text-center">
          <p className="text-xs text-muted-foreground">
            Finished the path? You are ready for daily orchestration —{' '}
            <Link href="/welcome" className="underline">
              back to Welcome
            </Link>{' '}
            or straight to the{' '}
            <Link href="/action-manager" className="underline">
              Action Manager
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}