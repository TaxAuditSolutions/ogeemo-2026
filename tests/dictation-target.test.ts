import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTextEntry, pickDictationField } from '../src/lib/dictation-target';

const textarea = (over: Record<string, unknown> = {}) => ({ tagName: 'TEXTAREA', isConnected: true, ...over });
const input = (type = 'text', over: Record<string, unknown> = {}) => ({ tagName: 'INPUT', type, isConnected: true, ...over });
const body = { tagName: 'BODY', isConnected: true };

test('isTextEntry: accepts textareas and text-like inputs', () => {
    assert.equal(isTextEntry(textarea()), true);
    assert.equal(isTextEntry(input('text')), true);
    assert.equal(isTextEntry(input('search')), true);
    assert.equal(isTextEntry(input('')), true); // HTML defaults to type=text
});

test('isTextEntry: rejects non-text inputs, plain objects and disconnected fields', () => {
    assert.equal(isTextEntry(input('number')), false);
    assert.equal(isTextEntry(input('radio')), false);
    assert.equal(isTextEntry(body), false);
    assert.equal(isTextEntry(null), false);
    assert.equal(isTextEntry(textarea({ isConnected: false })), false);
});

test('pickDictationField: prefers the focused field', () => {
    const active = textarea({ id: 'notes' });
    assert.equal(pickDictationField(active, textarea({ id: 'sn' }), textarea()), active);
});

test('pickDictationField: falls back to the last-focused field (mic-first flow)', () => {
    const last = textarea();
    assert.equal(pickDictationField(body, last, null), last);
});

test('pickDictationField: falls back to the page default (Activity Manager Details)', () => {
    const fallback = textarea({ id: 'notes' });
    assert.equal(pickDictationField(null, body, fallback), fallback);
});

test('pickDictationField: returns null when there is no text field at all', () => {
    assert.equal(pickDictationField(body, null, null), null);
});
