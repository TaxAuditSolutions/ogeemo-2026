import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';

test('routes direct contact creation requests into the OCP conversation', () => {
    assert.equal(processCommand('create a contact').type, 'unknown');
    assert.equal(processCommand('add a new contact named Ada Lovelace').type, 'unknown');
});

test('retains ordinary Contacts Hub navigation', () => {
    const result = processCommand('open contacts');

    assert.equal(result.type, 'navigation');
    assert.equal(result.target, '/contacts');
});

test('retains unrelated creation commands', () => {
    const result = processCommand('create a project called Apollo');

    assert.equal(result.type, 'action');
    assert.match(result.target || '', /^\/projects\/create/);
});