import assert from 'node:assert/strict';
import test from 'node:test';

import { appendTranscript } from '../src/lib/transcript';

test('appendTranscript: appends with a single separating space', () => {
    assert.equal(appendTranscript('Site visit done', 'invoice sent'), 'Site visit done invoice sent');
});

test('appendTranscript: respects existing trailing whitespace', () => {
    assert.equal(appendTranscript('Site visit done ', 'invoice sent'), 'Site visit done invoice sent');
    assert.equal(appendTranscript('Line one\n', 'line two'), 'Line one\nline two');
});

test('appendTranscript: empty current becomes the addition', () => {
    assert.equal(appendTranscript('', '  Called the client  '), 'Called the client');
});

test('appendTranscript: whitespace-only additions are ignored', () => {
    assert.equal(appendTranscript('Keep me', '   '), 'Keep me');
    assert.equal(appendTranscript('', ''), '');
});