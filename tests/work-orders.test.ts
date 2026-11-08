import assert from 'node:assert/strict';
import test from 'node:test';

import { canMoveWorkOrder, isInvoiced, workOrderConversionProblem } from '../src/lib/work-orders';

test('only a completed, not-yet-invoiced work order can be invoiced', () => {
  assert.equal(workOrderConversionProblem('completed', null), null);
  assert.equal(workOrderConversionProblem('completed', undefined), null);
  assert.match(workOrderConversionProblem('completed', 'INV-20261108-001') ?? '', /already been invoiced \(INV-20261108-001\)/);
  for (const status of ['pending', 'scheduled', 'in_progress']) {
    assert.match(workOrderConversionProblem(status, null) ?? '', /Mark the work order completed/, status);
  }
  assert.match(workOrderConversionProblem('cancelled', null) ?? '', /cancelled/);
});

test('an invoiced work order is refused even though its status is still completed', () => {
  assert.notEqual(workOrderConversionProblem('completed', 'INV-1'), null);
  assert.equal(isInvoiced({ invoiceNumber: 'INV-1' }), true);
  assert.equal(isInvoiced({ invoiceNumber: null }), false);
  assert.equal(isInvoiced({}), false);
});

test('status moves follow the job: forward, back one step, or cancel; completed is final', () => {
  assert.equal(canMoveWorkOrder('pending', 'scheduled'), true);
  assert.equal(canMoveWorkOrder('scheduled', 'in_progress'), true);
  assert.equal(canMoveWorkOrder('in_progress', 'completed'), true);
  assert.equal(canMoveWorkOrder('in_progress', 'scheduled'), true);
  assert.equal(canMoveWorkOrder('pending', 'cancelled'), true);
  assert.equal(canMoveWorkOrder('cancelled', 'pending'), true);
});

test('nothing can skip straight to completed, leave completed, or move to itself or an unknown status', () => {
  assert.equal(canMoveWorkOrder('pending', 'completed'), false, 'a job cannot finish before it starts');
  assert.equal(canMoveWorkOrder('scheduled', 'completed'), false);
  assert.equal(canMoveWorkOrder('completed', 'in_progress'), false);
  assert.equal(canMoveWorkOrder('completed', 'pending'), false);
  assert.equal(canMoveWorkOrder('pending', 'pending'), false);
  assert.equal(canMoveWorkOrder('pending', 'nonsense'), false);
  assert.equal(canMoveWorkOrder('nonsense', 'pending'), false);
});
