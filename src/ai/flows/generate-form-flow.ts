
'use server';

import { ai } from '@/ai/genkit';
import { z } from "zod";

const generateFormFlowInputSchema = z.object({
  topic: z.string(),
});

export const generateFormFlow = ai.defineFlow(
  {
    name: "generateFormFlow",
    inputSchema: generateFormFlowInputSchema,
    outputSchema: z.any(),
  },
  async ({ topic }) => {
    const { output } = await ai.generate({
      prompt: `
        You are a form generator.
        Based on the user's topic, generate a JSON object representing a form.
        The JSON object should have two properties: "name" (a string for the form's title) and "fields" (an array of objects).
        Each field object should have "name", "label", "type" (e.g., "text", "textarea", "select"), and optionally "options" (an array of strings for select fields).
        The user's topic is: "${topic}"
      `,
      config: {
        temperature: 0.5,
      },
      output: {
        format: 'json',
      }
    });
    return output!;
  }
);
