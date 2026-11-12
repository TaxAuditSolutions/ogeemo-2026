import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { TOOLS_UNAVAILABLE_NOTE, fallbackAnswer } from '../src/lib/ai-fallback-note';

test('an answer from the no-tools fallback always carries the server\'s own "nothing was saved" note', () => {
  const reply = fallbackAnswer('Requested to save the changes for Phone test.', 'error');
  assert.match(reply, /^Requested to save the changes for Phone test\./);
  assert.ok(reply.endsWith(`_${TOOLS_UNAVAILABLE_NOTE}_`));
  assert.match(TOOLS_UNAVAILABLE_NOTE, /nothing was saved or changed/);
});

test('the note is added whenever the main assistant did not answer, whatever the reason', () => {
  for (const outcome of ['error', 'empty_reply', 'refusal_pattern'] as const) {
    assert.match(fallbackAnswer('Some answer.', outcome), /nothing was saved or changed/, outcome);
  }
});

test('an empty fallback answer becomes the note alone, never a blank reply', () => {
  assert.equal(fallbackAnswer('', 'error'), TOOLS_UNAVAILABLE_NOTE);
  assert.equal(fallbackAnswer('   ', 'empty_reply'), TOOLS_UNAVAILABLE_NOTE);
  assert.equal(fallbackAnswer(undefined as unknown as string, 'error'), TOOLS_UNAVAILABLE_NOTE);
});

test('if the main assistant had answered, nothing is added (not used today, but the rule is stated)', () => {
  assert.equal(fallbackAnswer('Fine.', 'accepted'), 'Fine.');
});

test('the wiring: the route uses it, and the fallback prompt says it has no tools and must not claim to have acted', () => {
  const route = fs.readFileSync('src/app/api/ogeemo-assistant/route.ts', 'utf8');
  assert.match(route, /fallbackAnswer\(generalAnswer, operationalOutcome\)/);
  const flow = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  const start = flow.indexOf('const generalKnowledgeFallbackPrompt');
  const prompt = flow.slice(start, flow.indexOf('`;', start));
  assert.match(prompt, /NO tools/);
  assert.match(prompt, /Never say or imply that you did, requested or started/);
});
