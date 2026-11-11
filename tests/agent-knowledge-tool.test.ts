import assert from 'node:assert/strict';
import test from 'node:test';

import { searchKnowledgeHandler, type KnowledgeRetriever } from '../src/ai/agent-knowledge-tool';
import { asPublishedChunks, loadKnowledgeDocuments } from '../src/ai/knowledge-base/source-documents';
import { rankKnowledgeChunks } from '../src/ai/knowledge-base/retriever';
import { readToolContext } from '../src/lib/ai-runtime';

const chunks = asPublishedChunks(loadKnowledgeDocuments());
/** The real ranking over the real source entries, with no Firestore. */
const realRetriever: KnowledgeRetriever = async (input) => ({
  chunks: rankKnowledgeChunks(chunks, input),
  store: 'source-fallback',
  candidateCount: chunks.length,
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'UTC' });

test('a how-to question returns the matching Knowledge Base entry with its route', async () => {
  const result = await searchKnowledgeHandler(realRetriever, editor, { question: 'How do I create a project?' });
  assert.equal(result.success, true);
  assert.ok(result.passages.length > 0 && result.passages.length <= 3);
  assert.ok(result.passages.some((p) => p.routes.includes('/projects/all')), 'the Project List route should come back');
  assert.match(result.message, /Answer only from them/);
});

test('each passage is bounded so the prompt does not grow with the answer', async () => {
  const long: KnowledgeRetriever = async () => ({
    chunks: Array.from({ length: 6 }, (_, i) => ({ ...chunks[0], id: `x${i}`, content: 'a'.repeat(9000), routes: ['/a', '/b', '/c', '/d', '/e'], score: 10 })),
    store: 'source-fallback',
    candidateCount: 6,
  });
  const result = await searchKnowledgeHandler(long, editor, { question: 'anything' });
  assert.equal(result.passages.length, 3);
  for (const passage of result.passages) {
    assert.ok(passage.content.length <= 1503);
    assert.equal(passage.routes.length, 3);
  }
});

test('the user role is passed to the retriever, and an unknown role is passed as none', async () => {
  const seen: any[] = [];
  const spy: KnowledgeRetriever = async (input) => {
    seen.push(input);
    return { chunks: [], store: 'source-fallback', candidateCount: 0 };
  };
  await searchKnowledgeHandler(spy, readToolContext({ userId: 'u1', orgId: 'o', accessLevel: 'viewer' }), { question: 'invoices' });
  await searchKnowledgeHandler(spy, readToolContext({ userId: 'u1', orgId: 'o', accessLevel: 'root' }), { question: 'invoices' });
  assert.equal(seen[0].accessLevel, 'viewer');
  assert.equal(seen[1].accessLevel, undefined);
  assert.equal(seen[0].limit, 3);
});

test('no match tells the model not to guess', async () => {
  const empty: KnowledgeRetriever = async () => ({ chunks: [], store: 'source-fallback', candidateCount: 0 });
  const result = await searchKnowledgeHandler(empty, editor, { question: 'zzqx' });
  assert.equal(result.success, true);
  assert.deepEqual(result.passages, []);
  assert.match(result.message, /Do not guess/);
});

test('a guest, a blank question and a retriever that throws all fail safely', async () => {
  const never: KnowledgeRetriever = async () => {
    throw new Error('should not be called');
  };
  const guest = await searchKnowledgeHandler(never, readToolContext(undefined), { question: 'x' });
  assert.equal(guest.success, false);
  assert.match(guest.message, /signed in/);
  const blank = await searchKnowledgeHandler(never, editor, { question: '   ' });
  assert.equal(blank.success, false);
  const broken = await searchKnowledgeHandler(never, editor, { question: 'invoices' });
  assert.equal(broken.success, false);
  assert.match(broken.message, /could not be searched/);
});
