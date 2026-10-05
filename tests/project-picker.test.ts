import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProjectGroups, statusLabel, sortProjectList, type ProjectPickGroup, type ProjectListSortData } from '../src/lib/project-picker';
import { type Project } from '../src/types/calendar-types';

/**
 * Beta feedback: Project selection must stay simple as counts grow —
 * active/open first, completed reachable at the bottom, contact context
 * visible, and no mode may hide projects.
 */

function project(id: string, name: string, status?: Project['status'], contactId?: string): Project {
    return { id, name, status, contactId, userId: 'u1' } as Project;
}

const CONTACTS = new Map([
    ['c1', 'Acme Corp'],
    ['c2', 'Beta LLC'],
]);

const PROJECTS: Project[] = [
    project('p1', 'Website Refresh', 'active', 'c1'),
    project('p2', 'Website Refresh', 'completed', 'c2'), // same name, other client
    project('p3', 'Tax Filing', 'completed', 'c1'),
    project('p4', 'Brand Redesign', 'on-hold', 'c2'),
    project('p5', 'Office Move', 'planning'),
    project('p6', 'Audit Prep', 'active', 'c2'),
    project('p7', 'Legacy Cleanup', undefined, 'c1'), // no status => treated as planning
];

function labels(groups: ProjectPickGroup[]): string[] {
    return groups.map((g) => g.label);
}

function flatIds(groups: ProjectPickGroup[]): string[] {
    return groups.flatMap((g) => g.items.map((i) => i.project.id));
}

test('active mode groups: selected contact first, then In progress, Planning, Completed last', () => {
    const groups = buildProjectGroups(PROJECTS, CONTACTS, 'active', 'Acme Corp');
    assert.deepEqual(labels(groups), ['For Acme Corp', 'In progress', 'Planning', 'Completed']);
    // For Acme Corp: his open work — active AND unknown-status (treated as
    // planning); his completed work is excluded (it sinks to Completed below)
    assert.deepEqual(groups[0].items.map((i) => i.project.id), ['p1', 'p7']);
    // In progress: active/on-hold not already shown above, ranked active -> on-hold
    assert.deepEqual(groups[1].items.map((i) => i.project.id), ['p6', 'p4']);
    // Planning: the remaining planning project (Acme's are shown in his group)
    assert.deepEqual(groups[2].items.map((i) => i.project.id), ['p5']);
    // Completed sinks to a dimmed final group
    assert.equal(groups[3].subdued, true);
    assert.deepEqual(groups[3].items.map((i) => i.project.id).sort(), ['p2', 'p3']);
});

test('no project is ever hidden: modes only reorder', () => {
    const all = PROJECTS.map((p) => p.id).sort();
    for (const mode of ['active', 'client', 'az'] as const) {
        assert.deepEqual(flatIds(buildProjectGroups(PROJECTS, CONTACTS, mode, null)).sort(), all, mode);
    }
});

test('client mode groups by contact name with No client last', () => {
    const groups = buildProjectGroups(PROJECTS, CONTACTS, 'client', null);
    assert.deepEqual(labels(groups), ['Acme Corp', 'Beta LLC', 'No client']);
});

test('az mode is one flat alphabetical group', () => {
    const groups = buildProjectGroups(PROJECTS, CONTACTS, 'az', null);
    assert.equal(groups.length, 1);
    const names = groups[0].items.map((i) => i.project.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('same-named projects carry their contact name for disambiguation', () => {
    const groups = buildProjectGroups(PROJECTS, CONTACTS, 'az', null);
    const dupes = groups[0].items.filter((i) => i.project.name === 'Website Refresh');
    assert.equal(dupes.length, 2);
    assert.deepEqual(dupes.map((d) => d.contactName).sort(), ['Acme Corp', 'Beta LLC']);
});

test('statusLabel maps every known status and blanks unknown', () => {
    assert.equal(statusLabel('active'), 'Active');
    assert.equal(statusLabel('on-hold'), 'On hold');
    assert.equal(statusLabel('planning'), 'Planning');
    assert.equal(statusLabel('completed'), 'Completed');
    assert.equal(statusLabel('unknown'), '');
    assert.equal(statusLabel(undefined), '');
});

/* --- Project register sorting (sortable table headers) --- */

const SORT_DATA: ProjectListSortData = {
    contactNameById: new Map([
        ['c1', 'Acme Corp'],
        ['c2', 'Beta LLC'],
    ]),
    workerNamesByProject: new Map([
        ['p1', ['Dan White']],
        ['p6', ['Dan White', 'Julie White']],
    ]),
};

test('register sort: by name, asc and desc are mirrors', () => {
    const asc = sortProjectList(PROJECTS, 'name', 'asc', SORT_DATA).map((p) => p.name);
    assert.deepEqual(asc, [...asc].sort((a, b) => a.localeCompare(b)));
    const desc = sortProjectList(PROJECTS, 'name', 'desc', SORT_DATA).map((p) => p.name);
    assert.deepEqual(desc, [...asc].sort((a, b) => b.localeCompare(a)));
});

test('register sort: by contact, unassigned last in both directions', () => {
    for (const dir of ['asc', 'desc'] as const) {
        const sorted = sortProjectList(PROJECTS, 'contact', dir, SORT_DATA);
        assert.equal(sorted[sorted.length - 1].id, 'p5', `${dir}: no-contact project must be last`);
        const contactOrder = [...new Set(sorted.slice(0, -1).map((p) => p.contactId))];
        assert.deepEqual(contactOrder, dir === 'asc' ? ['c1', 'c2'] : ['c2', 'c1'], `${dir}: grouped by contact`);
    }
});

test('register sort: by status asc puts active first, desc puts completed first', () => {
    const asc = sortProjectList(PROJECTS, 'status', 'asc', SORT_DATA);
    assert.equal(asc[0].status, 'active');
    const desc = sortProjectList(PROJECTS, 'status', 'desc', SORT_DATA);
    assert.equal(desc[0].status, 'completed');
});

test('register sort: by worker, projects without workers last', () => {
    const sorted = sortProjectList(PROJECTS, 'worker', 'asc', SORT_DATA);
    const assignedFirst = sorted.slice(0, 2).map((p) => p.id).sort();
    assert.deepEqual(assignedFirst, ['p1', 'p6'], 'projects with workers sort to the top');
    const assignedCount = sorted.filter((p) => SORT_DATA.workerNamesByProject.has(p.id)).length;
    assert.deepEqual(sorted.slice(0, assignedCount).map((p) => p.id).sort(), ['p1', 'p6']);
});