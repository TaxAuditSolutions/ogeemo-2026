import assert from 'node:assert/strict';
import test from 'node:test';

import { buildScrubbedMessages } from '../src/ai/capability-history';

const history = [
    { role: 'user', content: 'create a contact' },
    { role: 'model', content: 'Name?', action: { type: 'update_contact_draft', patch: { name: 'Porky Pig', sin: '123456789' } } },
    { role: 'user', content: 'Friends' },
];

test('annotates model turns with the action the client executed and masks HR fields', () => {
    const messages = buildScrubbedMessages(history, 'Friends', { annotateActions: true });
    const modelText = messages[1].content.map((part: { text: string }) => part.text).join('');
    assert.match(modelText, /\[form updated: name=Porky Pig, sin=\*\*\*\]/);
    assert.doesNotMatch(modelText, /123456789/);
});

test('leaves history untouched unless annotation is requested', () => {
    const messages = buildScrubbedMessages(history, 'Friends');
    assert.equal(messages[1].content.length, 1);
});
