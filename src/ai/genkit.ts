
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
    firebase({
      firestore: {
        logStore: true,
        traceStore: true,
        flowStateStore: true,
      },
    }),
  ],
  enableTracingAndMetrics: true,
});
