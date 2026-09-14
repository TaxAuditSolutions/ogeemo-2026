import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMessages } from '../src/services/chat-history-service';

test('preserves a valid persisted message action', () => {
    const messages = normalizeMessages([{
        role: 'model',
        content: 'Your destination is ready.',
        action: {
            type: 'dispatch',
            target: '/contacts',
            isExternal: false,
            label: 'Contacts Hub',
            category: 'Relationships',
        },
    }]);

    assert.deepEqual(messages[0]?.action, {
        type: 'dispatch',
        target: '/contacts',
        isExternal: false,
        label: 'Contacts Hub',
        category: 'Relationships',
    });
});

test('drops an invalid action without dropping its message', () => {
    const messages = normalizeMessages([{
        role: 'model',
        content: 'This message remains visible.',
        action: {
            type: 'dispatch',
            target: 'javascript:alert(1)',
            isExternal: true,
            label: 'Unsafe',
        },
    } as any]);

    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.content, 'This message remains visible.');
    assert.equal(messages[0]?.action, undefined);
});

test('continues to normalize legacy messages without actions', () => {
    assert.deepEqual(normalizeMessages([{
        role: 'user',
        content: 'Open contacts',
        timestamp: '2026-09-13T12:00:00.000Z',
    }]), [{
        role: 'user',
        content: 'Open contacts',
        timestamp: '2026-09-13T12:00:00.000Z',
    }]);
});