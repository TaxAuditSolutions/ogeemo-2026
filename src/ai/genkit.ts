
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { genkit } from 'genkit';

// By initializing the googleAI() plugin here, the `ai` object
// becomes aware of all the available Google AI models.
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY }), firebase()],
});

// This is the single, server-side entry point for Genkit.
// By initializing here, we ensure that the Genkit plugins are only
// loaded in a pure server environment, which resolves the build errors.
configureGenkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY }), firebase()],
  logSinks: ['firebase'],
  enableTracingAndMetrics: true,
});

// This file should now only be for configuration.
// Flows are imported directly by their respective API route handlers.
