import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';

test('routes direct contact creation requests into the OCP conversation', () => {
    assert.equal(processCommand('create a contact').type, 'unknown');
    assert.equal(processCommand('add a new contact named Ada Lovelace').type, 'unknown');
});

test('routes direct contact editing requests into the OCP conversation', () => {
    assert.equal(processCommand('edit a contact').type, 'unknown');
    assert.equal(processCommand('edit contact for Ada Lovelace').type, 'unknown');
    assert.equal(processCommand('update contact for Jane Doe').type, 'unknown');
    assert.equal(processCommand('open edit contact form').type, 'unknown');

    const result = processCommand('modify contact for Jane Doe');
    assert.equal(result.type, 'unknown');
    assert.equal(result.message, 'Contact Assistance');
});

test('retains ordinary Contacts Hub navigation', () => {
    const result = processCommand('open contacts');

    assert.equal(result.type, 'navigation');
    assert.equal(result.target, '/contacts');
    assert.equal(result.label, 'Contacts Hub');
    assert.match(result.message, /^Ready:/);
    assert.doesNotMatch(`${result.message} ${result.description}`, /executing|opening|routing|navigating/i);
});

test('does not match short aliases embedded inside unrelated words', () => {
    assert.equal(processCommand('prepare the form').type, 'unknown');
    assert.equal(processCommand('prepare form').type, 'unknown');

    const accountsReceivable = processCommand('open ar');
    assert.equal(accountsReceivable.target, '/accounting/accounts-receivable');
    assert.equal(processCommand('open taxes').target, '/accounting/tax');
});

test('routes contact-form requests to the Co-Pilot conversation instead of the hub', () => {
    const result = processCommand('open create a new contact form');

    assert.equal(result.type, 'unknown');
    assert.equal(result.message, 'Contact Assistance');
});

test('offers Contacts Hub for conversational contact-creation assistance', () => {
    const result = processCommand('can you assist me with creating a contact');

    assert.equal(result.type, 'navigation');
    assert.equal(result.target, '/contacts');
    assert.equal(result.label, 'Contacts Hub');
    assert.equal(
        result.assistantMessage,
        "You can create a new contact in Contacts Hub. Click 'Contacts Hub' below to open it.",
    );
    assert.doesNotMatch(result.assistantMessage, /click dispatch/i);
});

test('retains unrelated creation commands', () => {
    const result = processCommand('create a project called Apollo');

    assert.equal(result.type, 'action');
    assert.match(result.target || '', /^\/projects\/create/);
    assert.doesNotMatch(`${result.message} ${result.description}`, /executing|opening|routing|navigating/i);
});

test('keeps timer parameters while waiting for explicit dispatch', () => {
    const result = processCommand('start timer for client work');

    assert.equal(result.type, 'action');
    assert.match(result.target || '', /^\/event-manager\?startTimer=true/);
    assert.match(result.target || '', /title=client/);
    assert.match(result.description || '', /ready to start/i);
});