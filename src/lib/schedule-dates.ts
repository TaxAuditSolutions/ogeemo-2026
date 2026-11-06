import { addMinutes, endOfDay, set, startOfDay } from 'date-fns';

/**
 * Should the End date of a schedule still follow the Start date?
 *
 * Beta UX request: End should autopopulate to the same day as Start. The save
 * path already defaults `endDate || startDate`, so this is purely about what
 * the picker shows - but a naive "always mirror" would stomp a deliberately
 * chosen multi-day End when the user later tweaks Start. Rule: mirror only
 * while End is empty, or still exactly the Start value it was derived from.
 */
export function endFollowsStart(prevStart: Date | undefined | null, end: Date | undefined | null): boolean {
    if (!end) return true; // nothing chosen yet - safe to fill/clear
    if (!prevStart) return false; // End chosen before Start: user's choice - keep
    return end.getTime() === prevStart.getTime(); // still the auto-derived value
}

/**
 * Preset values for the Scheduling time selects when the advanced section is
 * opened: Start gets the current clock time (hour select uses '00'-'23',
 * minute select steps by 5, floored so the default is never a future time).
 */
export function presetHourValue(now: Date): string {
    return String(now.getHours()).padStart(2, '0');
}

export function presetMinuteValue(now: Date, step = 5): string {
    const minutes = Math.floor(now.getMinutes() / step) * step;
    return String(minutes).padStart(2, '0');
}

/**
 * Clock values for a scheduled Start: the user's chosen hour/minute when they
 * made one, otherwise *now*. An untouched Start still carries the mount-time
 * preset (page load), which is stale later - a tab opened at 9 AM saving at
 * 2 PM should start at 2 PM, not 9 AM.
 */
export function resolveStartClock(
    now: Date,
    touched: boolean,
    hour: string | undefined,
    minute: string | undefined,
): { hour: number; minute: number } {
    if (touched && hour) {
        return { hour: parseInt(hour, 10), minute: minute ? parseInt(minute, 10) : now.getMinutes() };
    }
    return { hour: now.getHours(), minute: now.getMinutes() };
}

/**
 * End-time default for time-logging dialogs: one hour after *now* (minute
 * floored to the 5-minute step), clamped to 23:55 so End stays inside the
 * same day - replacing the old hardcoded 17:00 that broke evening entries.
 */
export function oneHourLaterValue(now: Date): { hour: string; minute: string } {
    const startMinutes = now.getHours() * 60 + Math.floor(now.getMinutes() / 5) * 5;
    const total = Math.min(startMinutes + 60, 23 * 60 + 55);
    return { hour: String(Math.floor(total / 60)).padStart(2, '0'), minute: String(total % 60).padStart(2, '0') };
}

export interface ScheduleWindowInput {
    /** The Schedule switch. */
    enabled: boolean;
    startDate: Date | undefined;
    endDate: Date | undefined;
    isAllDay: boolean;
    startTimeTouched: boolean;
    startHour: string | undefined;
    startMinute: string | undefined;
    endHour: string | undefined;
    endMinute: string | undefined;
    now: Date;
}

/**
 * The start/end an activity form saves for its Schedule section. Shared by the
 * Activity Manager page and the Calendar's Add dialog.
 * - Switch off (or no Start date): unscheduled - no start/end.
 * - All-day: start of the Start day to end of the End day (default: same day).
 * - Otherwise: an untouched Start clock means *now* (see resolveStartClock); a
 *   missing End clock reuses Start's, and an End at or before Start becomes
 *   Start + 30 minutes.
 */
export function resolveScheduledWindow(input: ScheduleWindowInput): { start?: Date; end?: Date; isScheduled: boolean } {
    const { enabled, startDate, endDate, isAllDay, startTimeTouched, startHour, startMinute, endHour, endMinute, now } = input;
    if (!enabled || !startDate) return { isScheduled: false };
    if (isAllDay) {
        return { start: startOfDay(startDate), end: endOfDay(endDate || startDate), isScheduled: true };
    }
    const clock = resolveStartClock(now, startTimeTouched, startHour, startMinute);
    const start = set(startDate, { hours: clock.hour, minutes: clock.minute });
    let end = set(endDate || startDate, {
        hours: endHour ? parseInt(endHour, 10) : clock.hour,
        minutes: endMinute ? parseInt(endMinute, 10) : clock.minute,
    });
    if (end <= start) end = addMinutes(start, 30);
    return { start, end, isScheduled: true };
}
