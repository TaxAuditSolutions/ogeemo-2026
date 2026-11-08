import assert from 'node:assert/strict';
import test from 'node:test';

import { checkItemForm } from '../src/lib/inventory-item-form';
import {
  checkSaleQuantity,
  describeSale,
  isSellable,
  priceProblem,
  quantitiesByItem,
  stockProblem,
} from '../src/lib/inventory-sale';

test('a quantity must be a positive number with at most 3 decimals', () => {
  assert.equal(checkSaleQuantity(2).quantity, 2);
  assert.equal(checkSaleQuantity('1.25').quantity, 1.25);
  for (const bad of [0, -3, '', null, undefined, 'abc', NaN, Infinity, 1.2345, 2_000_000]) {
    assert.notEqual(checkSaleQuantity(bad).error, null, String(bad));
  }
});

test('internal supplies and disposed items are not for sale', () => {
  assert.equal(isSellable({ type: 'Product for Sale' }), true);
  assert.equal(isSellable({ type: 'Raw Material' }), true);
  assert.equal(isSellable({ type: 'Internal Supply' }), false);
  assert.equal(isSellable({ type: 'Product for Sale', dispositionDate: new Date() }), false);
});

test('the same item on two lines is one stock movement', () => {
  const totals = quantitiesByItem([
    { itemId: 'a', quantity: 2 },
    { itemId: 'b', quantity: 1 },
    { itemId: 'a', quantity: 0.1 },
    { itemId: 'a', quantity: 0.2 },
  ]);
  assert.equal(totals.get('a'), 2.3);
  assert.equal(totals.get('b'), 1);
});

test('selling more than is in stock is refused, exactly the stock is allowed', () => {
  assert.equal(stockProblem('Widget', 5, 5), null);
  assert.match(stockProblem('Widget', 5, 6)!, /Only 5 of Widget/);
  assert.match(stockProblem('Widget', -2, 1)!, /Only 0 of Widget/);
});

test('an item with no price cannot be sold, a price of 0 that was entered can', () => {
  assert.match(priceProblem('Widget', null)!, /no selling price/);
  assert.match(priceProblem('Widget', undefined)!, /no selling price/);
  assert.match(priceProblem('Widget', -1)!, /no selling price/);
  assert.equal(priceProblem('Widget', 0), null);
  assert.equal(priceProblem('Widget', 9.99), null);
});

test('a sale is described by its items, shortened when long', () => {
  assert.equal(describeSale([]), 'POS Sale');
  assert.equal(describeSale([{ name: 'Widget', quantity: 2 }]), 'POS Sale: Widget x2');
  assert.equal(
    describeSale([1, 2, 3, 4, 5].map((n) => ({ name: `I${n}`, quantity: n }))),
    'POS Sale: I1 x1, I2 x2, I3 x3 and 2 more'
  );
});

const others = [{ id: 'x1', name: 'Bolt', sku: 'BOLT-1' }, { id: 'x2', name: 'Nut' }];

test('an item form needs a name and returns clean values with no undefined fields', () => {
  const ok = checkItemForm({ name: '  Widget ', sku: '', stockQuantity: '12', cost: '1,234.5', price: '19.999' }, others);
  assert.equal(ok.error, null);
  assert.deepEqual(ok.value, { name: 'Widget', sku: '', stockQuantity: 12, cost: 1234.5, price: 20 });
  assert.match(checkItemForm({ name: '   ' }, others).error!, /name/);
  assert.match(checkItemForm({}, others).error!, /name/);
});

test('blank cost and price mean not set, not zero', () => {
  const ok = checkItemForm({ name: 'A', cost: '', price: null }, others).value!;
  assert.equal(ok.cost, null);
  assert.equal(ok.price, null);
  assert.equal(checkItemForm({ name: 'A', cost: '0' }, others).value!.cost, 0);
});

test('unit cost keeps 4 decimals, the selling price is whole cents', () => {
  const ok = checkItemForm({ name: 'Bolt', cost: '0.0125', price: '0.014' }, others).value!;
  assert.equal(ok.cost, 0.0125);
  assert.equal(ok.price, 0.01);
});

test('bad numbers are refused with a message that names the field', () => {
  assert.match(checkItemForm({ name: 'A', cost: '-1' }, others).error!, /Unit cost/);
  assert.match(checkItemForm({ name: 'A', cost: '1.2.3' }, others).error!, /Unit cost must be a number/);
  assert.match(checkItemForm({ name: 'A', price: '.' }, others).error!, /Selling price must be a number/);
  assert.match(checkItemForm({ name: 'A', stockQuantity: -1 }, others).error!, /Stock cannot be negative/);
  assert.match(checkItemForm({ name: 'A', stockQuantity: 'x' }, others).error!, /Stock must be a number/);
  assert.match(checkItemForm({ name: 'A', stockQuantity: 1.5555 }, others).error!, /decimal/);
});

test('a SKU already used by another item is refused, the same item keeps its own, case is ignored', () => {
  assert.match(checkItemForm({ name: 'A', sku: ' bolt-1 ' }, others).error!, /"bolt-1" is already used by "Bolt"/);
  assert.equal(checkItemForm({ name: 'Bolt', sku: 'BOLT-1' }, others, 'x1').error, null);
  assert.equal(checkItemForm({ name: 'A', sku: '' }, others).error, null);
});
