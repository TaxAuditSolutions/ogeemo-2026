import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addPayment,
  daysOverdue,
  displayStatus,
  invoiceBalance,
  isFullyPaid,
  isInvoiceOverdue,
  quoteConversionProblem,
  storedStatusFor,
  validatePaymentAmount,
} from '../src/lib/invoice-status';

const now = new Date(2026, 10, 8, 15, 30); // 8 Nov 2026, mid-afternoon
const inv = (over: Partial<{ originalAmount: number; amountPaid: number; dueDate: Date; status: string }> = {}) => ({
  originalAmount: 100,
  amountPaid: 0,
  dueDate: new Date(2026, 10, 1),
  status: 'outstanding',
  ...over,
});

test('balance is never negative and is exact to the cent', () => {
  assert.equal(invoiceBalance(100, 40), 60);
  assert.equal(invoiceBalance(100.1, 0.2), 99.9);
  assert.equal(invoiceBalance(100, 120), 0, 'overpaid shows no balance, not a negative one');
  assert.equal(invoiceBalance(NaN as any, 5), 0);
});

test('paid in full allows a one-cent tolerance and never counts a zero invoice as paid by nothing', () => {
  assert.equal(isFullyPaid(100, 100), true);
  assert.equal(isFullyPaid(100, 99.99), true);
  assert.equal(isFullyPaid(100, 99.98), false);
  assert.equal(isFullyPaid(0, 0), false);
});

test('stored status follows the amounts, including when a paid invoice is edited upward', () => {
  assert.equal(storedStatusFor(100, 0), 'outstanding');
  assert.equal(storedStatusFor(100, 40), 'partially_paid');
  assert.equal(storedStatusFor(100, 100), 'paid');
  assert.equal(storedStatusFor(150, 100), 'partially_paid', 'total raised after being paid');
  assert.equal(storedStatusFor(80, 100), 'paid', 'total lowered below what was paid');
});

test('an invoice is overdue the day after it is due, not on the due date', () => {
  assert.equal(isInvoiceOverdue(inv({ dueDate: new Date(2026, 10, 8) }), now), false, 'due today');
  assert.equal(isInvoiceOverdue(inv({ dueDate: new Date(2026, 10, 7, 23, 59) }), now), true, 'due yesterday');
  assert.equal(isInvoiceOverdue(inv({ dueDate: new Date(2026, 10, 9) }), now), false, 'due tomorrow');
});

test('paid, drafts and fully-covered invoices are never overdue; part-paid ones still can be', () => {
  assert.equal(isInvoiceOverdue(inv({ status: 'paid', amountPaid: 100 }), now), false);
  assert.equal(isInvoiceOverdue(inv({ status: 'draft' }), now), false);
  assert.equal(isInvoiceOverdue(inv({ amountPaid: 100 }), now), false, 'paid even though status is stale');
  assert.equal(isInvoiceOverdue(inv({ status: 'partially_paid', amountPaid: 40 }), now), true);
  assert.equal(isInvoiceOverdue(inv({ dueDate: new Date('nope') }), now), false, 'bad date is not flagged');
});

test('days overdue counts whole calendar days', () => {
  assert.equal(daysOverdue(inv({ dueDate: new Date(2026, 10, 7, 23, 59) }), now), 1);
  assert.equal(daysOverdue(inv({ dueDate: new Date(2026, 9, 9) }), now), 30);
  assert.equal(daysOverdue(inv({ dueDate: new Date(2026, 10, 9) }), now), 0);
  assert.equal(daysOverdue(inv({ status: 'paid', amountPaid: 100 }), now), 0);
});

test('display status shows overdue without ever storing it', () => {
  assert.equal(displayStatus(inv(), now), 'overdue');
  assert.equal(displayStatus(inv({ dueDate: new Date(2026, 10, 20) }), now), 'outstanding');
  assert.equal(displayStatus(inv({ status: 'paid', amountPaid: 100 }), now), 'paid');
});

test('a payment must be positive and no more than the balance due', () => {
  assert.equal(validatePaymentAmount(60, 100, 40), null);
  assert.equal(validatePaymentAmount(60.01, 100, 40), null, 'within the one-cent tolerance');
  assert.match(validatePaymentAmount(75, 100, 40) ?? '', /more than the balance due of 60\.00/);
  assert.match(validatePaymentAmount(0, 100, 0) ?? '', /greater than zero/);
  assert.match(validatePaymentAmount(-5, 100, 0) ?? '', /greater than zero/);
  assert.match(validatePaymentAmount(NaN, 100, 0) ?? '', /greater than zero/);
  assert.match(validatePaymentAmount(10, 100, 100) ?? '', /already paid in full/);
});

test('payments add up to the cent', () => {
  assert.equal(addPayment(0.1, 0.2), 0.3);
  assert.equal(addPayment(40, 60), 100);
  assert.equal(addPayment(0, 33.335), 33.34);
});

test('a quote converts once: declined, invoiced and paid quotes are refused', () => {
  for (const status of ['requested', 'draft', 'sent', 'approved', 'in_progress', 'completed']) {
    assert.equal(quoteConversionProblem(status, 'invoice'), null, `${status} -> invoice`);
  }
  assert.match(quoteConversionProblem('declined', 'invoice') ?? '', /declined/);
  assert.match(quoteConversionProblem('invoiced', 'invoice') ?? '', /already been invoiced/);
  assert.match(quoteConversionProblem('paid', 'invoice') ?? '', /already been invoiced/);
});

test('a quote becomes one work order only', () => {
  assert.equal(quoteConversionProblem('approved', 'work order'), null);
  assert.match(quoteConversionProblem('in_progress', 'work order') ?? '', /already has a work order/);
  assert.match(quoteConversionProblem('completed', 'work order', { hasWorkOrder: true }) ?? '', /already has a work order/, 'status set by hand, link still stored');
  assert.equal(quoteConversionProblem('completed', 'work order', { hasWorkOrder: false }), null);
  assert.equal(quoteConversionProblem('completed', 'invoice', { hasWorkOrder: true }), null, 'a finished work order can still be invoiced');
  assert.match(quoteConversionProblem('invoiced', 'work order') ?? '', /already been invoiced/);
  assert.match(quoteConversionProblem('declined', 'work order') ?? '', /declined/);
});
