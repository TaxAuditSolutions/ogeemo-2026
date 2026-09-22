'use client';

import type { AssistantContactDraft, AssistantContactDraftPatch } from '@/ai/assistant-actions';

type CopilotWorkflowEventMap = {
    'copilot:navigate': { target: string };
    'copilot:open_contact_form': { draft?: Partial<AssistantContactDraft> };
    'copilot:update_contact_draft': { patch: AssistantContactDraftPatch };
    'copilot:submit_contact_form': undefined;
};

export type CopilotWorkflowEventName = keyof CopilotWorkflowEventMap;

export function dispatchCopilotWorkflowEvent<EventName extends CopilotWorkflowEventName>(
    eventName: EventName,
    detail: CopilotWorkflowEventMap[EventName],
): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function subscribeToCopilotWorkflowEvent<EventName extends CopilotWorkflowEventName>(
    eventName: EventName,
    listener: (detail: CopilotWorkflowEventMap[EventName]) => void,
): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const handleEvent = (event: Event) => {
        listener((event as CustomEvent<CopilotWorkflowEventMap[EventName]>).detail);
    };
    window.addEventListener(eventName, handleEvent);
    return () => window.removeEventListener(eventName, handleEvent);
}
