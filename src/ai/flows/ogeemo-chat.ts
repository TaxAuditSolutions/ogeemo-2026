'use server';
/**
 * @fileOverview The Ogeemo AI Assistant Agent.
 * This agent can answer questions about Ogeemo and execute operational commands via tools.
 * 
 * - ogeemoAgent - Main function for AI interaction.
 * - Tools included: createTask, searchContacts, addContact.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { getCurrentUserId } from '@/app/actions';
import fs from 'fs';
import path from 'path';

// --- Schemas ---

const clientMessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() })),
});

const OgeemoAgentInputSchema = z.object({
  message: z.string(),
  history: z.array(clientMessageSchema).optional(),
  clientUserId: z.string().optional().describe('Fallback user ID from the client-side auth state.'),
});
export type OgeemoAgentInput = z.infer<typeof OgeemoAgentInputSchema>;

// --- Tools ---

const searchContactsTool = ai.defineTool(
  {
    name: 'searchContacts',
    description: 'Searches the user\'s contact directory. Use this to find contact details like phone numbers, emails, or IDs before scheduling a task.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The name or company to search for'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      contacts: z.array(z.any()),
      message: z.string(),
    }),
  },
  async (input, { context }) => {
    // Check if context exists and has userId property
    const userId = context && typeof context === 'object' && 'userId' in context ? (context as any).userId : undefined;
    
    if (!userId) return { success: false, contacts: [], message: "User not authenticated." };

    try {
      const db = getAdminDb();
      const term = input.searchTerm.toLowerCase();
      
      const snapshot = await db.collection('contacts')
        .where('userId', '==', userId)
        .get();
      
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => 
            c.name?.toLowerCase().includes(term) || 
            c.businessName?.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term)
        );

      return {
        success: true,
        contacts: results,
        message: `Found ${results.length} matching contacts.`,
      };
    } catch (error: any) {
      console.error("[searchContactsTool] Error:", error);
      return { success: false, contacts: [], message: error.message };
    }
  }
);

const createTaskTool = ai.defineTool(
  {
    name: 'createTask',
    description: 'Creates a new task or calendar event in the Command Centre. Can handle specific dates/times or general to-do items.',
    inputSchema: z.object({
      title: z.string().describe('The title of the task or event'),
      description: z.string().optional().describe('Details about the task'),
      startTime: z.string().optional().describe('ISO string for start time if it is a scheduled event'),
      endTime: z.string().optional().describe('ISO string for end time if it is a scheduled event'),
      contactId: z.string().optional().describe('The ID of the contact to link to'),
      projectId: z.string().optional().describe('The ID of the project to link to'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      taskId: z.string().optional(),
      message: z.string(),
    }),
  },
  async (input, { context }) => {
    // Check if context exists and has userId property
    const userId = context && typeof context === 'object' && 'userId' in context ? (context as any).userId : undefined;
    
    if (!userId) return { success: false, message: "User not authenticated." };

    try {
      const db = getAdminDb();
      const taskData = {
        ...input,
        userId,
        status: 'todo',
        position: 0,
        isScheduled: !!input.startTime,
        start: input.startTime ? new Date(input.startTime) : null,
        end: input.endTime ? new Date(input.endTime) : null,
        createdAt: new Date(),
      };

      const docRef = await db.collection('tasks').add(taskData);
      return {
        success: true,
        taskId: docRef.id,
        message: `Successfully created task: "${input.title}"`,
      };
    } catch (error: any) {
      console.error("[createTaskTool] Error:", error);
      return { success: false, message: error.message };
    }
  }
);

const addContactTool = ai.defineTool(
  {
    name: 'addContact',
    description: 'Adds a new contact to the directory. Requires at least a name.',
    inputSchema: z.object({
      name: z.string().describe('Full name of the contact'),
      email: z.string().email().optional(),
      businessName: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      contactId: z.string().optional(),
      message: z.string(),
    }),
  },
  async (input, { context }) => {
    // Check if context exists and has userId property
    const userId = context && typeof context === 'object' && 'userId' in context ? (context as any).userId : undefined;
    
    if (!userId) return { success: false, message: "User not authenticated." };

    try {
      const db = getAdminDb();
      const contactData = {
        ...input,
        userId,
        createdAt: new Date(),
        folderId: '', // Default to root
      };

      const docRef = await db.collection('contacts').add(contactData);
      return {
        success: true,
        contactId: docRef.id,
        message: `Successfully added contact: "${input.name}"`,
      };
    } catch (error: any) {
      console.error("[addContactTool] Error:", error);
      return { success: false, message: error.message };
    }
  }
);

// --- Agent Logic ---

function getKnowledgeBase(): string {
  try {
    const summaryPath = path.join(process.cwd(), 'OGEEMO_SUMMARY.md');
    if (fs.existsSync(summaryPath)) {
        const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
        return `<knowledge_base><document name="OGEEMO_SUMMARY.md">${summaryContent}</document></knowledge_base>`;
    }
    return "<knowledge_base>Information about Ogeemo features is currently unavailable.</knowledge_base>";
  } catch (error) {
    return "<knowledge_base>Error: Could not load application documentation.</knowledge_base>";
  }
}

const systemPromptTemplate = `
You are Ogeemo, the flagship AI assistant for the Ogeemo platform. Your goal is to act as a proactive "Master Mind" for the user's business operations.

**Capabilities:**
1. **Answer Questions**: Use the provided knowledge base to explain features like BKS, the Command Centre, or Action Chips.
2. **Execute Commands**: Use your tools to perform actions. When a user says "Schedule a meeting" or "Create a task", always try to find the relevant contact first if they mention a person.
3. **Professional Persona**: Helpful, decisive, and efficient.

**Rules:**
- If you don't know the answer from the knowledge base, say so and add: "The Ogeemo Assistant is still under development and will be gaining even more power as we continue to enhance the Ogeemo app."
- Always respond in clear Markdown.
- When creating tasks, if no time is specified, treat it as an unscheduled to-do.

**Knowledge Base:**
{{{knowledgeBase}}}
`;

// Define the flow first so we can reference it
const ogeemoAgentFlow = ai.defineFlow(
  {
    name: 'ogeemoAgentFlow',
    inputSchema: OgeemoAgentInputSchema.extend({ userId: z.string() }),
    outputSchema: z.object({ reply: z.string() }),
  },
  async (input) => {
    const { userId, message, history } = input;

    // Fix: Correctly map history to match Genkit's expected message format
    // The previous mapping was causing issues because 'content' needs to be in a specific format
    const messages: any[] = history?.map(msg => ({
        role: msg.role,
        content: msg.content // Pass content directly if it's already in correct format, or adjust if needed
    })) || [];

    // Add current message
    messages.push({ role: 'user', content: [{ text: message }] });

    const knowledgeBase = getKnowledgeBase();
    const finalSystemPrompt = systemPromptTemplate.replace('{{{knowledgeBase}}}', knowledgeBase);

    try {
        const result = await ai.generate({
          model: 'googleai/gemini-1.5-flash',
          messages: messages, // Now passing correctly formatted messages
          tools: [searchContactsTool, createTaskTool, addContactTool],
          context: { userId }, // Context is passed here
          system: finalSystemPrompt,
          config: { temperature: 0.1 },
        });

        return { reply: result.text || "I processed your request but have no text response." };
    } catch (error: any) {
        console.error("[ogeemoAgentFlow] Critical Error:", error);
        throw error;
    }
  }
);

export async function ogeemoAgent(input: OgeemoAgentInput): Promise<{ reply: string }> {
    let userId = await getCurrentUserId();
    
    // Fallback for cases where session cookie is not yet synced
    if (!userId && input.clientUserId) {
        userId = input.clientUserId;
    }

    if (!userId) {
        throw new Error("Unauthorized: Please ensure you are logged in to use Ogeemo AI.");
    }
    
    // Call the defined flow
    return ogeemoAgentFlow({ ...input, userId });
}
