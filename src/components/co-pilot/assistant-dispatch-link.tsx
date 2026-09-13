'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AssistantMessageAction } from '@/ai/assistant-actions';

type AssistantDispatchAction = Extract<AssistantMessageAction, { type: 'dispatch' }>;

export function AssistantDispatchLink({ action }: { action: AssistantDispatchAction }) {
    if (action.isExternal) {
        return (
            <Button asChild type="button" size="sm" className="h-8 max-w-full">
                <a href={action.target} target="_blank" rel="noopener noreferrer">
                    <span className="truncate">{action.label}</span>
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 shrink-0" />
                </a>
            </Button>
        );
    }

    return (
        <Button asChild type="button" size="sm" className="h-8 max-w-full">
            <Link href={action.target}>
                <span className="truncate">{action.label}</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0" />
            </Link>
        </Button>
    );
}