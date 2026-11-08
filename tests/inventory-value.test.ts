import assert from 'node:assert/strict';
import test from 'node:test';

import { isInventoryAsset, valueInventory } from '../src/lib/inventory-value';

const item = (over: object) => ({ name: 'x', type: 'Product for Sale', stockQuantity: 10, cost: 5, ...over });

test('inventory is stock times unit cost, never the selling price', () => {
  const result = valueInventory([item({ stockQuantity: 12, cost: 4.25, price: 99 })]);
  assert.equal(result.value, 51);
  assert.equal(result.valuedItems, 1);
});

test('products for sale and raw materials are assets; internal supplies are not', () => {
  assert.equal(isInventoryAsset({ type: 'Product for Sale' }), true);
  assert.equal(isInventoryAsset({ type: 'Raw Material' }), true);
  assert.equal(isInventoryAsset({ type: 'Internal Supply' }), false);
  assert.equal(isInventoryAsset({ type: 'something else' }), false);
  assert.equal(isInventoryAsset({}), false);
  const result = valueInventory([item({}), item({ type: 'Raw Material', stockQuantity: 4, cost: 2.5 }), item({ type: 'Internal Supply', stockQuantity: 100, cost: 10 })]);
  assert.equal(result.value, 60);
  assert.equal(result.suppliesExcluded, 1);
});

test('items with no usable cost are counted and left out of the value, not valued at nothing silently', () => {
  const result = valueInventory([item({ cost: null }), item({ cost: undefined }), item({ cost: 0 }), item({ cost: -3 }), item({ cost: NaN }), item({ stockQuantity: 2, cost: 7 })]);
  assert.equal(result.value, 14);
  assert.equal(result.uncostedItems, 5);
  assert.equal(result.valuedItems, 1);
});

test('items with nothing in stock are not counted as uncosted', () => {
  const result = valueInventory([item({ stockQuantity: 0, cost: null }), item({ stockQuantity: null, cost: null })]);
  assert.deepEqual([result.value, result.uncostedItems, result.valuedItems], [0, 0, 0]);
});

test('disposed items are not on hand', () => {
  const result = valueInventory([item({ dispositionDate: new Date(2026, 5, 1) }), item({ dispositionDate: '2026-06-01' }), item({ dispositionDate: null, stockQuantity: 1, cost: 9 })]);
  assert.equal(result.value, 9);
});

test('a negative stock figure counts as zero and is reported', () => {
  const result = valueInventory([item({ stockQuantity: -4, cost: 10 }), item({ stockQuantity: 1, cost: 3 })]);
  assert.equal(result.value, 3);
  assert.equal(result.negativeStockItems, 1);
});

test('the total stays exact to the cent over many items and awkward unit costs', () => {
  const items = Array.from({ length: 300 }, (_, i) => item({ stockQuantity: 3, cost: 0.1 + i / 1000 }));
  const { value } = valueInventory(items);
  assert.equal(Math.round(value * 100) / 100, value);
  assert.equal(valueInventory([item({ stockQuantity: 3, cost: 0.335 })]).value, 1.01, 'each line is rounded to the cent');
});

test('an empty list is all zeros', () => {
  assert.deepEqual(valueInventory([]), { value: 0, valuedItems: 0, uncostedItems: 0, suppliesExcluded: 0, negativeStockItems: 0 });
});
