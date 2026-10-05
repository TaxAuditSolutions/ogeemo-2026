import { type Project, type ProjectStatus } from '@/types/calendar-types';

/**
 * Pure grouping/sorting logic for the shared Project picker
 * (Activity Manager + Time Manager).
 *
 * Beta feedback: as Project counts grow, selection must stay simple —
 * active/open work first, completed/historical reachable but out of the way,
 * and contact context visible (multiple Projects may share a name across
 * clients). Modes: 'active' (default), 'client' (group by contact), 'az'
 * (flat alphabetical). No mode ever hides projects — ordering only.
 */

export type ProjectSortMode = 'active' | 'client' | 'az';

export interface ProjectPick {
    project: Project;
    /** Display name of the linked contact; '' when unlinked. */
    contactName: string;
    status: ProjectStatus | 'unknown';
}

export interface ProjectPickGroup {
    key: string;
    label: string;
    /** Completed/history groups render dimmer but stay fully selectable. */
    subdued?: boolean;
    items: ProjectPick[];
}

export const PROJECT_SORT_MODES: { value: ProjectSortMode; label: string }[] = [
    { value: 'active', label: 'Active first' },
    { value: 'client', label: 'By client' },
    { value: 'az', label: 'A-Z' },
];

const STATUS_RANK: Record<string, number> = { active: 0, 'on-hold': 1, planning: 2, completed: 3, unknown: 2 };

export function statusLabel(status: ProjectStatus | 'unknown' | undefined): string {
    switch (status) {
        case 'active': return 'Active';
        case 'on-hold': return 'On hold';
        case 'planning': return 'Planning';
        case 'completed': return 'Completed';
        default: return '';
    }
}

function rank(project: Project): number {
    return STATUS_RANK[project.status ?? 'unknown'] ?? 2;
}

function byRankThenName(a: ProjectPick, b: ProjectPick): number {
    const r = rank(a.project) - rank(b.project);
    return r !== 0 ? r : a.project.name.localeCompare(b.project.name);
}

function byName(a: ProjectPick, b: ProjectPick): number {
    return a.project.name.localeCompare(b.project.name);
}

export function buildProjectGroups(
    projects: Project[],
    contactNameById: Map<string, string>,
    mode: ProjectSortMode,
    selectedContactName: string | null,
): ProjectPickGroup[] {
    const picks: ProjectPick[] = projects.map((p) => ({
        project: p,
        contactName: (p.contactId ? contactNameById.get(p.contactId) : '') || '',
        status: (p.status as ProjectStatus | undefined) ?? 'unknown',
    }));

    if (mode === 'az') {
        return [{ key: 'all', label: 'All projects', items: [...picks].sort(byName) }];
    }

    if (mode === 'client') {
        const byClient = new Map<string, ProjectPick[]>();
        for (const pick of picks) {
            const key = pick.contactName || 'No client';
            if (!byClient.has(key)) byClient.set(key, []);
            byClient.get(key)!.push(pick);
        }
        return [...byClient.entries()]
            .sort(([a], [b]) => {
                if (a === 'No client') return 1;
                if (b === 'No client') return -1;
                return a.localeCompare(b);
            })
            .map(([label, items]) => ({ key: `client-${label}`, label, items: [...items].sort(byRankThenName) }));
    }

    // Default 'active': the selected contact's open work first, then status
    // groups; completed sinks to a subdued group at the bottom.
    const groups: ProjectPickGroup[] = [];
    const isCompleted = (p: ProjectPick) => rank(p.project) === 3;

    let mineIds = new Set<string>();
    if (selectedContactName) {
        const mine = picks.filter((p) => p.contactName === selectedContactName && !isCompleted(p));
        if (mine.length) {
            mineIds = new Set(mine.map((p) => p.project.id));
            groups.push({ key: 'mine', label: `For ${selectedContactName}`, items: [...mine].sort(byRankThenName) });
        }
    }

    const inProgress = picks.filter((p) => !mineIds.has(p.project.id) && rank(p.project) <= 1);
    if (inProgress.length) {
        groups.push({ key: 'progress', label: 'In progress', items: inProgress.sort(byRankThenName) });
    }

    const planning = picks.filter((p) => !mineIds.has(p.project.id) && rank(p.project) === 2);
    if (planning.length) {
        groups.push({ key: 'planning', label: 'Planning', items: planning.sort(byRankThenName) });
    }

    const completed = picks.filter(isCompleted);
    if (completed.length) {
        groups.push({ key: 'completed', label: 'Completed', subdued: true, items: [...completed].sort(byName) });
    }

    return groups;
}

/* ------------------------------------------------------------------ *
 * Project register sorting (sortable table headers)
 * ------------------------------------------------------------------ */

export type ProjectListSortKey = 'name' | 'contact' | 'status' | 'worker';

export interface ProjectListSortData {
    contactNameById: Map<string, string>;
    /** projectId -> resolved worker display names (alphabetical, deduped). */
    workerNamesByProject: Map<string, string[]>;
}

/** Status lifecycle rank; unknown statuses rank with planning. */
export function statusRank(project: Project): number {
    return STATUS_RANK[project.status ?? 'unknown'] ?? 2;
}

function sortValue(project: Project, key: ProjectListSortKey, data: ProjectListSortData): string | number {
    switch (key) {
        case 'contact':
            return (project.contactId ? data.contactNameById.get(project.contactId) : '') || '';
        case 'status':
            return statusRank(project);
        case 'worker':
            return data.workerNamesByProject.get(project.id)?.[0] ?? '';
        case 'name':
        default:
            return project.name;
    }
}

/**
 * Sorts the Project register by one of the beta-requested keys.
 * Rules: ties break alphabetically by project name; unassigned/empty values
 * always sink to the bottom regardless of direction (asc and desc).
 */
export function sortProjectList(
    projects: Project[],
    key: ProjectListSortKey,
    direction: 'asc' | 'desc',
    data: ProjectListSortData,
): Project[] {
    return [...projects].sort((a, b) => {
        const va = sortValue(a, key, data);
        const vb = sortValue(b, key, data);
        const aEmpty = va === '';
        const bEmpty = vb === '';
        if (aEmpty && bEmpty) return a.name.localeCompare(b.name);
        if (aEmpty) return 1;
        if (bEmpty) return -1;
        let r: number;
        if (typeof va === 'number' && typeof vb === 'number') {
            r = va - vb;
        } else {
            r = String(va).localeCompare(String(vb));
        }
        if (direction === 'desc') r = -r;
        return r !== 0 ? r : a.name.localeCompare(b.name);
    });
}
