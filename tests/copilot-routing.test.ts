import assert from 'node:assert/strict';
import test from 'node:test';

import { isAwaitingAssistantReply, shouldProcessAsCommand } from '../src/lib/copilot-routing';

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

test('ignores empty input', () => {
    assert.equal(shouldProcessAsCommand('   ', []), false);
});
