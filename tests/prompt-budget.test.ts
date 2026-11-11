import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

/**
 * A ceiling on what the Co-Pilot reads with every message, so the prompt cannot grow without anyone noticing.
 *
 * Measured on 11 Nov 2026 (about 4 characters to a token): the four knowledge files 38,200 characters (about 9,500
 * tokens), the system prompt rules 10,400 (about 2,600), and the 12 tool descriptions with their parameters 6,500
 * (about 1,600). docs/agent-knowledge-eval.md still states a goal of under 6,000 tokens for the knowledge files; that
 * goal is NOT met today, and 04_tool_definitions.json (about 3,900 tokens) repeats what Genkit already sends as each
 * tool's own schema. Trimming it is the way back under budget.
 *
 * These ceilings sit just above today's size. They fail when a change adds more than a little, so the author has to
 * either trim something or raise the number here on purpose, in the same commit, and say why.
 */
// Knowledge files: LOWERED on 11 Nov 2026 from 41,000 to 37,500. The per-tool "inputs" blocks in
// 04_tool_definitions.json (about 4,500 characters) were removed because Genkit already sends each tool's own schema
// with every request, so the model was reading every parameter twice. The measured size is now about 36,800 characters
// (about 9,200 tokens). The goal of under 6,000 tokens is still NOT met.
const KNOWLEDGE_CEILING_CHARS = 37_500;
const RULES_CEILING_CHARS = 11_500;
// Tool text: raised from 7,500 to 8,200 on 11 Nov 2026 for the 14th tool (updateContact). Each tool needs a description
// the model reads to choose it, and this is the only place a tool's purpose and limits are stated to it, so unlike the
// knowledge files this cannot be removed, only kept short. Measured about 7,980 after trimming the longest descriptions.
const TOOLS_CEILING_CHARS = 8_200;

const read = (file: string) => fs.readFileSync(file, 'utf8');

test('the four knowledge files stay under their ceiling', () => {
  const total = fs.readdirSync('src/ai/knowledge').reduce((sum, name) => sum + read(`src/ai/knowledge/${name}`).length, 0);
  assert.ok(total <= KNOWLEDGE_CEILING_CHARS, `knowledge files are ${total} characters (ceiling ${KNOWLEDGE_CEILING_CHARS}). Trim, or raise the ceiling in tests/prompt-budget.test.ts and say why.`);
});

test('the system prompt rules stay under their ceiling', () => {
  const source = read('src/ai/flows/ogeemo-chat.ts');
  const start = source.indexOf('const systemPromptTemplate = `');
  const end = source.indexOf('`;', start);
  assert.ok(start > 0 && end > start, 'could not find the system prompt template');
  const size = end - start;
  assert.ok(size <= RULES_CEILING_CHARS, `the prompt template is ${size} characters (ceiling ${RULES_CEILING_CHARS}). Trim, or raise the ceiling in tests/prompt-budget.test.ts and say why.`);
});

test('the tool descriptions and their parameter notes stay under their ceiling', () => {
  const source = read('src/ai/flows/ogeemo-chat.ts');
  const descriptions = [...source.matchAll(/ai\.defineTool\(\s*\{\s*name: '[^']+',\s*description: '((?:[^'\\]|\\.)*)'/g)].reduce((sum, m) => sum + m[1].length, 0);
  const parameters = [...source.matchAll(/\.describe\('((?:[^'\\]|\\.)*)'\)/g)].reduce((sum, m) => sum + m[1].length, 0);
  assert.ok(descriptions > 0, 'found no tool descriptions: check the pattern against ogeemo-chat.ts');
  const size = descriptions + parameters;
  assert.ok(size <= TOOLS_CEILING_CHARS, `tool text is ${size} characters (ceiling ${TOOLS_CEILING_CHARS}). Trim, or raise the ceiling in tests/prompt-budget.test.ts and say why.`);
});

test('the numbered Rules run 1, 2, 3 ... in order with none missing or repeated, so rules that refer to each other by number stay right', () => {
  const source = read('src/ai/flows/ogeemo-chat.ts');
  const start = source.indexOf('const systemPromptTemplate = `');
  const template = source.slice(start, source.indexOf('`;', start));
  // The Capabilities list above the Rules is numbered 1 to 3 on its own; only the Rules section is checked.
  const rules = template.slice(template.indexOf('**Rules:**'));
  assert.ok(rules.length > 100, 'could not find the Rules section');
  const numbers = [...rules.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
  assert.deepEqual(numbers, numbers.map((_, i) => i + 1), `rules are not 1..${numbers.length} in order: ${numbers.join(', ')}`);
});

test('rules that point at another rule by number point at a rule that exists', () => {
  const source = read('src/ai/flows/ogeemo-chat.ts');
  const start = source.indexOf('const systemPromptTemplate = `');
  const template = source.slice(start, source.indexOf('`;', start));
  const rules = template.slice(template.indexOf('**Rules:**'));
  const count = [...rules.matchAll(/^(\d+)\. \*\*/gm)].length;
  for (const m of rules.matchAll(/\(rules? ((?:\d+(?:, | and )?)+)\)/g)) {
    for (const n of m[1].match(/\d+/g) ?? []) assert.ok(Number(n) >= 1 && Number(n) <= count, `a rule points at rule ${n}, which does not exist (there are ${count})`);
  }
});
