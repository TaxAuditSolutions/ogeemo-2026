'use client';

import * as React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpTipProps {
    /** Short heading, e.g. "Recurring Billing". */
    title?: string;
    /** One to three sentences: What is this? Why use it? What next? */
    children: React.ReactNode;
    /** Learn Ogeemo destination for the "Learn more" link. */
    learnHref?: string;
    /** Label for the Learn more link. */
    learnLabel?: string;
    className?: string;
}

/**
 * Level 2 contextual help (docs/help-standard.md).
 *
 * A small ? control that opens only on user click — it never auto-opens and
 * never reopens after dismissal (a click-only popover cannot nag). Content
 * stays short and links deeper into Learn Ogeemo via `learnHref`, so help
 * always lands on the exact topic for the current screen instead of a generic
 * index. Place sparingly: only where explanation is genuinely useful.
 */
export function HelpTip({ title, children, learnHref, learnLabel = 'Learn more', className }: HelpTipProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={title ? `Help about ${title}` : 'Help'}
                    className={cn('h-7 w-7 shrink-0 rounded-full', className)}
                >
                    <HelpCircle className="h-4 w-4" aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 space-y-2 text-sm">
                {title && <p className="font-semibold text-foreground">{title}</p>}
                <div className="text-muted-foreground leading-relaxed">{children}</div>
                {learnHref && (
                    <Link
                        href={learnHref}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                        {learnLabel}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                )}
            </PopoverContent>
        </Popover>
    );
}
