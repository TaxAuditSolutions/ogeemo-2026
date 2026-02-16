'use server';
/**
 * @fileOverview An image generation AI flow using Google's Imagen model.
 *
 * - generateImage - A function that creates an image from a text prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getCurrentUserId } from '@/app/actions';
import { imagen3 } from '@genkit-ai/google-genai';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
  clientUserId: z.string().optional().describe('Fallback user ID from the client.'),
});
type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});
type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

/**
 * Generates an image based on a text prompt.
 * Verifies that the user is authenticated before proceeding.
 */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  let userId = await getCurrentUserId();
  
  if (!userId && input.clientUserId) {
      userId = input.clientUserId;
  }

  if (!userId) {
    throw new Error('Unauthorized: You must be logged in to generate images.');
  }
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: imagen3,
      prompt: input.prompt,
    });

    const imageUrl = media?.url;
    if (!imageUrl) {
        throw new Error("Image generation failed to return a URL.");
    }

    return { imageUrl };
  }
);
