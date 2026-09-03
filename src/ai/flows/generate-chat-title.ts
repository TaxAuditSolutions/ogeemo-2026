'use server';
/**
 * @fileOverview Generates a concise, relevant subject line for a Co-Pilot chat thread
 * based on the opening exchange of the conversation.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const STABLE_GEMINI_MODEL = 'googleai/gemini-2.5-flash';
const MAX_TITLE_LENGTH = 48;

const GenerateChatTitleInputSchema = z.object({
    userMessage: z.string().min(1),
    assistantReply: z.string().optional(),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

const GenerateChatTitleOutputSchema = z.object({
    title: z.string(),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

function clipToWordBoundary(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }

    const clipped = text.slice(0, maxLength);
    const lastSpace = clipped.lastIndexOf(' ');
    return (lastSpace > 20 ? clipped.slice(0, lastSpace) : clipped).trim();
}

function sanitizeTitle(rawTitle: string, fallbackMessage: string): string {
    let title = clipToWordBoundary(
        (rawTitle || '').replace(/^["'`*\s]+|["'`*\s]+$/g, '').replace(/\s+/g, ' ').trim(),
        MAX_TITLE_LENGTH
    );

    if (!title) {
        title = clipToWordBoundary((fallbackMessage || '').replace(/\s+/g, ' ').trim(), MAX_TITLE_LENGTH);
    }

    return title || 'New Chat';
}

const generateChatTitleFlow = ai.defineFlow(
    {
        name: 'generateChatTitleFlow',
        inputSchema: GenerateChatTitleInputSchema,
        outputSchema: GenerateChatTitleOutputSchema,
    },
    async (input) => {
        const { userMessage, assistantReply } = input;

        try {
            const result = await ai.generate({
                model: STABLE_GEMINI_MODEL,
                system: 'You write concise chat subject lines for the Ogeemo Co-Pilot assistant. Respond with the subject line text only - no quotes, no trailing punctuation, no explanations.',
                prompt: [
                    'Create a short, relevant subject line (2 to 6 words, at most 48 characters) that captures the main topic or intent of this chat.',
                    '',
                    `User message: ${userMessage.slice(0, 2000)}`,
                    assistantReply ? `Assistant reply: ${assistantReply.slice(0, 2000)}` : null,
                    '',
                    'If the message names a person, company, module, or document, include that name. If it is a navigation command, name the destination.',
                ].filter((line): line is string => line !== null).join('\n'),
                config: { temperature: 0.2 },
            });

            return { title: sanitizeTitle(result.text, userMessage) };
        } catch (error: any) {
            console.error('[generateChatTitleFlow] Title generation failed:', error?.message || error);
            return { title: sanitizeTitle('', userMessage) };
        }
    }
);

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
    return generateChatTitleFlow(input);
}
