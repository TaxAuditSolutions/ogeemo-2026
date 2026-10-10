import { test } from 'node:test';
import assert from 'node:assert/strict';

import { allMenuItems } from '../src/lib/menu-items';
import { WORKFLOW_TEMPLATES, applyWorkflowTemplate, type WorkflowTemplate } from '../src/lib/workflow-templates';
import type { Workflow } from '../src/services/workflow-service';

test('every template step resolves to a real menu entry with its canonical label', () => {
    for (const template of WORKFLOW_TEMPLATES) {
        for (const step of template.items) {
            const menu = allMenuItems.find((i) => i.href === step.href);
            assert.ok(menu, `${template.name}: "${step.href}" does not resolve to a menu entry`);
            assert.equal(
                step.label,
                menu.label,
                `${template.name}: label for ${step.href} must match the menu registry`,
            );
        }
    }
});

test('template names are unique, non-empty and cover the shipped roles', () => {
    const names = WORKFLOW_TEMPLATES.map((t) => t.name);
    assert.equal(new Set(names).size, names.length, 'template names must be unique');
    for (const name of names) assert.ok(name.trim().length > 0);
    assert.ok(names.includes('Accountant'), 'the Accountant template must ship');
    assert.ok(names.includes('Lawyer'), 'the Lawyer template must ship');
});

test('every template has a blurb, steps, and no duplicate destinations', () => {
    for (const template of WORKFLOW_TEMPLATES) {
        assert.ok(template.blurb.trim().length > 0, `${template.name} needs a blurb`);
        assert.ok(template.items.length >= 3, `${template.name} needs at least three steps`);
        const hrefs = template.items.map((i) => i.href);
        assert.equal(new Set(hrefs).size, hrefs.length, `${template.name} has duplicate destinations`);
        const ids = template.items.map((i) => i.id);
        assert.equal(new Set(ids).size, ids.length, `${template.name} has duplicate step ids`);
    }
});

const bookkeeping: Workflow = {
    id: 'wf-1',
    name: 'Bookkeeping',
    items: [{ id: 'menu-/accounting/ledgers', label: 'BKS Ledger', href: '/accounting/ledgers' }],
};

test('applyWorkflowTemplate appends a fresh copy with a new id', () => {
    const template = WORKFLOW_TEMPLATES[0];
    const result = applyWorkflowTemplate([bookkeeping], template, () => 'wf-new');
    assert.equal(result.status, 'added');
    const added = (result as { status: 'added'; workflows: Workflow[] }).workflows;
    assert.equal(added.length, 2);
    assert.equal(added[0], bookkeeping);
    assert.equal(added[1].id, 'wf-new');
    assert.equal(added[1].name, template.name);
    assert.deepEqual(added[1].items, template.items as Workflow['items']);
    // Copies, not aliases: user edits must not mutate the shipped template.
    assert.notEqual(added[1].items[0], template.items[0]);
});

test('applyWorkflowTemplate refuses a duplicate name and leaves the list untouched', () => {
    const template = WORKFLOW_TEMPLATES[0];
    const existing: Workflow[] = [bookkeeping, { id: 'wf-2', name: template.name, items: [] }];
    const result = applyWorkflowTemplate(existing, template, () => 'wf-dup');
    assert.equal(result.status, 'duplicate');
    assert.equal((result as { workflows: readonly Workflow[] }).workflows, existing);
});

test('applyWorkflowTemplate adds after the user renamed or removed the previous copy', () => {
    const template = WORKFLOW_TEMPLATES[0];
    const renamed: Workflow[] = [{ id: 'wf-1', name: 'My Accounting', items: [] }];
    const result = applyWorkflowTemplate(renamed, template, () => 'wf-fresh');
    assert.equal(result.status, 'added');
    assert.equal((result as { status: 'added'; workflows: Workflow[] }).workflows.length, 2);
});
