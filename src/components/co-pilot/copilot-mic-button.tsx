'use client';

import * as React from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { appendTranscript } from '@/lib/transcript';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useUserPreferences } from '@/hooks/use-user-preferences';

/**
 * Voice-to-text mic that sits beside the Co-Pilot message field and dictates
 * straight into it. The floating GlobalDictation mic is for every other
 * field; this one stays next to the chat so it is never hidden by the panel.
 * Honors the Settings > Preferences "Voice Dictation" switch.
 */
export function CopilotMicButton({
    value,
    onChange,
    disabled = false,
}: {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
}) {
    const { preferences } = useUserPreferences();
    // The field's text when dictation started; the transcript is cumulative,
    // so the field is always base + transcript (never duplicated).
    const baseRef = React.useRef('');

    const handleTranscript = React.useCallback(
        (transcript: string) => onChange(appendTranscript(baseRef.current, transcript)),
        [onChange],
    );

    const { status, startListening, stopListening, isSupported } = useSpeechToText({
        onTranscript: handleTranscript,
    });
    const active = status !== 'idle';

    // Stop listening when the message is sent (the field is disabled while
    // the assistant is thinking).
    React.useEffect(() => {
        if (disabled && active) stopListening();
    }, [disabled, active, stopListening]);

    if (preferences?.showDictationButton === false || isSupported !== true) return null;

    const toggle = () => {
        if (active) {
            stopListening();
            return;
        }
        baseRef.current = value;
        startListening();
    };

    return (
        <Button
            type="button"
            size="icon"
            variant={active ? 'destructive' : 'outline'}
            className={cn('h-9 w-9 shrink-0', active && 'animate-pulse')}
            // Keep focus in the message field.
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            disabled={disabled && !active}
            aria-label={active ? 'Stop voice dictation' : 'Dictate your message'}
            title={active ? 'Stop voice dictation' : 'Dictate your message'}
        >
            {active ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
    );
}
