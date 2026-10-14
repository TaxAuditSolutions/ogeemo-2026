import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isEligibleForBilling,
  isInvoiced,
  toInvoiceLineItem,
  reconcileSourceRefs,
  sourceRefsFromLineItems,
  entryRefKey,
  type InvoiceableEntry,
} from '../src/lib/billing-eligibility';

const base = (overrides: Partial<InvoiceableEntry>): InvoiceableEntry => ({
  id: 'e1',
  source: 'event',
  contactId: 'c1',
  title: 'Consulting',
  startTime: new Date('2026-10-01T10:00:00Z'),
  durationSeconds: 3600,
  isBillable: true,
  billableRate: 100,
  scheduledOnly: false,
  billedInvoiceId: null,
  ...overrides,
});

// --- isEligibleForBilling: OG-070 eligibility matrix ---

test('eligible: unbilled, billable, worked, with a client', () => {
    assert.equal(isEligibleForBilling(base({})), true);
});

test('not eligible: already invoiced (duplicate-billing guard)', () => {
    assert.equal(isEligibleForBilling(base({ billedInvoiceId: 'inv1' })), false);
});

test('not eligible: scheduled placeholder (planned, not worked)', () => {
    assert.equal(isEligibleForBilling(base({ scheduledOnly: true })), false);
});

test('not eligible: non-billable entry', () => {
    assert.equal(isEligibleForBilling(base({ isBillable: false })), false);
});

test('not eligible: zero duration', () => {
    assert.equal(isEligibleForBilling(base({ durationSeconds: 0 })), false);
});

test('not eligible: no client attached', () => {
    assert.equal(isEligibleForBilling(base({ contactId: null })), false);
});

// --- isInvoiced: recognized-but-not-addable state ---

test('isInvoiced: billed entry is recognized, not re-offered', () => {
    assert.equal(isInvoiced(base({ billedInvoiceId: 'inv1' })), true);
    assert.equal(isInvoiced(base({})), false);
    // scheduled placeholders are not "invoiced" - they are simply not billable yet
    assert.equal(isInvoiced(base({ scheduledOnly: true, billedInvoiceId: 'inv9' })), false);
});

// --- toInvoiceLineItem: one shared mapping for invoice + quote generators ---

test('toInvoiceLineItem: maps title/date/hours/rate and carries the source ref', () => {
    const item = toInvoiceLineItem(base({}), 2, 1727770000000);
    assert.equal(item.id, 'time_1727770000000_2');
    assert.equal(item.quantity, 1);
    assert.equal(item.price, 100);
    assert.equal(item.sourceEntryId, 'e1');
    assert.equal(item.sourceEntryType, 'event');
    assert.ok(item.description.startsWith('Consulting - '), item.description);
});

test('toInvoiceLineItem: log-source entries map with sourceEntryType log', () => {
    const item = toInvoiceLineItem(base({ id: 'tl9', source: 'log', durationSeconds: 5400 }), 0, 1);
    assert.equal(item.quantity, 1.5);
    assert.equal(item.sourceEntryId, 'tl9');
    assert.equal(item.sourceEntryType, 'log');
});

test('toInvoiceLineItem: missing start date renders N/A', () => {
    const item = toInvoiceLineItem(base({ startTime: null }), 0, 1);
    assert.ok(item.description.endsWith(' - N/A'), item.description);
});

// --- reconcileSourceRefs: invoice edit keeps stamps consistent ---

test('reconcileSourceRefs: added refs are stamped, removed refs unstamped', () => {
    const oldRefs = [{ id: 'a', source: 'event' as const }, { id: 'b', source: 'log' as const }];
    const newRefs = [{ id: 'b', source: 'log' as const }, { id: 'c', source: 'event' as const }];
    const { toStamp, toUnstamp } = reconcileSourceRefs(oldRefs, newRefs);
    assert.deepEqual(toStamp.map(entryRefKey), ['event:c']);
    assert.deepEqual(toUnstamp.map(entryRefKey), ['event:a']);
});

test('reconcileSourceRefs: same set means no stamp writes', () => {
    const refs = [{ id: 'a', source: 'log' as const }];
    const { toStamp, toUnstamp } = reconcileSourceRefs(refs, [...refs]);
    assert.equal(toStamp.length, 0);
    assert.equal(toUnstamp.length, 0);
});

test('reconcileSourceRefs: source distinguishes same id across collections', () => {
    const oldRefs = [{ id: 'x', source: 'log' as const }];
    const newRefs = [{ id: 'x', source: 'event' as const }];
    const { toStamp, toUnstamp } = reconcileSourceRefs(oldRefs, newRefs);
    assert.equal(toStamp.length, 1);
    assert.equal(toUnstamp.length, 1);
});

// --- sourceRefsFromLineItems: only lines with a source carry refs ---

test('sourceRefsFromLineItems: filters lines without source links (manual/library items)', () => {
    const refs = sourceRefsFromLineItems([
        { sourceEntryId: 'a', sourceEntryType: 'log' },
        { description: 'manual line' },
        { sourceEntryId: 'b', sourceEntryType: 'event' },
        { sourceEntryId: 'orphan' }, // type missing -> ignored
    ]);
    assert.deepEqual(refs, [
        { id: 'a', source: 'log' },
        { id: 'b', source: 'event' },
    ]);
});
