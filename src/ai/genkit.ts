import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// The key is read from the server environment only. A NEXT_PUBLIC_ variable is copied into the browser
// bundle, so a key set there would be public: it is deliberately not used as a fallback.
// Quotes that were accidentally typed into the .env file are removed.
const apiKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, '');

if (!apiKey) {
    console.warn("[AI] GEMINI_API_KEY is not defined in the environment. AI plugins are disabled.");
} else {
    // Never print any part of the key: server logs are read by more people than the key should be.
    console.log("[AI] Genkit initialized with a Gemini API key.");
}

export const ai = genkit({
  plugins: [
    ...(apiKey ? [googleAI({ apiKey })] : []),
  ],
});
