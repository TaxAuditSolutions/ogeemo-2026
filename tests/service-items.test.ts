import assert from 'node:assert/strict';
import test from 'node:test';

import {
  followsCatalogue,
  isDuplicateDescription,
  refreshFromCatalogue,
  taxForChoice,
  validateServiceItem,
} from '../src/lib/service-items';

const taxes = [{ name: 'HST', rate: 13 }, { name: 'GST', rate: 5 }];

test('choosing None for tax is 0 percent, not the workspace default rate', () => {
  assert.deepEqual(taxForChoice('None', taxes), { taxType: '', taxRate: 0 });
  assert.deepEqual(taxForChoice('', taxes), { taxType: '', taxRate: 0 });
  assert.deepEqual(taxForChoice('Removed Tax', taxes), { taxType: '', taxRate: 0 }, 'a tax type that no longer exists');
  assert.deepEqual(taxForChoice('HST', taxes), { taxType: 'HST', taxRate: 13 });
});

test('a good item is cleaned: trimmed, price to the cent, kind defaults to service', () => {
  const result = validateServiceItem({ description: '  Consulting hour ', price: '1,234.567', taxType: 'HST', taxRate: '13' });
  assert.deepEqual(result, { error: null, item: { description: 'Consulting hour', price: 1234.57, taxType: 'HST', taxRate: 13, itemType: 'service' } });
  assert.equal((validateServiceItem({ description: 'Widget', price: 5, taxType: '', taxRate: '', itemType: 'product' }) as any).item.itemType, 'product');
});

test('a free item (price 0) is allowed, a blank or negative price is not', () => {
  assert.equal(validateServiceItem({ description: 'Free sample', price: '0', taxType: '', taxRate: '' }).error, null);
  const err = (price: string) => (validateServiceItem({ description: 'x', price, taxType: '', taxRate: '' }) as any).error as string;
  assert.match(err(''), /Enter a price/);
  assert.match(err('abc'), /Enter a price/);
  assert.match(err('-1'), /cannot be negative/);
});

test('description is required and the rate must be 0-100', () => {
  assert.match((validateServiceItem({ description: '   ', price: 1, taxType: '', taxRate: '' }) as any).error, /description/);
  const err = (taxRate: string) => (validateServiceItem({ description: 'x', price: 1, taxType: 'HST', taxRate }) as any).error as string;
  assert.match(err('101'), /between 0 and 100/);
  assert.match(err('-1'), /between 0 and 100/);
  assert.equal(err('100'), null);
  assert.equal(err('0'), null);
});

test('a None tax type is stored as no type and zero percent even if a stale rate is sent', () => {
  const item = (validateServiceItem({ description: 'x', price: 1, taxType: 'None', taxRate: '' }) as any).item;
  assert.deepEqual([item.taxType, item.taxRate], ['', 0]);
});

test('duplicate descriptions are found ignoring case and spacing, and an item does not duplicate itself', () => {
  const items = [{ id: 'a', description: 'Consulting  Hour' }, { id: 'b', description: 'Widget' }];
  assert.equal(isDuplicateDescription(items, ' consulting hour '), true);
  assert.equal(isDuplicateDescription(items, 'Consulting Hour', 'a'), false);
  assert.equal(isDuplicateDescription(items, 'Gadget'), false);
  assert.equal(isDuplicateDescription(items, '   '), false);
});

test('only new or draft documents follow the catalogue; saved and issued ones keep their prices', () => {
  assert.equal(followsCatalogue(null, false), true, 'brand new');
  assert.equal(followsCatalogue('outstanding', false), true, 'new, whatever the default status');
  assert.equal(followsCatalogue('draft', true), true);
  for (const status of ['outstanding', 'paid', 'partially_paid', 'overdue', 'sent', 'approved', 'invoiced', null, undefined]) {
    assert.equal(followsCatalogue(status as any, true), false, String(status));
  }
});

const line = (over: object = {}) => ({ serviceItemId: 'a', description: 'Old name', price: 100, taxType: 'HST', taxRate: 13, ...over });
const library = [{ id: 'a', description: 'New name', price: 120, taxType: 'HST', taxRate: 13 }];

test('a draft line is refreshed to the catalogue price, name and tax', () => {
  const result = refreshFromCatalogue([line()], library, true);
  assert.deepEqual([result[0].price, result[0].description], [120, 'New name']);
});

test('a saved or issued document is NOT repriced when the catalogue changes', () => {
  const lines = [line()];
  assert.equal(refreshFromCatalogue(lines, library, false), lines, 'the very same lines come back');
  assert.equal(lines[0].price, 100);
});

test('lines with no catalogue link, or whose item was deleted, are left alone, and an unchanged list is returned as is', () => {
  const free = line({ serviceItemId: undefined });
  const orphan = line({ serviceItemId: 'gone' });
  const lines = [free, orphan];
  assert.equal(refreshFromCatalogue(lines, library, true), lines);
  const matching = [line({ description: 'New name', price: 120 })];
  assert.equal(refreshFromCatalogue(matching, library, true), matching);
});

test('only the linked lines change in a mixed document', () => {
  const lines = [line(), line({ serviceItemId: undefined, price: 7, description: 'Custom' })];
  const result = refreshFromCatalogue(lines, library, true);
  assert.deepEqual(result.map((l) => l.price), [120, 7]);
});
