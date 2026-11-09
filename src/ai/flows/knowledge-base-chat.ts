import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { retrieveKnowledge } from '@/ai/knowledge-base/retrieve';
import { knowledgeCitations } from '@/ai/knowledge-base/retriever';
import { KNOWLEDGE_AUDIENCES } from '@/ai/knowledge-base/types';

const inputSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.any()).max(12).optional(),
  currentPath: z.string().startsWith('/').max(200).optional(),
  accessLevel: z.enum(KNOWLEDGE_AUDIENCES).optional(),
});

const outputSchema = z.object({
  reply: z.string(),
  citations: z.array(z.object({
    id: z.string(),
    title: z.string(),
    module: z.string(),
    route: z.string().optional(),
  })),
  store: z.enum(['firestore', 'source-fallback']),
  candidateCount: z.number(),
});

function buildMessages(history: any[] | undefined, message: string) {
  const messages = (history ?? []).slice(-8).map((item) => {
    const role: 'model' | 'user' = item?.role === 'model' || item?.role === 'assistant' ? 'model' : 'user';
    const raw = typeof item?.content === 'string' ? item.content : item?.message ?? '';
    return { role, content: [{ text: String(raw).slice(0, 2000) }] };
  }).filter((item) => item.content[0].text.trim());
  while (messages.length > 0 && messages[0].role !== 'user') messages.shift();
  messages.push({ role: 'user', content: [{ text: message }] });
  return messages;
}

function isLiveAccountQuestion(message: string): boolean {
  const query = message.toLowerCase();
  if (/^(how|where|why|what does|what is|explain|tell me about)\b/.test(query)) return false;
  return /\b(show|list|find|get|what|when|who|how many|how much)\b/.test(query)
    && /\b(my|mine)\b/.test(query)
    && /\b(appointment|calendar|schedule|task|activity|contact|invoice|quote|hours|time|project)\b/.test(query);
}

export function sanitizeKnowledgeReply(text: string): string {
  // The UI adds citations from the actual retrieval result. Discard any source
  // appendix the model tries to add, raw HTML, and non-Ogeemo links.
  const answerOnly = text.split(/\n\s*(?:<details\b|<small\b|\(?Sources?(?:\s+ID\(s\))?\s*:|\(Source:)/i)[0];
  return answerOnly
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\((?!\/(?![\/\\]))[^)]+\)/g, '$1')
    .trim();
}

export const knowledgeBaseChatFlow = ai.defineFlow(
  {
    name: 'knowledgeBaseChatFlow',
    inputSchema,
    outputSchema,
  },
  async ({ message, history, currentPath, accessLevel }) => {
    if (isLiveAccountQuestion(message)) {
      return {
        reply: 'I can explain how Ogeemo works, but this read-only beta cannot inspect your account records. Open the relevant Ogeemo screen for current information—for example, [Calendar](/calendar) for appointments, [Activity Manager](/event-manager) for activities, or the [Time Log Report](/reports/time-log) for hours worked and billable time. I can explain how any of these work.',
        citations: [], store: 'source-fallback' as const, candidateCount: 0,
      };
    }

    const retrieval = await retrieveKnowledge({
      query: message,
      currentPath,
      accessLevel,
      limit: 4,
    });
    console.info('[Knowledge Base] Retrieval', {
      store: retrieval.store,
      candidates: retrieval.candidateCount,
      chunks: retrieval.chunks.map((chunk) => chunk.id),
    });

    if (retrieval.chunks.length === 0) {
      return {
        reply: 'I don’t have verified documentation for that yet. Try asking about the Activity Manager, Calendar, or sidebar navigation, or rephrase your question with the Ogeemo feature name. I won’t guess when the knowledge base does not cover an answer.',
        citations: [], store: retrieval.store, candidateCount: retrieval.candidateCount,
      };
    }

    const sources = retrieval.chunks.map((chunk) => [
      `<source id="${chunk.id}" title="${chunk.title}" module="${chunk.module}" routes="${chunk.routes.join(', ')}">`,
      chunk.content,
      '</source>',
    ].join('\n')).join('\n\n');

    const system = `You are Ask Ogeemo, the read-only assistant inside Ogeemo Knowledge Base.
Answer only from the supplied source documents. Explain the current Ogeemo behaviour accurately and concisely in clear Markdown.
For how-to questions, provide short numbered steps when useful. Link to an Ogeemo screen only when that exact route appears in the supplied sources.
Do not create, edit, delete, complete, or schedule records. Do not claim to have inspected private account data.
Do not invent routes, buttons, features, rules, or source citations. Do not mention internal code filenames.
Return only the answer itself. Never add a Sources section, source IDs, raw HTML, or a citation appendix; the application adds verified citations separately.
Use Markdown links only for relative Ogeemo routes supplied in the sources. Never create external links.
If the sources do not fully answer the question, state the limitation and answer only the supported part.
Current page: ${currentPath ?? '/knowledge-base'}.

Supplied sources:
${sources}`;

    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      messages: buildMessages(history, message),
      system,
      config: { temperature: 0.1, maxOutputTokens: 1000 },
    });

    return {
      reply: sanitizeKnowledgeReply(result.text) || 'I found relevant documentation but could not produce an answer. Please try again.',
      citations: knowledgeCitations(retrieval.chunks),
      store: retrieval.store,
      candidateCount: retrieval.candidateCount,
    };
  },
);

export async function knowledgeBaseChat(input: z.infer<typeof inputSchema>) {
  return knowledgeBaseChatFlow(input);
}
