'use client';

import * as React from 'react';
import { set } from 'date-fns';

import { useAuth } from '@/context/auth-context';
import { type ActivityType, type Event as TaskEvent, type TaskStatus, type TimeSession } from '@/types/calendar-types';
import { type DurationSource } from '@/lib/duration-source';
import { presetHourValue, presetMinuteValue, resolveScheduledWindow } from '@/lib/schedule-dates';
import { findNextFreeSlot } from '@/lib/next-free-slot';

export interface ActivityFormOptions {
    /** Starting stored activity type (default: task). There is no on-screen type chooser. */
    activityType?: ActivityType;
    /**
     * Open with the Schedule switch on and Start set to the current system
     * date and time slot. Default is unscheduled, as on the Activity Manager page.
     */
    scheduleNow?: boolean;
    /**
     * Open scheduled for the next free slot in the calendar instead (applied
     * once `calendarReady` is true, and again after `resetForm`). It follows the
     * assignee and calendar changes until the user picks a time themselves.
     */
    suggestSlot?: boolean;
    /** The calendar searched for a free slot. */
    calendarEvents?: TaskEvent[];
    /** True once `calendarEvents` has finished loading. */
    calendarReady?: boolean;
}

/**
 * Form state for the Activity Manager "activity" form, shared by the page and
 * the Calendar's Add dialog so both save identical records.
 */
// A stable default: a fresh `[]` per render would re-run the slot effect forever.
const NO_EVENTS: TaskEvent[] = [];

export function useActivityForm({
    activityType: initialActivityType = 'task',
    scheduleNow = false,
    suggestSlot = false,
    calendarEvents = NO_EVENTS,
    calendarReady = false,
}: ActivityFormOptions = {}) {
    const { user } = useAuth();

    const [subject, setSubject] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [activityType, setActivityType] = React.useState<ActivityType>(initialActivityType);
    const [status, setStatus] = React.useState<TaskStatus>('todo');
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);
    const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(null);
    const [isBillable, setIsBillable] = React.useState(false);
    const [billableRate, setBillableRate] = React.useState<number | ''>(100);

    // isScheduleEnabled is the Schedule toggle: OFF means the activity is saved
    // unscheduled (no start/end, isScheduled false). Dates stay warm while
    // toggled off so re-enabling restores what the user picked.
    const [isScheduleEnabled, setIsScheduleEnabled] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
    const [startHour, setStartHour] = React.useState<string | undefined>(undefined);
    const [startMinute, setStartMinute] = React.useState<string | undefined>(undefined);
    const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
    const [endHour, setEndHour] = React.useState<string | undefined>(undefined);
    const [endMinute, setEndMinute] = React.useState<string | undefined>(undefined);
    const [isAllDay, setIsAllDay] = React.useState(false);

    // Has the user chosen Start themselves? Untouched Start still carries the
    // mount-time preset (page-load hour), which must refresh to *now* when the
    // scheduling section opens or a save happens - touched Start (or a Start
    // loaded from an existing event) is never overwritten.
    const startDateTouchedRef = React.useRef(false);
    const startTimeTouchedRef = React.useRef(false);

    // True while the Start/End on show came from the next-free-slot search and
    // the user has not changed them. The "When" band uses it to say so.
    const [isSlotSuggested, setIsSlotSuggestedState] = React.useState(false);
    // Mirrors the state so the follow-up effect can read it without re-running
    // every time a suggestion is applied.
    const slotSuggestedRef = React.useRef(false);
    const setIsSlotSuggested = React.useCallback((value: boolean) => {
        slotSuggestedRef.current = value;
        setIsSlotSuggestedState(value);
    }, []);
    const slotAppliedRef = React.useRef(false);
    const [slotResetTick, setSlotResetTick] = React.useState(0);

    // Client-side only so server and client renders agree.
    React.useEffect(() => {
        const now = new Date();
        setStartDate(now);
        setStartHour(presetHourValue(now));
        setStartMinute(presetMinuteValue(now));

        // End time is left empty by default; a scheduled-now form only gets the
        // same-day End date that opening the Schedule switch would give it.
        setEndDate(scheduleNow ? now : undefined);
        setEndHour(undefined);
        setEndMinute(undefined);
        if (scheduleNow) setIsScheduleEnabled(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (user?.uid) setSelectedWorkerId((current) => current ?? user.uid);
    }, [user?.uid]);

    // Opening the Schedule section pre-fills it with *now*: Start and End on
    // the current day, Start's clock time to the current time. Untouched values
    // are REFRESHED here - anything the user chose, or that was loaded from an
    // existing event, is never overwritten.
    const applyScheduleDefaults = () => {
        const now = new Date();
        const startFinal = startDateTouchedRef.current ? (startDate ?? now) : now;
        if (!startDateTouchedRef.current) setStartDate(now);
        if (!endDate) setEndDate(startFinal);
        if (!startTimeTouchedRef.current) {
            setStartHour(presetHourValue(now));
            setStartMinute(presetMinuteValue(now));
        }
    };

    // Next free slot: the first gap long enough in the assignee's calendar,
    // inside working hours (see lib/next-free-slot). Start is marked as chosen
    // so a save keeps it instead of refreshing it to "now". Returns false when
    // the calendar has no room in the search window.
    const slotWorkerId = selectedWorkerId ?? user?.uid ?? null;
    const applySuggestedSlot = React.useCallback((): boolean => {
        const mine = calendarEvents.filter((event) => (event.workerId ?? event.userId) === slotWorkerId);
        const slot = findNextFreeSlot({ events: mine, now: new Date() });
        if (!slot) return false;
        setIsScheduleEnabled(true);
        setIsAllDay(false);
        setStartDate(slot.start);
        setStartHour(presetHourValue(slot.start));
        setStartMinute(presetMinuteValue(slot.start));
        // End date mirrors Start exactly (as applyScheduleDefaults does) so it
        // keeps following Start if the user picks another day.
        setEndDate(new Date(slot.start));
        setEndHour(presetHourValue(slot.end));
        setEndMinute(presetMinuteValue(slot.end));
        startDateTouchedRef.current = true;
        startTimeTouchedRef.current = true;
        setIsSlotSuggested(true);
        return true;
    }, [calendarEvents, slotWorkerId, setIsSlotSuggested]);

    // First apply once the calendar has loaded; afterwards re-apply (new
    // assignee, refreshed calendar) only while the user has not touched the time.
    React.useEffect(() => {
        if (!suggestSlot || !calendarReady || !slotWorkerId) return;
        if (!slotAppliedRef.current) {
            slotAppliedRef.current = true;
            applySuggestedSlot();
        } else if (slotSuggestedRef.current) {
            applySuggestedSlot();
        }
    }, [suggestSlot, calendarReady, slotWorkerId, applySuggestedSlot, slotResetTick]);

    // The three "When" choices.
    const selectNextFreeSlot = (): boolean => applySuggestedSlot();
    const selectPickTime = () => {
        setIsSlotSuggested(false);
        if (!isScheduleEnabled) {
            setIsScheduleEnabled(true);
            applyScheduleDefaults();
        }
    };
    const selectNoSetTime = () => {
        setIsSlotSuggested(false);
        setIsScheduleEnabled(false);
    };

    const handleScheduleToggle = (enabled: boolean) => {
        setIsScheduleEnabled(enabled);
        if (enabled) applyScheduleDefaults();
    };

    // Planned start/end span in seconds (0 when unavailable or all-day). This
    // is a calendar/planning value only - it is never billed on its own.
    const scheduledSpanSeconds = React.useMemo(() => {
        if (isScheduleEnabled && startDate && startHour && startMinute && endDate && endHour && endMinute && !isAllDay) {
            const s = set(startDate, { hours: parseInt(startHour), minutes: parseInt(startMinute), seconds: 0, milliseconds: 0 });
            const e = set(endDate, { hours: parseInt(endHour), minutes: parseInt(endMinute), seconds: 0, milliseconds: 0 });
            if (e > s) return (e.getTime() - s.getTime()) / 1000;
        }
        return 0;
    }, [isScheduleEnabled, startDate, startHour, startMinute, endDate, endHour, endMinute, isAllDay]);

    // Length of the planned window in whole minutes, for the "When" band.
    const scheduledMinutes = Math.round(scheduledSpanSeconds / 60);

    const resolveSchedule = React.useCallback(
        () =>
            resolveScheduledWindow({
                enabled: isScheduleEnabled,
                startDate,
                endDate,
                isAllDay,
                startTimeTouched: startTimeTouchedRef.current,
                startHour,
                startMinute,
                endHour,
                endMinute,
                now: new Date(),
            }),
        [isScheduleEnabled, startDate, startHour, startMinute, endDate, endHour, endMinute, isAllDay],
    );

    const buildEventData = React.useCallback(
        (extra: { duration: number; durationSource: DurationSource | null; sessions: TimeSession[] }): Partial<Omit<TaskEvent, 'id' | 'userId'>> => {
            const { start, end, isScheduled } = resolveSchedule();
            return {
                title: subject,
                description: notes,
                start,
                end,
                isScheduled,
                status,
                projectId: selectedProjectId === 'inbox' ? null : selectedProjectId,
                contactId: selectedContactId,
                workerId: selectedWorkerId || user?.uid,
                duration: extra.duration,
                durationSource: extra.durationSource,
                sessions: extra.sessions,
                isBillable,
                billableRate: isBillable ? (Number(billableRate) || 0) : 0,
                activityType,
            };
        },
        [resolveSchedule, subject, notes, status, selectedProjectId, selectedContactId, selectedWorkerId, user?.uid, isBillable, billableRate, activityType],
    );

    const resetForm = React.useCallback(() => {
        const now = new Date();
        setSubject(''); setNotes(''); setSelectedProjectId(null); setSelectedContactId(null);
        setActivityType('task'); setStatus('todo'); setIsScheduleEnabled(false);
        setIsBillable(false); setBillableRate(100); setStartDate(now);
        setStartHour(presetHourValue(now)); setStartMinute(presetMinuteValue(now));
        startDateTouchedRef.current = false; startTimeTouchedRef.current = false;
        setEndDate(undefined); setEndHour(undefined); setEndMinute(undefined);
        setIsAllDay(false);
        // Start over from the calendar's next free slot (when suggesting).
        setIsSlotSuggested(false);
        slotAppliedRef.current = false;
        setSlotResetTick((tick) => tick + 1);
    }, [setIsSlotSuggested]);

    return {
        subject, setSubject,
        notes, setNotes,
        activityType, setActivityType,
        status, setStatus,
        selectedProjectId, setSelectedProjectId,
        selectedContactId, setSelectedContactId,
        selectedWorkerId, setSelectedWorkerId,
        isBillable, setIsBillable,
        billableRate, setBillableRate,
        isScheduleEnabled, setIsScheduleEnabled,
        startDate, setStartDate,
        startHour, setStartHour,
        startMinute, setStartMinute,
        endDate, setEndDate,
        endHour, setEndHour,
        endMinute, setEndMinute,
        isAllDay, setIsAllDay,
        startDateTouchedRef,
        startTimeTouchedRef,
        isSlotSuggested, setIsSlotSuggested,
        selectNextFreeSlot,
        scheduledMinutes,
        selectPickTime,
        selectNoSetTime,
        applyScheduleDefaults,
        handleScheduleToggle,
        scheduledSpanSeconds,
        resolveSchedule,
        buildEventData,
        resetForm,
    };
}

export type ActivityFormState = ReturnType<typeof useActivityForm>;
