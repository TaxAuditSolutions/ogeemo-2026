import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Diagnostic: Ensure API key is available during initialization
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("[AI Diagnostic] FATAL: GEMINI_API_KEY is not defined in the environment. Please restart your dev server with npm run dev.");
} else {
    console.log(`[AI Diagnostic] Genkit initialized with Key prefix: ${apiKey.substring(0, 4)}...`);
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey }),
  ],
});
