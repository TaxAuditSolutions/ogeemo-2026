import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allMenuItems, CORE_WORKFLOW_DESTINATIONS, WORKSPACE_GROUP_ITEMS } from '../src/lib/menu-items';

test('core workflow destinations resolve to real menu entries', () => {
    for (const href of CORE_WORKFLOW_DESTINATIONS) {
        const item = allMenuItems.find((i) => i.href === href);
        assert.ok(item, `missing menu entry for ${href}`);
        assert.ok(item.label && item.icon, `menu entry for ${href} needs a label and icon`);
    }
});

test('Workspace group leads with the five core destinations in workflow order', () => {
    assert.deepEqual(WORKSPACE_GROUP_ITEMS.slice(0, 5), [
        '/contacts',
        '/projects/all',
        '/event-manager',
        '/calendar',
        '/reports/time-log',
    ]);
});

test('every Workspace item resolves (no orphaned hrefs)', () => {
    for (const href of WORKSPACE_GROUP_ITEMS) {
        assert.ok(allMenuItems.some((i) => i.href === href), `${href} does not resolve to a menu entry`);
    }
});
