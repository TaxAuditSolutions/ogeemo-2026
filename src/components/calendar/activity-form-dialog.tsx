'use client';

import * as React from 'react';
import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActivityFormFields } from '@/components/time/activity-form-fields';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useActivityForm } from '@/hooks/use-activity-form';
import { useActivityReferenceData, type ActivityReferenceData } from '@/hooks/use-activity-reference-data';
import { computeDurationAndSource } from '@/lib/duration-source';
import { addTask } from '@/services/project-service';
import { type Event as TaskEvent } from '@/types/calendar-types';

interface ActivityFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after the entry is saved (the dialog has already been asked to close). */
    onSaved: () => void;
}

/**
 * Modal version of the Activity Manager form for creating a calendar entry.
 * It opens scheduled for the current system date and time slot.
 */
export function ActivityFormDialog({ open, onOpenChange, onSaved }: ActivityFormDialogProps) {
    // Reference lists load on first open and are kept across re-opens.
    const data = useActivityReferenceData(open);
    const subjectInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[90vh] max-w-4xl overflow-y-auto"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    subjectInputRef.current?.focus();
                }}
            >
                <ActivityFormDialogBody
                    data={data}
                    subjectInputRef={subjectInputRef}
                    onCancel={() => onOpenChange(false)}
                    onSaved={() => {
                        onOpenChange(false);
                        onSaved();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}

interface ActivityFormDialogBodyProps {
    data: ActivityReferenceData;
    subjectInputRef: React.Ref<HTMLInputElement>;
    onCancel: () => void;
    onSaved: () => void;
}

// Mounted only while the dialog is open, so every open starts from a fresh
// form defaulted to the current date and time.
function ActivityFormDialogBody({ data, subjectInputRef, onCancel, onSaved }: ActivityFormDialogBodyProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const form = useActivityForm({ activityType: 'appointment', scheduleNow: true });
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!user || !form.subject.trim()) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter a subject for the event.' });
            return;
        }
        setIsSaving(true);
        try {
            const { durationSeconds, source } = computeDurationAndSource({
                sessions: [],
                elapsedSeconds: 0,
                scheduledSpanSeconds: form.scheduledSpanSeconds,
            });
            const eventData = form.buildEventData({ duration: durationSeconds, durationSource: source, sessions: [] });
            await addTask({ ...(eventData as Omit<TaskEvent, 'id'>), userId: user.uid });
            toast({ title: 'Event Saved' });
            onSaved();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to save event', description: error.message });
            setIsSaving(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>New Calendar Entry</DialogTitle>
                <DialogDescription>
                    Scheduled for right now by default. Adjust the date and time as needed.
                </DialogDescription>
            </DialogHeader>
            <ActivityFormFields form={form} data={data} subjectInputRef={subjectInputRef} />
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" /> Create Activity
                </Button>
            </DialogFooter>
        </>
    );
}
