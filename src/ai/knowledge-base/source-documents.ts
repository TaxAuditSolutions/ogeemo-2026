import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { KNOWLEDGE_AUDIENCES, type KnowledgeChunk, type KnowledgeDocument } from './types';

const documentSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]+$/),
  module: z.string().min(1),
  title: z.string().min(1),
  routes: z.array(z.string().startsWith('/')),
  intents: z.array(z.string().min(1)).min(1),
  keywords: z.array(z.string().min(1)).min(1),
  audiences: z.array(z.enum(KNOWLEDGE_AUDIENCES)).min(1),
  content: z.string().min(40).max(6000),
  sourceFiles: z.array(z.string().min(1)).min(1),
});

const fileSchema = z.object({ documents: z.array(documentSchema).min(1) });

export const KNOWLEDGE_SOURCE_DIRECTORY = path.join(process.cwd(), 'src', 'ai', 'knowledge-base', 'sources');

/** Load and validate the repository-authored source of truth. */
export function loadKnowledgeDocuments(directory: string = KNOWLEDGE_SOURCE_DIRECTORY): KnowledgeDocument[] {
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.json')).sort();
  const documents = files.flatMap((file) => {
    const parsed = fileSchema.parse(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
    return parsed.documents;
  });
  const ids = documents.map((document) => document.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate Knowledge Base document id.');
  return documents;
}

export function asPublishedChunks(documents: KnowledgeDocument[]): KnowledgeChunk[] {
  return documents.map((document) => ({ ...document, published: true }));
}
