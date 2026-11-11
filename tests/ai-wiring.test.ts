import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { sanitizeKnowledgeReply } from '../src/ai/flows/knowledge-base-chat';

const read = (file: string) => fs.readFileSync(file, 'utf8');
/** The file without its comments, so a note explaining a past bug does not count as the bug. */
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('the reply sanitizer keeps real Ogeemo links and removes protocol-relative ones that point at another site', () => {
  assert.equal(sanitizeKnowledgeReply('Open [Contacts](/contacts) first.'), 'Open [Contacts](/contacts) first.');
  assert.equal(sanitizeKnowledgeReply('Open [here](//evil.com/phish) first.'), 'Open here first.');
  assert.equal(sanitizeKnowledgeReply('Open [here](/\\evil.com) first.'), 'Open here first.');
  assert.equal(sanitizeKnowledgeReply('Open [here](https://evil.com) first.'), 'Open here first.');
});

test('the agent gives the tools a context: the generate call passes the server-supplied identity', () => {
  const source = read('src/ai/flows/ogeemo-chat.ts');
  // The flow once called ai.generate with no context, so every tool saw {} and refused as "not authenticated".
  assert.match(source, /context: \{\s*userId: runtimeContext\?\.userId,\s*orgId: runtimeContext\?\.orgId,\s*accessLevel: runtimeContext\?\.accessLevel,\s*timeZone: runtimeContext\?\.timeZone,\s*\}/);
  for (const handler of ['searchContactsHandler', 'searchGlobalHandler', 'syncReceiptsHandler', 'createTaskHandler']) {
    assert.ok(source.includes(`${handler}(`), `${handler} is not used by the agent`);
  }
});

test('the agent no longer accepts an identity from the browser or invents contacts', () => {
  const source = read('src/ai/flows/ogeemo-chat.ts');
  assert.ok(!source.includes('clientUserId'), 'clientUserId is back in the agent');
  assert.ok(!source.includes('ogeemo-guest'), 'the guest identity is back in the agent');
  for (const fake of ['dan-admin-id', 'julie-support-id', 'dan@ogeemo.com', 'Memory Bridge']) {
    assert.ok(!source.includes(fake), `${fake} is back in the agent`);
  }
  assert.ok(!read('src/app/(app)/co-pilot/page.tsx').includes('dan-admin-id'), 'the fake Dan is back on the Co-Pilot page');
});

test('every AI route takes the user from the session, and none trusts a user id from the request body', () => {
  const routes = [
    'src/app/api/ogeemo-assistant/route.ts',
    'src/app/api/genkit/chat/route.ts',
    'src/app/api/genkit/generate-image/route.ts',
    'src/app/api/knowledge-base/chat/route.ts',
    'src/app/api/ogeemo-chat-title/route.ts',
  ];
  for (const route of routes) {
    const source = read(route);
    assert.match(source, /getCurrentSessionContext|getCurrentUserId/, `${route} does not check the session`);
    assert.match(source, /Limiter\.check\(/, `${route} has no rate limit`);
    assert.ok(!/body\??\.(clientUserId|userId|orgId|accessLevel)\b/.test(source), `${route} reads an identity from the body`);
  }
});

test('the server actions the browser can call check the session themselves and take no user id', () => {
  for (const file of ['src/ai/flows/image-generation-flow.ts', 'src/ai/flows/sandbox-agent-flow.ts']) {
    const source = read(file);
    assert.match(source, /getCurrentUserId\(\)/, `${file} does not read the session`);
    assert.ok(!source.includes('clientUserId'), `${file} still accepts a client user id`);
    assert.match(source, /Limiter\.check\(/, `${file} has no rate limit`);
  }
});

test('no flow asks for a model the API no longer lists', () => {
  for (const file of ['src/ai/flows/image-generation-flow.ts', 'src/ai/flows/sandbox-agent-flow.ts', 'src/ai/flows/generate-chat-title.ts', 'src/ai/flows/knowledge-base-chat.ts', 'src/ai/flows/ogeemo-chat.ts']) {
    let source: string;
    try { source = code(file); } catch { continue; }
    for (const gone of ['imagen-3', 'gemini-1.5', 'gemini-2.5-flash-preview-04-17', 'gemini25FlashPreview0417']) {
      assert.ok(!source.includes(gone), `${file} still uses ${gone}`);
    }
  }
});

test('the AI key is read from the server environment only and never logged', () => {
  const source = code('src/ai/genkit.ts');
  assert.ok(!source.includes('NEXT_PUBLIC_'), 'a NEXT_PUBLIC key would be shipped to every browser');
  assert.ok(!/substring\(|slice\(/.test(source), 'part of the key is logged');
});

test('the receipt folder lists no made-up files and Drive extraction returns no invented invoice', () => {
  const drive = read('src/services/google-service.ts');
  for (const fake of ['INV_2024_02_28_Acme_Supplies', 'Shell_Gas_Station_Receipt', 'Office_Depot_Order_Confirm']) {
    assert.ok(!drive.includes(fake), `${fake} is back`);
  }
  const ocr = read('src/app/actions/ocr-actions.ts');
  assert.ok(!ocr.includes('mockExtraction') && !ocr.includes('Math.random'), 'the invented invoice is back');
});

test('the agent retries an empty reply once, only before any tool ran, and never claims success on an empty reply', () => {
  const source = code('src/ai/flows/ogeemo-chat.ts');
  assert.match(source, /shouldRetryEmptyReply\(result\.text, called\)/, 'the empty-reply retry is gone');
  assert.match(source, /emptyReplyMessage\(called\)/, 'the honest empty-reply message is gone');
  assert.ok(!source.includes('I processed your request.", toolsCalled'), 'the false-success message is back on the tool agent');
  assert.ok(!/result\.text\s*\|\|\s*"I processed your request\."/.test(source.split('ogeemoGeneralKnowledgeFallbackFlow = ai.defineFlow')[0]), 'the tool agent says it processed a request it may not have');
});
