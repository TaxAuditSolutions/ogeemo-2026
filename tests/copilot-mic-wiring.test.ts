import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf8');

test('Co-Pilot chat has its own mic beside the message field (regression: mic hidden by the panel)', () => {
  const sidebar = read('src', 'components', 'co-pilot', 'ogeemo-copilot-sidebar.tsx');
  assert.match(sidebar, /<CopilotMicButton value=\{input\} onChange=\{setInput\}/);
  // The mic comes before the Send button in the same row.
  assert.ok(sidebar.indexOf('<CopilotMicButton') < sidebar.indexOf('aria-label="Send message"'));
});

test('the Co-Pilot mic honors the Voice Dictation preference and appends to the field', () => {
  const mic = read('src', 'components', 'co-pilot', 'copilot-mic-button.tsx');
  assert.match(mic, /showDictationButton === false/);
  assert.match(mic, /appendTranscript\(baseRef\.current, transcript\)/);
});

test('the floating mic moves left of the desktop Co-Pilot panel instead of sitting under it', () => {
  const g = read('src', 'components', 'ui', 'global-dictation-button.tsx');
  assert.match(g, /copilot\.isMobile \? undefined : copilot\.layoutWidth \+ 24/);
});
