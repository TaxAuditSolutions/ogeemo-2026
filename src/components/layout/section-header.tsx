'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderParent {
  label: string;
  href: string;
}

interface SectionHeaderProps {
  /** Where the labelled back link goes — the page's parent destination. */
  parent: SectionHeaderParent;
  title: string;
  description?: string;
  /** Right-hand slot for page-level actions (e.g. a secondary link). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The shared back-link header for drill-down pages (navigation tier: in-page).
 * A labelled "← Parent" beats a generic Back button: the destination is
 * deterministic even for deep links, and it teaches the hierarchy. Lives at
 * the top-left of page content — the global header stays utilities-only.
 */
export function SectionHeader({ parent, title, description, actions, className }: SectionHeaderProps) {
  return (
    <header className={cn('space-y-3', className)}>
      <Link
        href={parent.href}
        className="group inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        {parent.label}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-headline text-primary">{title}</h1>
          {description && <p className="max-w-3xl text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
