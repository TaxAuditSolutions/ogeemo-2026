
'use server';

import { ai } from '@/ai/genkit';
import { z } from "zod";

const summarizeDatabaseFlowInputSchema = z.object({
  databaseDescription: z.string(),
  collectionsDescription: z.string(),
});

export const summarizeDatabaseFlow = ai.defineFlow(
  {
    name: "summarizeDatabaseFlow",
    inputSchema: summarizeDatabaseFlowInputSchema,
    outputSchema: z.object({
      summary: z.string(),
    }),
  },
  async ({ databaseDescription, collectionsDescription }) => {
    const result = await ai.generate({
      prompt: `
        You are a database analyst.
        Based on the following descriptions, generate a high-level executive summary of the database.
        Database Description: ${databaseDescription}
        Collections Description: ${collectionsDescription}
      `,
      config: {
        temperature: 0.5,
      },
    });
    return {
      summary: result.text,
    };
  }
);
