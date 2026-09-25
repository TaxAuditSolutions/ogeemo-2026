import assert from 'node:assert/strict';
import test from 'node:test';

import { isAwaitingAssistantReply, isContactEditRequest, shouldProcessAsCommand } from '../src/lib/copilot-routing';

const clarifyingQuestion = {
    role: 'model' as const,
    content: 'I can help with that. Would you like step-by-step instructions, or would you like me to assist you by preparing the form?',
};

test('treats a reply to an assistant question as conversation, not a command', () => {
    assert.equal(isAwaitingAssistantReply([clarifyingQuestion]), true);
    assert.equal(shouldProcessAsCommand('prepare the form', [clarifyingQuestion]), false);
    assert.equal(shouldProcessAsCommand('step-by-step instructions', [clarifyingQuestion]), false);
});

test('still honors an explicit command verb during an open exchange', () => {
    assert.equal(shouldProcessAsCommand('open accounting', [clarifyingQuestion]), true);
});

test('routes ordinary turns through the command processor', () => {
    assert.equal(shouldProcessAsCommand('open contacts', []), true);
    assert.equal(
        shouldProcessAsCommand('open contacts', [{ role: 'model', content: 'Contacts Hub is ready.' }]),
        true,
    );
});

test('routes contact-creation requests to the conversation, not the command path', () => {
    assert.equal(shouldProcessAsCommand('open create a new contact form', []), false);
    assert.equal(shouldProcessAsCommand('create a new contact for John Test', []), false);
    assert.equal(shouldProcessAsCommand('add a new contact named Dana White', []), false);
});

test('recognizes contact-editing requests', () => {
    assert.equal(isContactEditRequest('edit John Doe\'s contact'), true);
    assert.equal(isContactEditRequest('update Jane\'s contact phone number'), true);
    assert.equal(isContactEditRequest('modify the contact for Acme'), true);
    assert.equal(isContactEditRequest('change John\'s contact email'), true);
    assert.equal(isContactEditRequest('edit John Doe'), false);
    assert.equal(isContactEditRequest('open contacts'), false);
});

test('routes contact-editing requests to the conversation, not the command path', () => {
    assert.equal(shouldProcessAsCommand('edit John Doe\'s contact', []), false);
    assert.equal(shouldProcessAsCommand('update Jane\'s contact phone number to 555-0199', []), false);
});

test('keeps every contact workflow answer in the assistant conversation', () => {
    const turns = [
        { role: 'user' as const, content: 'I want to create a contact' },
        { role: 'model' as const, content: 'Would you like instructions, or should I create the contact for you?' },
    ];
    assert.equal(shouldProcessAsCommand('create it for me', turns), false);

    turns.push(
        { role: 'user', content: 'create it for me' },
        { role: 'model', content: 'Should you fill the contact form, or should I fill it?' },
    );
    assert.equal(shouldProcessAsCommand('you fill it out', turns), false);

    turns.push(
        { role: 'user', content: 'you fill it out' },
        { role: 'model', content: "What is the contact's Full Legal Name?" },
    );
    assert.equal(shouldProcessAsCommand('Jane Doe', turns), false);

    turns.push(
        { role: 'user', content: 'Jane Doe' },
        { role: 'model', content: 'Which Folder/Category should I use for this contact?' },
    );
    assert.equal(shouldProcessAsCommand('Clients', turns), false);

    turns.push(
        { role: 'user', content: 'Clients' },
        { role: 'model', content: 'Create Jane Doe in Clients?' },
    );
    assert.equal(shouldProcessAsCommand('Yes', turns), false);
});

test('keeps every contact-editing workflow answer in the assistant conversation', () => {
    const turns = [
        { role: 'user' as const, content: 'I want to edit a contact' },
        { role: 'model' as const, content: 'Would you like instructions, or should I find and edit it for you?' },
    ];
    assert.equal(shouldProcessAsCommand('find and edit it for me', turns), false);

    turns.push(
        { role: 'user', content: 'find and edit it for me' },
        { role: 'model', content: 'Which contact would you like to edit?' },
    );
    assert.equal(shouldProcessAsCommand('Jane Doe', turns), false);

    turns.push(
        { role: 'user', content: 'Jane Doe' },
        { role: 'model', content: 'I found Jane Doe and opened the record. What would you like to update?' },
    );
    assert.equal(shouldProcessAsCommand('change her phone to 555-0199', turns), false);

    turns.push(
        { role: 'user', content: 'change her phone to 555-0199' },
        { role: 'model', content: 'Save this update to Jane Doe?' },
    );
    assert.equal(shouldProcessAsCommand('Yes', turns), false);
});

test('ignores empty input', () => {
    assert.equal(shouldProcessAsCommand('   ', []), false);
});
