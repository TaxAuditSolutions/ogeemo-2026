import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeKnowledgeReply } from '../src/ai/flows/knowledge-base-chat';

test('reply sanitizer keeps ordinary Markdown and valid Ogeemo routes', () => {
  const reply = '1. Open [Activity Manager](/event-manager).\n2. Choose **No set time**.';
  assert.equal(sanitizeKnowledgeReply(reply), reply);
});

test('reply sanitizer removes model-added source appendices and HTML', () => {
  const reply = 'Choose **Favorites**.\n\n<details><summary>Source IDs</summary><ul><li>navigation.sidebar.views</li></ul></details>';
  assert.equal(sanitizeKnowledgeReply(reply), 'Choose **Favorites**.');
});

test('reply sanitizer removes external and malformed links', () => {
  const reply = 'Save stores the activity.\n\n(Source: [save](chrome-extension://bad-link))';
  assert.equal(sanitizeKnowledgeReply(reply), 'Save stores the activity.');
  assert.equal(sanitizeKnowledgeReply('Read [this](https://example.com) first.'), 'Read this first.');
});
