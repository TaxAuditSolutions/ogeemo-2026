'use server';
/**
 * @fileOverview An AI flow to generate Mermaid flowchart syntax from plain text.
 *
 * - generateFlowchart - A function that handles the flowchart generation process.
 * - GenerateFlowchartInput - The input type for the generateFlowchart function.
 * - GenerateFlowchartOutput - The return type for the generateFlowchart function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateFlowchartInputSchema = z.object({
  description: z.string().describe('A plain-text description of a process or workflow.'),
});
export type GenerateFlowchartInput = z.infer<typeof GenerateFlowchartInputSchema>;

const GenerateFlowchartOutputSchema = z.object({
  mermaidCode: z.string().describe('The generated flowchart code in valid Mermaid syntax (using flowchart TD).'),
});
export type GenerateFlowchartOutput = z.infer<typeof GenerateFlowchartOutputSchema>;

export async function generateFlowchart(input: GenerateFlowchartInput): Promise<GenerateFlowchartOutput> {
  return generateFlowchartFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateFlowchartPrompt',
    input: { schema: GenerateFlowchartInputSchema },
    output: { schema: GenerateFlowchartOutputSchema },
    prompt: `You are an expert in creating diagrams using Mermaid syntax. Your task is to convert a user's plain-text description of a process into a valid Mermaid flowchart.

    **Instructions:**
    1.  Analyze the user's description to identify steps, decisions (if/else conditions), and connections.
    2.  Generate a flowchart diagram using Mermaid's "flowchart TD" (Top Down) syntax.
    3.  Use clear and concise labels for each node (A, B, C, etc.).
    4.  Represent decisions using the rhombus shape syntax: \`id{Decision Text}\`.
    5.  Use arrows with labels for conditional paths, like \`-->|Yes|\` and \`-->|No|\`.
    6.  Ensure the final output is ONLY the Mermaid code block. Do not include any explanations, apologies, or markdown formatting like \`\`\`mermaid.

    **User's Description:**
    {{{description}}}
    `,
});

const generateFlowchartFlow = ai.defineFlow(
  {
    name: 'generateFlowchartFlow',
    inputSchema: GenerateFlowchartInputSchema,
    outputSchema: GenerateFlowchartOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI failed to generate a flowchart. Please try rephrasing your description.");
    }
    return output;
  }
);
