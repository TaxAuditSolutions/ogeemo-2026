'use server';
/**
 * @fileOverview The Ogeemo AI Assistant Agent.
 * This agent can answer questions about Ogeemo and execute operational commands via tools.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { getCurrentUserId } from '@/app/actions';
import { getReceiptsFolderPdfs } from '@/services/google-service';
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

const syncReceiptsTool = ai.defineTool(
  {
    name: 'syncReceipts',
    description: 'Scans the Google Drive "Receipts" folder for new PDF invoices. Returns a list of files ready for extraction.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      success: z.boolean(),
      files: z.array(z.any()),
      message: z.string(),
    }),
  },
  async (input, { context }) => {
    const userId = context && typeof context === 'object' && 'userId' in context ? (context as any).userId : undefined;
    if (!userId) return { success: false, files: [], message: "User not authenticated." };

    try {
      const result = await getReceiptsFolderPdfs();
      if (result.error) throw new Error(result.error);

      return {
        success: true,
        files: result.files,
        message: `Found ${result.files.length} PDF(s) in the Receipts folder. Navigation to the Extraction Hub is recommended.`,
      };
    } catch (error: any) {
      return { success: false, files: [], message: error.message };
    }
  }
);

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
1. **Answer Questions**: Explain BKS, the Command Centre, or Action Chips using the knowledge base.
2. **Execute Commands**: Use tools to manage contacts, tasks, or sync receipts.
3. **Receipt Orchestration**: If the user asks to "sync receipts" or "check for invoices", use the syncReceipts tool.

**Rules:**
- If you don't know the answer from the knowledge base, say so and add: "The Ogeemo Assistant is still under development and will be gaining even more power as we continue to enhance the Ogeemo app."
- Always respond in clear Markdown.

**Knowledge Base:**
{{{knowledgeBase}}}
`;

const ogeemoAgentFlow = ai.defineFlow(
  {
    name: 'ogeemoAgentFlow',
    inputSchema: OgeemoAgentInputSchema.extend({ userId: z.string() }),
    outputSchema: z.object({ reply: z.string() }),
  },
  async (input) => {
    const { userId, message, history } = input;
    const messages: any[] = history?.map(msg => ({
        role: msg.role,
        content: msg.content
    })) || [];

    messages.push({ role: 'user', content: [{ text: message }] });

    const knowledgeBase = getKnowledgeBase();
    const finalSystemPrompt = systemPromptTemplate.replace('{{{knowledgeBase}}}', knowledgeBase);

    try {
        const result = await ai.generate({
          model: 'googleai/gemini-1.5-flash',
          messages: messages,
          tools: [searchContactsTool, createTaskTool, syncReceiptsTool],
          context: { userId },
          system: finalSystemPrompt,
          config: { temperature: 0.1 },
        });

        return { reply: result.text || "I processed your request." };
    } catch (error: any) {
        console.error("[ogeemoAgentFlow] Error:", error);
        throw error;
    }
  }
);

export async function ogeemoAgent(input: OgeemoAgentInput): Promise<{ reply: string }> {
    let userId = await getCurrentUserId();
    if (!userId && input.clientUserId) userId = input.clientUserId;
    if (!userId) throw new Error("Unauthorized: Please log in.");
    return ogeemoAgentFlow({ ...input, userId });
}
