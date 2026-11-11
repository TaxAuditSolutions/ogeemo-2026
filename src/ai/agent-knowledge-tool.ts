/**
 * The searchKnowledge tool of the Co-Pilot agent (see tests/agent-knowledge-tool.test.ts).
 *
 * The four prompt files hold the basics; the reviewed Knowledge Base entries (src/ai/knowledge-base/sources) hold the
 * detail and the business rules of every module. This tool lets the model fetch the few entries that match a question
 * instead of loading all of them into every prompt. It is read-only, returns at most three short passages, and only
 * entries the user's role may read. The retriever is passed in so a test needs no database.
 */
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';
import type { KnowledgeAudience, KnowledgeRetrievalInput, KnowledgeRetrievalResult } from '@/ai/knowledge-base/types';

export type KnowledgeRetriever = (input: KnowledgeRetrievalInput) => Promise<KnowledgeRetrievalResult>;

export interface KnowledgePassage {
  title: string;
  module: string;
  routes: string[];
  content: string;
}

const MAX_PASSAGES = 3;
const MAX_PASSAGE_CHARS = 1500;
const ROLES = new Set(['super_admin', 'org_admin', 'editor', 'viewer']);

export async function searchKnowledgeHandler(retrieve: KnowledgeRetriever, ctx: ToolContext, input: { question?: string }) {
  if (!ctx.userId) return { success: false, passages: [] as KnowledgePassage[], message: 'You must be signed in to search the Knowledge Base.' };
  const question = oneLine(input.question, 300);
  if (!question) return { success: false, passages: [] as KnowledgePassage[], message: 'A question is needed to search the Knowledge Base.' };

  const accessLevel = ctx.accessLevel && ROLES.has(ctx.accessLevel) ? (ctx.accessLevel as KnowledgeAudience) : undefined;
  try {
    const result = await retrieve({ query: question, accessLevel, limit: MAX_PASSAGES });
    const passages: KnowledgePassage[] = result.chunks.slice(0, MAX_PASSAGES).map((chunk) => ({
      title: chunk.title,
      module: chunk.module,
      routes: chunk.routes.slice(0, 3),
      content: chunk.content.length > MAX_PASSAGE_CHARS ? `${chunk.content.slice(0, MAX_PASSAGE_CHARS)}...` : chunk.content,
    }));
    if (passages.length === 0) {
      return { success: true, passages, message: 'The Knowledge Base has nothing on that. Do not guess: say there is no verified documentation on it and point to the closest screen in the navigation map.' };
    }
    return { success: true, passages, message: `Found ${passages.length} Knowledge Base passage${passages.length === 1 ? '' : 's'}. Answer only from them and name the screen's route.` };
  } catch {
    return { success: false, passages: [] as KnowledgePassage[], message: 'The Knowledge Base could not be searched right now.' };
  }
}
