'use client';

import * as React from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appendTranscript } from '@/lib/transcript';
import { pickDictationField } from '@/lib/dictation-target';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useToast } from '@/hooks/use-toast';

/**
 * One microphone, any field (docs/activity-capture.md).
 *
 * Beta feedback: per-field mic buttons were not intuitive. This floating mic
 * dictates into the focused text field, or the last field the user touched
 * (clicking the mic does not steal focus), falling back to the Activity
 * Manager Details field; if nothing sensible is selected it says so instead
 * of silently recording into the void.
 */

/** Set a field through React's controlled-value pathway (native setter + input event). */
function setField(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
        setter.call(el, value);
    } else {
        el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function fieldLabel(el: HTMLElement): string {
    if (el.id && typeof document !== 'undefined') {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        const text = label?.textContent?.trim();
        if (text) return text;
    }
    if (el instanceof HTMLTextAreaElement && el.placeholder) return el.placeholder;
    return 'selected field';
}

export function GlobalDictation() {
    const { preferences } = useUserPreferences();
    const { toast } = useToast();
    const [targetLabel, setTargetLabel] = React.useState<string | null>(null);
    const lastFieldRef = React.useRef<HTMLElement | null>(null);
    const sessionElRef = React.useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
    const sessionBaseRef = React.useRef('');
    const noTargetToastShownRef = React.useRef(false);

    // The hook emits the cumulative session transcript; the field always shows
    // the value captured when the session started plus that transcript, so
    // prior content is preserved and never duplicated.
    const handleTranscript = React.useCallback((transcript: string) => {
        const el = sessionElRef.current;
        if (!el) return;
        setField(el, appendTranscript(sessionBaseRef.current, transcript));
    }, []);

    const { status, startListening, stopListening, isSupported } = useSpeechToText({
        onTranscript: handleTranscript,
    });

    // Remember the last text field the user touched so mic-first users still
    // land in the right place (clicking the mic moves focus to the button).
    React.useEffect(() => {
        const onFocusIn = (e: FocusEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) lastFieldRef.current = t;
        };
        document.addEventListener('focusin', onFocusIn);
        return () => document.removeEventListener('focusin', onFocusIn);
    }, []);

    const showButton = preferences?.showDictationButton !== false;
    const active = status !== 'idle';

    if (!showButton || isSupported !== true) return null;

    const resolveTarget = () =>
        pickDictationField<HTMLTextAreaElement | HTMLInputElement>(
            document.activeElement,
            lastFieldRef.current,
            document.getElementById('notes'),
        );

    const promptSelectField = () => {
        if (noTargetToastShownRef.current) return;
        noTargetToastShownRef.current = true;
        toast({
            title: 'Voice dictation',
            description: 'Select a text field first, then tap the microphone.',
        });
    };

    const toggle = () => {
        if (active) {
            stopListening();
            return;
        }
        const target = resolveTarget();
        if (!target) {
            promptSelectField();
            return;
        }
        noTargetToastShownRef.current = false;
        // Lock the target for this session: later focus moves (e.g. to the
        // mic button itself) must not redirect the dictation.
        sessionElRef.current = target;
        sessionBaseRef.current = target.value;
        setTargetLabel(fieldLabel(target));
        startListening();
    };

    return (
        <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 sm:bottom-6 sm:right-6">
            {active && (
                <span
                    role="status"
                    className="max-w-[10rem] truncate rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                >
                    Listening &rarr; {targetLabel ?? 'selected field'}
                </span>
            )}
            <button
                type="button"
                // Keep focus where the user put it: clicking the mic must not
                // blur the field it is about to write into.
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggle}
                aria-label={active ? 'Stop voice dictation' : 'Start voice dictation'}
                title={active ? 'Stop voice dictation' : 'Dictate into the selected field'}
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors',
                    active
                        ? 'animate-pulse bg-destructive text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
            >
                {active ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
        </div>
    );
}
