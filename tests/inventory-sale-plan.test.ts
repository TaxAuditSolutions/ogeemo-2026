import assert from 'node:assert/strict';
import test from 'node:test';

import { planSale, type StockItem } from '../src/lib/inventory-sale';

const items = (...list: StockItem[]) => new Map(list.map((i) => [i.id, i]));
const widget: StockItem = { id: 'w', name: 'Widget', type: 'Product for Sale', stockQuantity: 10, price: 19.99 };
const gadget: StockItem = { id: 'g', name: 'Gadget', type: 'Product for Sale', stockQuantity: 2, price: 5 };

test('a sale takes stock out and totals to the cent from the stored prices', () => {
  const result = planSale(items(widget, gadget), [
    { itemId: 'w', quantity: 3, taxRate: 13 },
    { itemId: 'g', quantity: 2, taxRate: 0 },
  ]);
  assert.equal(result.error, null);
  const plan = result.plan!;
  // 3 x 19.99 = 59.97, tax 13% = 7.7961 -> 7.80; 2 x 5 = 10
  assert.deepEqual([plan.subtotal, plan.tax, plan.total], [69.97, 7.8, 77.77]);
  assert.deepEqual(plan.movements.map((m) => [m.itemId, m.quantity, m.newQuantity]), [['w', 3, 7], ['g', 2, 0]]);
  assert.equal(plan.description, 'POS Sale: Widget x3, Gadget x2');
});

test('tax is rounded line by line so the lines add up to the total', () => {
  const penny: StockItem = { id: 'p', name: 'Penny', type: 'Product for Sale', stockQuantity: 100, price: 0.1 };
  const result = planSale(items(penny), Array.from({ length: 3 }, () => ({ itemId: 'p', quantity: 1, taxRate: 5 })));
  // each line: 0.10 net, 0.005 tax -> 0.01 (half up); three lines = 0.03
  assert.deepEqual([result.plan!.subtotal, result.plan!.tax, result.plan!.total], [0.3, 0.03, 0.33]);
});

test('the same item on two lines is checked against stock as one movement', () => {
  const result = planSale(items(gadget), [{ itemId: 'g', quantity: 2 }, { itemId: 'g', quantity: 1, taxRate: 5 }]);
  assert.match(result.error!, /Only 2 of Gadget in stock, but 3 were requested/);
  const ok = planSale(items(gadget), [{ itemId: 'g', quantity: 1 }, { itemId: 'g', quantity: 1, taxRate: 5 }]);
  assert.deepEqual(ok.plan!.movements, [{ itemId: 'g', name: 'Gadget', quantity: 2, newQuantity: 0 }]);
});

test('a sale is refused for an empty cart, a missing item, a supply, a disposed item, a bad quantity or no price', () => {
  assert.match(planSale(items(widget), []).error!, /at least one item/);
  assert.match(planSale(items(widget), [{ itemId: 'zzz', quantity: 1 }]).error!, /no longer exists/);
  const supply: StockItem = { id: 's', name: 'Paper', type: 'Internal Supply', stockQuantity: 5, price: 1 };
  assert.match(planSale(items(supply), [{ itemId: 's', quantity: 1 }]).error!, /Paper is not for sale/);
  const gone: StockItem = { ...widget, id: 'd', name: 'Old', dispositionDate: new Date() };
  assert.match(planSale(items(gone), [{ itemId: 'd', quantity: 1 }]).error!, /Old is not for sale/);
  assert.match(planSale(items(widget), [{ itemId: 'w', quantity: -3 }]).error!, /Widget: .*more than zero/);
  assert.match(planSale(items(widget), [{ itemId: 'w', quantity: 0 }]).error!, /more than zero/);
  const unpriced: StockItem = { ...widget, id: 'u', name: 'Mystery', price: null };
  assert.match(planSale(items(unpriced), [{ itemId: 'u', quantity: 1 }]).error!, /Mystery has no selling price/);
});

test('money comes from the stored price, so a stale screen cannot change what is charged', () => {
  const repriced: StockItem = { ...widget, price: 25 };
  assert.equal(planSale(items(repriced), [{ itemId: 'w', quantity: 2 }]).plan!.subtotal, 50);
});

test('fractional quantities work and do not drift', () => {
  const rope: StockItem = { id: 'r', name: 'Rope', type: 'Raw Material', stockQuantity: 1, price: 3 };
  const plan = planSale(items(rope), [{ itemId: 'r', quantity: 0.1 }, { itemId: 'r', quantity: 0.2 }]).plan!;
  assert.equal(plan.movements[0].quantity, 0.3);
  assert.equal(plan.movements[0].newQuantity, 0.7);
  assert.equal(plan.subtotal, 0.9);
});
