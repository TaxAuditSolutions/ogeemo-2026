import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Diagnostic: Ensure API key is available during initialization
// We check for both GEMINI_API_KEY and NEXT_PUBLIC_GEMINI_API_KEY as a fallback.
const rawKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Clean the key: remove any literal quotes that might have been accidentally included in the .env file
const apiKey = rawKey?.replace(/^["']|["']$/g, '');

if (!apiKey) {
    console.error("[AI Diagnostic] FATAL: GEMINI_API_KEY is not defined in the environment. Please check your .env files or Firebase Secrets.");
} else {
    console.log(`[AI Diagnostic] Genkit initialized with Key prefix: ${apiKey.substring(0, 4)}...`);
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey }),
  ],
});
