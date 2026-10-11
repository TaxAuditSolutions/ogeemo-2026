import type { WorkflowItem } from '@/services/workflow-service';

/**
 * Alphabetical sort of workflow steps (the step editor's Sort menu).
 * Case-insensitive; returns a new array, never mutates the draft in place.
 */
export function sortWorkflowItemsByLabel(
    items: readonly WorkflowItem[],
    direction: 'asc' | 'desc',
): WorkflowItem[] {
    const sorted = [...items].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
    return direction === 'asc' ? sorted : sorted.reverse();
}
