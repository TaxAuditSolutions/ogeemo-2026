import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { KNOWLEDGE_MAX_OUTPUT_TOKENS, sanitizeKnowledgeReply } from '../src/ai/flows/knowledge-base-chat';

test('the Knowledge Base answer limit leaves room for the model\'s thinking, and the flow uses it', () => {
  // Measured on gemini-3.8-flash: one long how-to used 957 thinking tokens, so a 1000 limit left 39 for the answer.
  assert.ok(KNOWLEDGE_MAX_OUTPUT_TOKENS >= 4000, 'a low limit cuts long answers off');
  assert.ok(KNOWLEDGE_MAX_OUTPUT_TOKENS <= 8000, 'the limit should stay a sensible ceiling');
  const flow = fs.readFileSync('src/ai/flows/knowledge-base-chat.ts', 'utf8');
  assert.match(flow, /maxOutputTokens: KNOWLEDGE_MAX_OUTPUT_TOKENS/);
  assert.ok(!/maxOutputTokens: 1000/.test(flow), 'the old 1000 limit is back');
});

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
