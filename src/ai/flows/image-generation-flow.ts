'use server';
/**
 * @fileOverview An image generation AI flow using Google's Gemini image model.
 *
 * - generateImage - A function that creates an image from a text prompt.
 *
 * This file is a server action the browser can call directly, so it checks the signed-in SESSION itself: it no
 * longer accepts a user id from the caller (any script could have claimed one), and every image is rate limited
 * because each is billed. The model was "imagen-3", which the API no longer lists for this key, so every request
 * failed; Gemini image models return the picture as inline media.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getCurrentUserId } from '@/app/actions';
import { checkPrompt } from '@/lib/ai-input';
import { imageLimiter, tooManyRequests } from '@/lib/ai-limits';

const IMAGE_MODEL = 'googleai/gemini-2.5-flash-image';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().optional().describe('The generated image as a data URI.'),
  error: z.string().optional().describe('An error message if generation fails.'),
});
type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

/** Generates an image based on a text prompt for the signed-in user. */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'Please sign in to generate images.' };

  const limit = imageLimiter.check(userId);
  if (!limit.ok) return { error: tooManyRequests(limit.retryAfterSeconds) };

  const prompt = checkPrompt(input?.prompt, 1000);
  if (!prompt.ok) return { error: prompt.error };
  return generateImageFlow({ prompt: prompt.text });
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    try {
      const { media } = await ai.generate({
        model: IMAGE_MODEL,
        prompt: input.prompt,
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });

      const imageUrl = media?.url;
      if (!imageUrl) {
        return { error: 'The image service did not return a picture. Try describing the image differently.' };
      }

      return { imageUrl };
    } catch (e: any) {
      // The technical detail stays in the server log; the screen gets a plain message.
      console.error('[Image Generation] failed:', e?.message ?? e);
      const busy = /429|resource exhausted|quota/i.test(String(e?.message ?? ''));
      return { error: busy ? 'The image service is busy right now. Please try again in a minute.' : 'The image could not be generated. Please try again.' };
    }
  }
);
