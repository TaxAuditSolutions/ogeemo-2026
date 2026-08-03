'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getCurrentUserId } from '@/app/actions';
import fs from 'fs';
import path from 'path';

const AskAgentInputSchema = z.object({
  prompt: z.string().describe('The user question about Ogeemo.'),
  clientUserId: z.string().optional().describe('Fallback user ID from the client.'),
});
type AskAgentInput = z.infer<typeof AskAgentInputSchema>;

const AskAgentOutputSchema = z.object({
  answer: z.string().optional().describe('The response from the agent.'),
  error: z.string().optional().describe('An error message if generation fails.'),
});
type AskAgentOutput = z.infer<typeof AskAgentOutputSchema>;

export async function askSandboxAgent(input: AskAgentInput): Promise<AskAgentOutput> {
  let userId = await getCurrentUserId();
  
  if (!userId && input.clientUserId) {
      userId = input.clientUserId;
  }

  // Allow sandbox testing even without login for now, or enforce it
  // if (!userId) {
  //   throw new Error('Unauthorized: You must be logged in.');
  // }
  
  return askSandboxAgentFlow(input);
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
        model: 'googleai/gemini-1.5-flash',
        prompt: input.prompt,
        system: systemPrompt,
      });

      return { answer: response.text };
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      return { error: e.message || "An unexpected error occurred during generation." };
    }
  }
);
