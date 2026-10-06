'use client';

import * as React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';

interface DictationButtonProps {
    /** Receives each final recognized phrase; caller decides how to merge. */
    onTranscript: (text: string) => void;
    /** What is being dictated, for aria-labels (e.g. "details"). */
    label?: string;
    className?: string;
}

type SpeechRecognitionLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((ev: any) => void) | null;
    onerror: ((ev: any) => void) | null;
    onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Voice-to-text for narrative fields (beta: low-friction documentation for
 * field workers - docs/activity-capture.md). Browser Web Speech API: tap to
 * record, speak, tap again to stop; recognized phrases are handed to the
 * caller for APPENDING (never replacing). Honors the existing Voice Dictation
 * preference and hides itself when the browser lacks speech recognition.
 */
export function DictationButton({ onTranscript, label = 'this field', className }: DictationButtonProps) {
    const { preferences } = useUserPreferences();
    const [isRecording, setIsRecording] = React.useState(false);
    const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
    const wantsRecordingRef = React.useRef(false);

    const supported = React.useMemo(() => !!getSpeechRecognition(), []);

    React.useEffect(() => {
        return () => {
            wantsRecordingRef.current = false;
            try {
                recognitionRef.current?.stop();
            } catch {
                // Recognition may already be stopped.
            }
        };
    }, []);

    if (!preferences?.showDictationButton || !supported) return null;

    const handleToggle = () => {
        if (isRecording) {
            wantsRecordingRef.current = false;
            setIsRecording(false);
            try {
                recognitionRef.current?.stop();
            } catch {
                // Already stopped.
            }
            return;
        }
        const Ctor = getSpeechRecognition();
        if (!Ctor) return;
        const recognition = new Ctor();
        recognition.lang = navigator.language || 'en';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            if (result?.isFinal) {
                onTranscript(result[0]?.transcript ?? '');
            }
        };
        recognition.onerror = () => {
            wantsRecordingRef.current = false;
            setIsRecording(false);
        };
        recognition.onend = () => {
            // Browsers stop after silence; keep listening until the user taps again.
            if (wantsRecordingRef.current) {
                try {
                    recognition.start();
                } catch {
                    // Restart raced with a manual stop.
                }
            } else {
                setIsRecording(false);
            }
        };
        recognitionRef.current = recognition;
        wantsRecordingRef.current = true;
        try {
            recognition.start();
            setIsRecording(true);
        } catch {
            wantsRecordingRef.current = false;
            setIsRecording(false);
        }
    };

    return (
        <Button
            type="button"
            variant={isRecording ? 'destructive' : 'ghost'}
            size="icon"
            onClick={handleToggle}
            aria-label={isRecording ? `Stop dictating ${label}` : `Dictate ${label}`}
            title={isRecording ? 'Stop dictation' : 'Dictate with your voice'}
            className={cn('h-7 w-7 shrink-0', className)}
        >
            <Mic className={cn('h-4 w-4', isRecording && 'animate-pulse')} />
        </Button>
    );
}
