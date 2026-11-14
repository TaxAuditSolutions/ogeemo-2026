'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appendTranscript } from '@/lib/transcript';
import { pickDictationField } from '@/lib/dictation-target';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useToast } from '@/hooks/use-toast';
import { useOgeemoCopilotSidebar } from '@/context/ogeemo-copilot-sidebar-context';

/**
 * One microphone, any field (docs/activity-capture.md).
 *
 * Beta feedback: per-field mic buttons were not intuitive. This floating mic
 * dictates into the focused text field, or the last field the user touched
 * (clicking the mic does not steal focus), falling back to the Activity
 * Manager Notes field; if nothing sensible is selected it says so instead
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

interface DialogHost {
    el: HTMLElement;
    /** The dialog is the Co-Pilot drawer, which has its own mic. */
    hasOwnMic: boolean;
}

const OPEN_DIALOG_SELECTOR = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
const TEXT_FIELD_SELECTOR =
    'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"])';

/** The topmost open modal that has a text field to dictate into, if any. */
function findDialogHost(doc: Document): DialogHost | null {
    const open = doc.querySelectorAll<HTMLElement>(OPEN_DIALOG_SELECTOR);
    const el = open.length > 0 ? open[open.length - 1] : null;
    if (!el) return null;
    if (el.querySelector('[aria-label="Message Ogeemo Co-Pilot"]')) return { el, hasOwnMic: true };
    if (!el.querySelector(TEXT_FIELD_SELECTOR)) return null;
    return { el, hasOwnMic: false };
}

export function GlobalDictation() {
    const { preferences } = useUserPreferences();
    const copilot = useOgeemoCopilotSidebar();
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

    // A modal dialog (Add Task, Edit Contact, ...) switches off clicks on
    // everything outside it and draws its overlay over the page, so the
    // floating mic would be unreachable. While one is open, the mic moves
    // into the dialog itself: inside the dialog it is clickable and counts as
    // "inside" for the outside-click rule, so it does not close the dialog.
    const [dialogHost, setDialogHost] = React.useState<DialogHost | null>(null);
    React.useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const next = findDialogHost(document);
            setDialogHost((prev) =>
                prev?.el === next?.el && prev?.hasOwnMic === next?.hasOwnMic ? prev : next,
            );
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };
        update();
        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-state'],
        });
        return () => {
            observer.disconnect();
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    const showButton = preferences?.showDictationButton !== false;
    const active = status !== 'idle';

    if (!showButton || isSupported !== true) return null;
    // The Co-Pilot drawer already has its own mic beside the chat field.
    if (dialogHost?.hasOwnMic) return null;

    const resolveTarget = () => {
        // With a dialog open, only its own fields are valid targets: a field
        // behind the overlay (last touched before the dialog opened) must
        // never receive the words.
        const host = dialogHost?.el ?? null;
        const within = (el: Element | null): Element | null =>
            host ? (el && host.contains(el) ? el : null) : el;
        return pickDictationField<HTMLTextAreaElement | HTMLInputElement>(
            within(document.activeElement),
            within(lastFieldRef.current),
            host ? null : document.getElementById('notes'),
        );
    };

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

    // On desktop the Co-Pilot panel owns the right edge, so sit just left of
    // it (it has its own mic beside the chat field) instead of on top of it.
    const rightOffset = copilot.isMobile ? undefined : copilot.layoutWidth + 24;

    const inDialog = Boolean(dialogHost);

    const control = (
        <div
            className={
                inDialog
                    ? 'absolute right-12 top-3 z-[60] flex items-center gap-2'
                    : 'fixed bottom-20 right-4 z-50 flex items-center gap-2 sm:bottom-6 sm:right-6'
            }
            style={inDialog || rightOffset === undefined ? undefined : { right: rightOffset }}
        >
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
                    'flex items-center justify-center rounded-full shadow-lg transition-colors',
                    inDialog ? 'h-9 w-9' : 'h-12 w-12',
                    active
                        ? 'animate-pulse bg-destructive text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
            >
                {active ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
        </div>
    );

    return dialogHost ? createPortal(control, dialogHost.el) : control;
}
