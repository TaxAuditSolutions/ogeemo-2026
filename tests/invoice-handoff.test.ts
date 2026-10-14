import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  writeInvoiceDraftHandoff,
  readInvoiceDraftHandoff,
  discardInvoiceDraftHandoff,
} from '../src/lib/invoice-handoff';

/** Minimal Storage stub - the handoff only uses getItem/setItem/removeItem. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  } as unknown as Storage;
}

test('handoff: write then read returns the payload', () => {
    const storage = fakeStorage();
    writeInvoiceDraftHandoff(
        { contactId: 'c1', entryRefs: [{ id: 'e1', source: 'event' }, { id: 'tl1', source: 'log' }] },
        storage
    );
    const read = readInvoiceDraftHandoff(storage);
    assert.ok(read);
    assert.equal(read.contactId, 'c1');
    assert.deepEqual(read.entryRefs, [{ id: 'e1', source: 'event' }, { id: 'tl1', source: 'log' }]);
});

test('handoff: read is read-once - a second read returns null (no stale re-apply)', () => {
    const storage = fakeStorage();
    writeInvoiceDraftHandoff({ contactId: 'c1', entryRefs: [{ id: 'e1', source: 'log' }] }, storage);
    assert.ok(readInvoiceDraftHandoff(storage));
    assert.equal(readInvoiceDraftHandoff(storage), null);
});

test('handoff: empty entry list is never written', () => {
    const storage = fakeStorage();
    writeInvoiceDraftHandoff({ contactId: 'c1', entryRefs: [] }, storage);
    assert.equal(readInvoiceDraftHandoff(storage), null);
});

test('handoff: missing contactId is never written', () => {
    const storage = fakeStorage();
    writeInvoiceDraftHandoff({ contactId: '', entryRefs: [{ id: 'e1', source: 'log' }] }, storage);
    assert.equal(readInvoiceDraftHandoff(storage), null);
});

test('handoff: stale payload (older than TTL) is discarded', () => {
    const storage = fakeStorage();
    writeInvoiceDraftHandoff({ contactId: 'c1', entryRefs: [{ id: 'e1', source: 'log' }] }, storage);
    // Age the stored payload beyond the 1h TTL.
    const raw = JSON.parse(storage.getItem('invoiceDraftHandoff')!);
    raw.createdAt = Date.now() - 2 * 60 * 60 * 1000;
    storage.setItem('invoiceDraftHandoff', JSON.stringify(raw));
    assert.equal(readInvoiceDraftHandoff(storage), null);
});

test('handoff: malformed or wrong-typed payloads are rejected', () => {
    const storage = fakeStorage();
    storage.setItem('invoiceDraftHandoff', '{not json');
    assert.equal(readInvoiceDraftHandoff(storage), null);

    storage.setItem('invoiceDraftHandoff', JSON.stringify({ contactId: 42, entryRefs: [{}] }));
    assert.equal(readInvoiceDraftHandoff(storage), null);

    storage.setItem('invoiceDraftHandoff', JSON.stringify({ contactId: 'c1', entryRefs: 'nope', createdAt: Date.now() }));
    assert.equal(readInvoiceDraftHandoff(storage), null);
});

test('handoff: invalid refs are filtered; payload with no valid refs is rejected', () => {
    const storage = fakeStorage();
    storage.setItem('invoiceDraftHandoff', JSON.stringify({
        contactId: 'c1',
        entryRefs: [{ id: 'ok', source: 'log' }, { id: '', source: 'event' }, { id: 'x', source: 'other' }, null],
        createdAt: Date.now(),
    }));
    const read = readInvoiceDraftHandoff(storage);
    assert.ok(read);
    assert.deepEqual(read.entryRefs, [{ id: 'ok', source: 'log' }]);

    storage.setItem('invoiceDraftHandoff', JSON.stringify({
        contactId: 'c1',
        entryRefs: [{ id: '', source: 'event' }],
        createdAt: Date.now(),
    }));
    assert.equal(readInvoiceDraftHandoff(storage), null);
});

test('handoff: discard clears a pending payload', () => {
    const storage = fakeStorage();
    writeInvoiceDraftHandoff({ contactId: 'c1', entryRefs: [{ id: 'e1', source: 'log' }] }, storage);
    discardInvoiceDraftHandoff(storage);
    assert.equal(readInvoiceDraftHandoff(storage), null);
});
