
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// The firebase plugin has been removed to resolve a persistent dependency error.
// Core AI functionality is not affected.

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
  enableTracingAndMetrics: true,
});
