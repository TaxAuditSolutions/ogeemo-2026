import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceItemHrefs } from '../src/lib/workspace-workflow';
import { WORKSPACE_GROUP_ITEMS } from '../src/lib/menu-items';

const workflows = [
    { id: 'wf-books', items: [{ href: '/accounting/invoices/create' }, { href: '/reports/time-log' }] },
    { id: 'wf-empty', items: [] },
];

test('resolveWorkspaceItemHrefs: no active workflow -> Phase-1 default', () => {
    assert.deepEqual(resolveWorkspaceItemHrefs(workflows, null), [...WORKSPACE_GROUP_ITEMS]);
    assert.deepEqual(resolveWorkspaceItemHrefs(workflows, undefined), [...WORKSPACE_GROUP_ITEMS]);
});

test('resolveWorkspaceItemHrefs: active workflow drives the group in its order', () => {
    const resolved = resolveWorkspaceItemHrefs(workflows, 'wf-books');
    assert.deepEqual(resolved, ['/accounting/invoices/create', '/reports/time-log']);
});

test('resolveWorkspaceItemHrefs: unknown/deleted active id -> default', () => {
    assert.deepEqual(resolveWorkspaceItemHrefs(workflows, 'wf-gone'), [...WORKSPACE_GROUP_ITEMS]);
});

test('resolveWorkspaceItemHrefs: unresolvable and duplicate hrefs are dropped', () => {
    const resolved = resolveWorkspaceItemHrefs(
        [{ id: 'x', items: [{ href: '/nope' }, { href: 42 }, { href: '/contacts' }, { href: '/contacts' }] }],
        'x',
    );
    assert.deepEqual(resolved, ['/contacts']);
});

test('resolveWorkspaceItemHrefs: an active-but-empty workflow falls back to the default', () => {
    assert.deepEqual(resolveWorkspaceItemHrefs(workflows, 'wf-empty'), [...WORKSPACE_GROUP_ITEMS]);
});
