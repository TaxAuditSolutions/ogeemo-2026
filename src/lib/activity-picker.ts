import { type Event as TaskEvent } from '@/types/calendar-types';

export interface ActivityPickerOptions {
    query?: string;
    showCompleted?: boolean;
    now?: Date;
    /** Extra searchable context, such as linked client and project names. */
    searchText?: (activity: TaskEvent) => string;
}

function timestamp(value: Date | undefined | null): number | null {
    if (!(value instanceof Date)) return null;
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
}

function recentTimestamp(activity: TaskEvent): number {
    return timestamp(activity.updatedAt)
        ?? timestamp(activity.createdAt)
        ?? timestamp(activity.start)
        ?? 0;
}

/**
 * Search and order activities for the Activity Manager picker. Open scheduled
 * work comes first (most recently past, then soonest upcoming), followed by
 * unscheduled work. Completed records are opt-in and always sort last.
 */
export function getActivityPickerResults(
    activities: readonly TaskEvent[],
    {
        query = '',
        showCompleted = false,
        now = new Date(),
        searchText,
    }: ActivityPickerOptions = {},
): TaskEvent[] {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const nowMs = now.getTime();

    return activities
        .filter((activity) => {
            if (!activity?.id) return false;
            if (!showCompleted && activity.status === 'done') return false;
            if (terms.length === 0) return true;
            const haystack = `${activity.title || ''} ${activity.description || ''} ${searchText?.(activity) || ''}`.toLocaleLowerCase();
            return terms.every((term) => haystack.includes(term));
        })
        .slice()
        .sort((a, b) => {
            const aDone = a.status === 'done';
            const bDone = b.status === 'done';
            if (aDone !== bDone) return aDone ? 1 : -1;
            if (aDone && bDone) {
                return recentTimestamp(b) - recentTimestamp(a)
                    || (a.title || '').localeCompare(b.title || '');
            }

            const aStart = timestamp(a.start);
            const bStart = timestamp(b.start);
            if (aStart !== null && bStart !== null) {
                const aPast = aStart < nowMs;
                const bPast = bStart < nowMs;
                if (aPast !== bPast) return aPast ? -1 : 1;
                return (aPast ? bStart - aStart : aStart - bStart)
                    || (a.title || '').localeCompare(b.title || '');
            }
            if (aStart !== null || bStart !== null) return aStart !== null ? -1 : 1;
            return recentTimestamp(b) - recentTimestamp(a)
                || (a.title || '').localeCompare(b.title || '');
        });
}
