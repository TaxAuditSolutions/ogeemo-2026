import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReceiptEmail, OGEEMO_APP_URL } from '../src/core/email-service';

test('receipt email goes to the client with the REC number in the subject', () => {
  const message = buildReceiptEmail({
    to: 'ap@acme.com',
    companyName: 'Acme Inc.',
    invoiceNumber: 'INV-20261024-001',
    receiptNumber: 'REC-20261024-003',
    amount: 57,
    originalAmount: 114,
    amountPaid: 57,
    paymentDate: '2026-10-24',
  });

  assert.deepEqual(message.to, ['ap@acme.com']);
  assert.equal(message.subject, 'Receipt REC-20261024-003 for Invoice INV-20261024-001');
  assert.match(message.text, /Receipt #: REC-20261024-003/);
  assert.match(message.text, /Invoice #: INV-20261024-001/);
  assert.match(message.text, /Amount received: \$57\.00/);
  assert.match(message.text, /Invoice total: \$114\.00/);
  assert.match(message.text, /October 24, 2026/);
  assert.match(message.text, new RegExp(`${OGEEMO_APP_URL}/accounting/accounts-receivable`));
});

test('fully paid invoices report "Paid in full" as the balance', () => {
  const message = buildReceiptEmail({
    to: 'ap@acme.com',
    companyName: 'Acme Inc.',
    invoiceNumber: 'INV-20261024-001',
    receiptNumber: 'REC-20261024-003',
    amount: 114,
    originalAmount: 114,
    amountPaid: 114,
  });

  assert.match(message.text, /Balance due: Paid in full/);
  assert.match(message.html, /Paid in full/);
});

test('partial payments show the remaining balance', () => {
  const message = buildReceiptEmail({
    to: 'ap@acme.com',
    companyName: 'Acme Inc.',
    invoiceNumber: 'INV-20261019-001',
    receiptNumber: 'REC-20261024-004',
    amount: 50,
    originalAmount: 114,
    amountPaid: 50,
  });

  assert.match(message.text, /Balance due: \$64\.00/);
  assert.doesNotMatch(message.text, /Paid in full/);
});

test('legacy receipts without a REC number fall back to an invoice-only subject', () => {
  const message = buildReceiptEmail({
    to: 'ap@acme.com',
    companyName: 'Acme Inc.',
    invoiceNumber: 'INV-101',
    amount: 100,
  });

  assert.equal(message.subject, 'Receipt for Invoice INV-101');
  assert.match(message.text, /Receipt #: see invoice record/);
});

test('receipt email escapes HTML in the company name and invoice number', () => {
  const message = buildReceiptEmail({
    to: 'ap@acme.com',
    companyName: '<script>alert("xss")</script>',
    invoiceNumber: 'INV-<b>1</b>',
    amount: 10,
  });

  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.html, /&lt;script&gt;/);
  assert.match(message.html, /&lt;b&gt;1&lt;\/b&gt;/);
  assert.match(message.text, /<script>alert\("xss"\)<\/script>/); // plain-text body is not HTML
});

test('receipt email uses today when no payment date is given', () => {
  const message = buildReceiptEmail({
    to: 'ap@acme.com',
    companyName: 'Acme Inc.',
    invoiceNumber: 'INV-1',
    amount: 10,
  });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  assert.match(message.text, new RegExp(`Date received: ${today}`));
});