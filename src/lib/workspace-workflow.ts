import { allMenuItems, WORKSPACE_GROUP_ITEMS } from '@/lib/menu-items';

export interface WorkflowLike {
    id: string;
    items: ReadonlyArray<{ href: unknown }>;
}

/**
 * Resolves what the sidebar's Workspace group should contain.
 *
 * One seam for navigation defaults (OG-065 default = the five core workflow
 * destinations; OG-035 navigation mechanism): an active, valid user-authored
 * workflow overrides the group; anything else falls back to the default -
 * no active id, unknown/deleted id, empty workflow, or items that cannot
 * resolve to real menu entries (which would render a dead link).
 */
export function resolveWorkspaceItemHrefs(
    workflows: ReadonlyArray<WorkflowLike>,
    activeWorkflowId: string | null | undefined,
    defaults: readonly string[] = WORKSPACE_GROUP_ITEMS,
): string[] {
    if (!activeWorkflowId) return [...defaults];
    const workflow = workflows.find((w) => w.id === activeWorkflowId);
    if (!workflow || workflow.items.length === 0) return [...defaults];

    const hrefs: string[] = [];
    for (const item of workflow.items) {
        const href = typeof item.href === 'string' ? item.href : null;
        if (!href) continue;
        if (!allMenuItems.some((i) => i.href === href)) continue;
        if (!hrefs.includes(href)) hrefs.push(href);
    }
    return hrefs.length > 0 ? hrefs : [...defaults];
}
