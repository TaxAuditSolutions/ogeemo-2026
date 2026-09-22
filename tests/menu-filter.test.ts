import assert from 'node:assert/strict';
import test from 'node:test';

import { accountingMenuItems } from '../src/data/accounting-menu-items';
import { filterMenuItems, sortMenuItemsByLabel } from '../src/lib/menu-filter';
import { allMenuItems, type MenuItem } from '../src/lib/menu-items';

test('sorts menu items by label without mutating the source array', () => {
    const items = [
        allMenuItems.find((item) => item.label === 'Backups')!,
        allMenuItems.find((item) => item.label === 'Action Manager')!,
        accountingMenuItems.find((item) => item.label === 'Bank Statements')!,
    ];

    assert.deepEqual(
        sortMenuItemsByLabel(items, 'asc').map((item) => item.label),
        ['Action Manager', 'Backups', 'Bank Statements'],
    );
    assert.deepEqual(
        sortMenuItemsByLabel(items, 'desc').map((item) => item.label),
        ['Bank Statements', 'Backups', 'Action Manager'],
    );
    assert.deepEqual(items.map((item) => item.label), ['Backups', 'Action Manager', 'Bank Statements']);
});

test('sorts empty and single-item menu lists', () => {
    const item = allMenuItems[0];

    assert.deepEqual(sortMenuItemsByLabel([], 'asc'), []);
    assert.deepEqual(sortMenuItemsByLabel([item], 'desc'), [item]);
});

test('returns all menu items for an empty or whitespace-only query', () => {
    assert.equal(filterMenuItems(allMenuItems, ''), allMenuItems);
    assert.equal(filterMenuItems(allMenuItems, '   '), allMenuItems);
});

test('matches label words by case-insensitive prefix', () => {
    const labels = filterMenuItems(allMenuItems, 'Ba').map((item) => item.label);

    assert.deepEqual(labels, ['Backups', 'Bank Statements']);
    assert.ok(!labels.includes('Feedback'));
});

test('trims the query and requires each term to match a label word prefix', () => {
    const items: MenuItem[] = [
        accountingMenuItems.find((item) => item.label === 'Bank Statements')!,
        { ...accountingMenuItems[0], label: 'Financial Statements' },
        allMenuItems.find((item) => item.label === 'Backups')!,
    ];

    assert.deepEqual(
        filterMenuItems(items, '  BANK sta  ').map((item) => item.label),
        ['Bank Statements'],
    );
});