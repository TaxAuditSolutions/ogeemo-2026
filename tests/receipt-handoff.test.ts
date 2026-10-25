import assert from 'node:assert/strict';
import test from 'node:test';

import type { Invoice } from '../src/core/accounting-service';
import { buildReceiptHandoff, resolveClientEmail } from '../src/lib/receipt-handoff';

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice =>
  ({
    id: 'inv-1',
    invoiceNumber: 'INV-20261024-001',
    companyName: 'Acme Inc.',
    contactId: 'contact-1',
    originalAmount: 114,
    amountPaid: 57,
    dueDate: new Date('2026-11-01T12:00:00Z'),
    invoiceDate: new Date('2026-10-01T12:00:00Z'),
    createdAt: new Date('2026-10-01T12:00:00Z'),
    status: 'partially_paid',
    notes: '',
    taxType: '',
    userId: 'user-1',
    ...overrides,
  }) as Invoice;

test('resolveClientEmail prefers the email on the invoice contact (by id)', () => {
  const contacts = [
    { id: 'contact-1', name: 'Jane Doe', email: 'jane@acme.com' },
    { id: 'contact-2', name: 'Acme Inc.', email: 'other@acme.com' },
  ];
  assert.equal(resolveClientEmail({ contactId: 'contact-1', companyName: 'Acme Inc.' }, contacts), 'jane@acme.com');
});

test('resolveClientEmail falls back to a company-name match when the contact has no email', () => {
  const contacts = [
    { id: 'contact-1', name: 'Jane Doe' }, // no email
    { id: 'contact-9', name: 'Acme Inc.', email: 'billing@acme.com' },
  ];
  assert.equal(resolveClientEmail({ contactId: 'contact-1', companyName: 'Acme Inc.' }, contacts), 'billing@acme.com');
});

test('resolveClientEmail also matches the contact businessName', () => {
  const contacts = [
    { id: 'contact-3', name: 'Sam Smith', businessName: 'Acme Inc.', email: 'sam@acme.com' },
  ];
  assert.equal(resolveClientEmail({ contactId: 'unknown', companyName: 'Acme Inc.' }, contacts), 'sam@acme.com');
});

test('resolveClientEmail returns undefined when nothing usable exists', () => {
  const contacts = [
    { id: 'contact-1', name: 'Jane Doe', email: '   ' },
    { id: 'contact-2', name: 'Other Co.' },
  ];
  assert.equal(resolveClientEmail({ contactId: 'contact-1', companyName: 'Acme Inc.' }, contacts), undefined);
});

test('buildReceiptHandoff serializes dates to ISO strings and passes the receipt number', () => {
  const payload = buildReceiptHandoff(makeInvoice({ lastReceiptNumber: 'REC-20261024-003' }));

  assert.equal(payload.invoice.id, 'inv-1');
  assert.equal(payload.receiptNumber, 'REC-20261024-003');
  assert.equal(payload.carryForwardAmount, 0);
  assert.equal(payload.clientEmail, undefined); // set by openInvoiceReceipt opts, not the base payload
  assert.equal(payload.invoice.dueDate, new Date('2026-11-01T12:00:00Z').toISOString());
  assert.equal(payload.invoice.createdAt, new Date('2026-10-01T12:00:00Z').toISOString());
});

test('buildReceiptHandoff omits the receipt number for legacy payments', () => {
  const payload = buildReceiptHandoff(makeInvoice({ lastReceiptNumber: undefined }));
  assert.equal(payload.receiptNumber, undefined);
});