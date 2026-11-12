'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getCurrentUserId } from '@/app/actions';
import { checkPrompt } from '@/lib/ai-input';
import { sandboxLimiter, tooManyRequests } from '@/lib/ai-limits';
import fs from 'fs';
import path from 'path';

// This file is a server action the browser can call directly, so it checks the signed-in SESSION itself.
// It used to run for anyone (the sign-in check was commented out) and accept a user id from the caller, and it
// asked for "gemini-1.5-flash", which the API no longer lists.
const SANDBOX_MODEL = 'googleai/gemini-3.8-flash';

const AskAgentInputSchema = z.object({
  prompt: z.string().describe('The user question about Ogeemo.'),
});
type AskAgentInput = z.infer<typeof AskAgentInputSchema>;

const AskAgentOutputSchema = z.object({
  answer: z.string().optional().describe('The response from the agent.'),
  error: z.string().optional().describe('An error message if generation fails.'),
});
type AskAgentOutput = z.infer<typeof AskAgentOutputSchema>;

export async function askSandboxAgent(input: AskAgentInput): Promise<AskAgentOutput> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'Please sign in to use the sandbox agent.' };

  const limit = sandboxLimiter.check(userId);
  if (!limit.ok) return { error: tooManyRequests(limit.retryAfterSeconds) };

  const prompt = checkPrompt(input?.prompt, 2000);
  if (!prompt.ok) return { error: prompt.error };
  return askSandboxAgentFlow({ prompt: prompt.text });
}

const askSandboxAgentFlow = ai.defineFlow(
  {
    name: 'askSandboxAgentFlow',
    inputSchema: AskAgentInputSchema,
    outputSchema: AskAgentOutputSchema,
  },
  async (input) => {
    try {
      // Read the knowledge base file
      const kbPath = path.join(process.cwd(), 'docs', 'ogeemo-knowledge-base.md');
      let knowledgeBaseContext = '';
      if (fs.existsSync(kbPath)) {
        knowledgeBaseContext = fs.readFileSync(kbPath, 'utf-8');
      }

      const systemPrompt = `You are the Ogeemo AI Sandbox Agent. Your purpose is to answer questions about the Ogeemo platform's features and capabilities based on the following Knowledge Base.

--- KNOWLEDGE BASE ---
${knowledgeBaseContext}
--- END KNOWLEDGE BASE ---

Be concise, helpful, and friendly. If a user asks a question that is not covered in the knowledge base, do your best to infer or politely state that you only have information about the core features.`;

      const response = await ai.generate({
        model: SANDBOX_MODEL,
        prompt: input.prompt,
        system: systemPrompt,
      });

      return { answer: response.text };
    } catch (e: any) {
      console.error('AI Generation Error:', e?.message ?? e);
      return { error: 'The sandbox agent could not answer right now. Please try again.' };
    }
  }
);
