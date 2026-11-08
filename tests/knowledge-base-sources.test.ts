import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadKnowledgeDocuments } from '../src/ai/knowledge-base/source-documents';
import { allMenuItems } from '../src/lib/menu-items';

const documents = loadKnowledgeDocuments();

test('pilot source documents are valid, unique and substantive', () => {
  assert.ok(documents.length >= 10);
  assert.equal(new Set(documents.map((document) => document.id)).size, documents.length);
  for (const document of documents) {
    assert.ok(document.content.length >= 100, `${document.id} is too thin to be useful`);
    assert.ok(document.keywords.length >= 3, `${document.id} needs retrieval keywords`);
  }
});

test('every source citation route is a real menu destination', () => {
  const routes = new Set(allMenuItems.map((item) => item.href));
  for (const document of documents) {
    for (const route of document.routes) assert.ok(routes.has(route), `${document.id} cites unknown route ${route}`);
  }
});

test('every source document points at files that exist', () => {
  for (const document of documents) {
    for (const sourceFile of document.sourceFiles) assert.ok(fs.existsSync(sourceFile), `${document.id} missing ${sourceFile}`);
  }
});

test('Knowledge Base is independently registered in navigation', () => {
  const item = allMenuItems.find((item) => item.href === '/knowledge-base');
  assert.equal(item?.label, 'Knowledge Base');
});
