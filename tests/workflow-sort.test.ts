import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sortWorkflowItemsByLabel } from '../src/lib/workflow-sort';
import type { WorkflowItem } from '../src/services/workflow-service';

const step = (id: string, label: string): WorkflowItem => ({ id, href: `/${id}`, label });

test('sortWorkflowItemsByLabel sorts ascending, case-insensitively', () => {
    const items = [step('b', 'BKS Ledger'), step('a', 'activity manager'), step('c', 'Calendar')];
    const sorted = sortWorkflowItemsByLabel(items, 'asc');
    assert.deepEqual(sorted.map((i) => i.label), ['activity manager', 'BKS Ledger', 'Calendar']);
});

test('sortWorkflowItemsByLabel sorts descending', () => {
    const items = [step('b', 'BKS Ledger'), step('a', 'Activity Manager'), step('c', 'Calendar')];
    const sorted = sortWorkflowItemsByLabel(items, 'desc');
    assert.deepEqual(sorted.map((i) => i.label), ['Calendar', 'BKS Ledger', 'Activity Manager']);
});

test('sortWorkflowItemsByLabel returns a new array and preserves items', () => {
    const items = [step('b', 'B'), step('a', 'A')];
    const sorted = sortWorkflowItemsByLabel(items, 'asc');
    assert.notEqual(sorted, items);
    assert.deepEqual(items.map((i) => i.label), ['B', 'A']); // input untouched
    assert.deepEqual(sorted.map((i) => i.id), ['a', 'b']); // full items, not just labels
});
