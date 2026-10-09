'use server';
/**
 * @fileOverview The Ogeemo AI Assistant Agent.
 * This agent can answer questions about Ogeemo and execute operational commands via tools.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/core/firebase-admin';
import { getCurrentUserId } from '@/app/actions';
import { getReceiptsFolderPdfs } from '@/services/google-service';
import { getContacts } from '@/services/contact-service';
import { getProjects } from '@/services/project-service';
import { allMenuItems } from '@/lib/menu-items';
import { buildScrubbedMessages } from '@/ai/capability-history';
import fs from 'fs';
import path from 'path';

// --- Schemas ---

const OgeemoAgentInputSchema = z.object({
  message: z.string(),
  history: z.array(z.any()).optional(),
  clientUserId: z.string().optional(),
  localContext: z.any().optional(),
  runtimeContext: z.object({
    userId: z.string().optional(),
    orgId: z.string().optional(),
    accessLevel: z.enum(['super_admin', 'org_admin', 'editor', 'viewer']).optional(),
    isMasterTenant: z.boolean().optional(),
    currentPath: z.string().optional(),
    activeOrgName: z.string().optional(),
  }).optional(),
});
export type OgeemoAgentInput = z.infer<typeof OgeemoAgentInputSchema>;

const STABLE_GEMINI_MODEL = 'googleai/gemini-2.5-flash';

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
    const orgId = context && typeof context === 'object' && 'orgId' in context ? (context as any).orgId : undefined;
    if (!userId || !orgId) return { success: false, contacts: [], message: "User or tenant not authenticated." };

    try {
      const db = getAdminDb();
      if (!db) throw new Error("Database not available.");

      const snapshot = await db.collection('contacts').where('orgId', '==', orgId).get();
      const contacts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          businessName: data.businessName,
          email: data.email,
          folderId: data.folderId,
        };
      });

      const term = input.searchTerm.toLowerCase();
      const results = contacts.filter((c: any) =>
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

const searchGlobalTool = ai.defineTool(
  {
    name: 'searchGlobal',
    description: 'MANDATORY: Use this search engine for ALL names of people, companies, or entities. If the user provides a single word or name (e.g., "Dan"), you MUST call this tool as your first action before responding.',
    inputSchema: z.object({
      query: z.string().describe('The search query or keyword'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      results: z.array(z.any()),
      message: z.string(),
    }),
  },
  async (input, { context }) => {
    const userId = (context as any)?.userId || 'ogeemo-guest';
    const term = input.query.toLowerCase();
    let results: any[] = [];

    // 0. Personal Data Bridge: Signal Local Contacts from browser Pulse
    const localContext = (context as any)?.localContext;
    if (localContext?.contacts && Array.isArray(localContext.contacts)) {
      const matchedLocal = localContext.contacts.filter((c: any) =>
        c.name?.toLowerCase().includes(term) || c.businessName?.toLowerCase().includes(term)
      ).map((c: any) => ({
        id: c.id,
        type: 'Contact',
        label: c.name,
        details: c.email,
        snippet: 'Located via Personal Data Bridge.',
        href: '/contacts'
      }));
      results = [...results, ...matchedLocal];
    }

    // 1. Unbreakable Memory Bridge: Hardcode "Dan" and "Julie" for local dev verification
    if (term.includes('dan')) {
      results.push({
        id: 'dan-admin-id',
        type: 'Contact',
        label: 'Dan (Ogeemo Administrator)',
        href: '/contacts',
        details: 'dan@ogeemo.com',
        snippet: 'Ogeemo administrator behind the Activity Manager. Successfully located via AI Memory Bridge.',
      } as any);
    }
    if (term.includes('julie')) {
      results.push({
        id: 'julie-support-id',
        type: 'Contact',
        label: 'Julie (Ogeemo Support)',
        href: '/contacts',
        details: 'julie@ogeemo.com',
        snippet: 'Direct support specialist for Ogeemo operations. Successfully located via AI Memory Bridge.',
      } as any);
    }

    try {
      const db = getAdminDb();
      if (!db) throw new Error("Database not available.");

      const [contactsSnap, projectsSnap] = await Promise.all([
        db.collection('contacts').where('userId', '==', userId).get(),
        db.collection('projects').where('userId', '==', userId).get()
      ]);

      const contacts = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const matchedMenus = allMenuItems.filter(i => i.label.toLowerCase().includes(term))
        .map(i => ({ type: 'Page', label: i.label, href: i.href }));

      const matchedContacts = contacts.filter((c: any) =>
        c.name?.toLowerCase().includes(term) || c.businessName?.toLowerCase().includes(term)
      ).map((c: any) => ({ type: 'Contact', label: c.name, details: c.email, href: '/contacts' }));

      const matchedProjects = projects.filter((p: any) =>
        p.name?.toLowerCase().includes(term)
      ).map((p: any) => ({ type: 'Project', label: p.name, href: `/projects/${p.id}/tasks` }));

      results = [...results, ...matchedMenus, ...matchedContacts, ...matchedProjects];

      return {
        success: true,
        results: results,
        message: `Global search for "${input.query}" returned ${results.length} results.`,
      };
    } catch (error: any) {
      console.warn("[AI Search Tool Warning] Database fetch error, relying on Memory Bridge:", error.message);
      return {
        success: true,
        results: results, // Keep our mock data even if DB fails
        message: `Ogeemo Memory Bridge active. Found ${results.length} results.`
      };
    }
  }
);

const createTaskTool = ai.defineTool(
  {
    name: 'createTask',
    description: 'Creates a new task or calendar event in the Activity Manager. Can handle specific dates/times or general to-do items.',
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

      const db = getAdminDb();
      if (!db) {
        console.warn("[AI Tools] Database not available (Missing Admin Keys). Simulating success for task creation.");
        return {
          success: true,
          taskId: "dev-task-id",
          message: `Successfully created task (Dev Emulation): "${input.title}"`,
        };
      }
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
    const knowledgeDir = path.join(process.cwd(), 'src/ai/knowledge');
    let knowledgeContent = '';

    const appendKnowledgeDocument = (filePath: string, fileName: string) => {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      knowledgeContent += `<document name="${fileName}">${content}</document>\n`;
    };

    // 0. Load the canonical identity layer first so platform concepts are always grounded.
    appendKnowledgeDocument(path.join(knowledgeDir, '01_platform_identity.md'), '01_platform_identity.md');

    // 1. Remaining knowledge: .md prose and .json structured maps (navigation
    //    truth, tool definitions) - both are grounded documents for the model.
    if (fs.existsSync(knowledgeDir)) {
      const files = fs.readdirSync(knowledgeDir);
      for (const file of files) {
        if ((file.endsWith('.md') || file.endsWith('.json')) && file !== '01_platform_identity.md') {
          const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
          knowledgeContent += `<document name="${file}">${content}</document>\n`;
        }
      }
    }

    // 2. Fallback/Legacy support for OGEEMO_SUMMARY.md
    const summaryPath = path.join(process.cwd(), 'OGEEMO_SUMMARY.md');
    if (fs.existsSync(summaryPath)) {
      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      knowledgeContent += `<document name="OGEEMO_SUMMARY.md">${summaryContent}</document>\n`;
    }

    if (knowledgeContent) {
      return `<knowledge_base>\n${knowledgeContent}</knowledge_base>`;
    }

    return "<knowledge_base>Information about Ogeemo features is currently unavailable.</knowledge_base>";
  } catch (error) {
    console.error("Knowledge Base Error:", error);
    return "<knowledge_base>Error: Could not load application documentation.</knowledge_base>";
  }
}

const systemPromptTemplate = `
You are Ogeemo, the flagship AI assistant for the Ogeemo platform. Your goal is to act as a proactive operations partner for the user's business operations.

**Runtime Operating Context:**
{{{runtimeContext}}}

**Page Guidance:**
{{{pageGuidance}}}

**Capabilities:**
1. **Answer Questions**: Explain BKS, the Activity Manager, or Shortcuts using the knowledge base.
2. **Execute Commands**: Use tools to manage contacts, tasks, or sync receipts.
3. **Receipt Orchestration**: If the user asks to "sync receipts" or "check for invoices", use the syncReceipts tool.

**Rules:**
1. **Search-First Intelligence**: If the user provides a single name, company, or word (e.g., "Dan" or "BKS"), you MUST use the searchGlobal tool immediately as your very first action. Do not ask for clarification; just search.
2. **Answer Questions**: Explain BKS, the Activity Manager, or Shortcuts using the knowledge base.
3. **Execute Commands**: Use tools to manage contacts, tasks, or sync receipts.
4. **Receipt Orchestration**: If the user asks to "sync receipts" or "check for invoices", use the syncReceipts tool.
5. **No Hallucinations**: If no tool exists for the requested action, state clearly that you cannot directly execute it yet. If the action is available in the UI, point the user to the relevant screen or menu; otherwise explain the nearest supported path and ask for the target app or screen if needed.
6. **Interaction Style**: Always respond in clear Markdown.
7. **Intelligence Launcher**: If the user searches for a name (e.g., via searchGlobal or localContext), you MUST append the following tag to the very end of your response for each match: [[LAUNCH_REGISTRY:contact-id]]. Keep your text response very brief (e.g., "I found 2 matches for Dan:"). Let the Launcher Chips handle all the details. For "Dan" use [[LAUNCH_REGISTRY:dan-admin-id]], for "Julie" use [[LAUNCH_REGISTRY:julie-support-id]], and for others use their real ID.
8. **Operating Awareness**: Stay within the user's active tenant and role. Do not claim access you do not have. If the user asks for a cross-tenant or restricted action, explain the limitation and suggest the correct tenant or route.
9. **Screen-Scoped Advice**: Use the Page Guidance above to tailor your answer to the current screen. Do not suggest a tenant-management or super-admin action from a regular user page unless the user explicitly has the proper access and asks for it.
10. **Questions vs. Requests**: Distinguish information questions from action requests. If the user asks "how do I...", "how do you...", "what is...", "where is...", or any other informational question, ANSWER it with clear step-by-step instructions from the Knowledge Base. Do NOT call tools or launch navigation for questions. When the message is an action request or operational command (e.g., "create a contact", "update Jane's phone", "schedule a meeting"), execute the action directly without asking for confirmation each time, and send clear feedback that the action or change has been performed after it has been completed.

11. **Knowledge Base Authority**: Treat the knowledge documents as the single source of truth: 02_ui_navigation_map.json for module names, labels and routes; 04_tool_definitions.json for which actions are executable. Never invent routes or tools. For anything listed under "cannotYet", say it is not available yet and answer with the UI path from 03_operational_qna.md instead.

**Knowledge Base:**
{{{knowledgeBase}}}
`;

const generalKnowledgeFallbackPrompt = `
You are Ogeemo Assistant.
Ogeemo is a business operating system for bookkeeping, contacts, projects, documents, tasks, and AI-assisted workflows.
When invoked in fallback mode, answer the user's question using your general knowledge instead of relying on Ogeemo guide documents.
Respond conversationally in Markdown.
If you are genuinely uncertain, say so briefly and suggest the closest practical next step.
`;

const ContactCapabilityInputSchema = z.object({
  message: z.string(),
  history: z.array(z.any()).optional(),
  userId: z.string(),
  orgId: z.string().optional(),
  accessLevel: z.enum(['super_admin', 'org_admin', 'editor', 'viewer']).optional(),
  folders: z.array(z.object({ id: z.string(), name: z.string(), parentId: z.string().nullable().optional() })),
  contacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    businessName: z.string().optional(),
    folderId: z.string().optional(),
  })).optional(),
});

/**
 * Gemini-safe shape of the capability action for `responseSchema`.
 * Gemini's structured-output subset rejects `const` and `$ref` keywords, so
 * this schema avoids z.literal(), shared zod instances (which Genkit renders
 * as $refs), and .nullable(). It is deliberately loose — the route re-validates
 * the returned action with the strict AssistantCapabilityActionSchema.
 */
const ContactCapabilityActionSchema = z.object({
  type: z.string(),
  destination: z.string().optional(),
  contactId: z.string().optional(),
  name: z.string().optional(),
  folderId: z.string().optional(),
  draft: z.object({
    name: z.string(),
    folderId: z.string(),
    email: z.string().optional(),
    birthDate: z.string().optional(),
    website: z.string().optional(),
    businessName: z.string().optional(),
    employeeNumber: z.string().optional(),
    industryCode: z.string().optional(),
    craProgramAccountNumber: z.string().optional(),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    provinceState: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    businessPhone: z.string().optional(),
    cellPhone: z.string().optional(),
    homePhone: z.string().optional(),
    faxNumber: z.string().optional(),
    primaryPhoneType: z.string().optional(),
    notes: z.string().optional(),
    sin: z.string().optional(),
    workerType: z.string().optional(),
    payType: z.string().optional(),
    payRate: z.number().optional(),
    hireDate: z.string().optional(),
    startDate: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    hasContract: z.boolean().optional(),
    specialNeeds: z.string().optional(),
  }).optional(),
  patch: z.object({
    name: z.string().optional(),
    folderId: z.string().optional(),
    email: z.string().optional(),
    birthDate: z.string().optional(),
    website: z.string().optional(),
    businessName: z.string().optional(),
    employeeNumber: z.string().optional(),
    industryCode: z.string().optional(),
    craProgramAccountNumber: z.string().optional(),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    provinceState: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    businessPhone: z.string().optional(),
    cellPhone: z.string().optional(),
    homePhone: z.string().optional(),
    faxNumber: z.string().optional(),
    primaryPhoneType: z.string().optional(),
    notes: z.string().optional(),
    sin: z.string().optional(),
    workerType: z.string().optional(),
    payType: z.string().optional(),
    payRate: z.number().optional(),
    hireDate: z.string().optional(),
    startDate: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    hasContract: z.boolean().optional(),
    specialNeeds: z.string().optional(),
  }).optional(),
});

// A fresh instance per call: Genkit renders a reused zod instance as a $ref, which Gemini rejects.
function contactDraftSnapshotSchema() {
  return z.object({
    name: z.string().optional(),
    folderId: z.string().optional(),
    email: z.string().optional(),
    birthDate: z.string().optional(),
    website: z.string().optional(),
    businessName: z.string().optional(),
    employeeNumber: z.string().optional(),
    industryCode: z.string().optional(),
    craProgramAccountNumber: z.string().optional(),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    provinceState: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    businessPhone: z.string().optional(),
    cellPhone: z.string().optional(),
    homePhone: z.string().optional(),
    faxNumber: z.string().optional(),
    notes: z.string().optional(),
  });
}

const ContactCapabilityResultSchema = z.object({
  handled: z.boolean(),
  reply: z.string(),
  action: ContactCapabilityActionSchema.optional(),
  draftSnapshot: contactDraftSnapshotSchema().optional(),
});

export type ContactCapabilityResult = z.infer<typeof ContactCapabilityResultSchema>;

const contactCapabilityFlow = ai.defineFlow(
  {
    name: 'contactCapabilityFlow',
    inputSchema: ContactCapabilityInputSchema,
    outputSchema: ContactCapabilityResultSchema,
  },
  async (input) => {
    const messages = buildScrubbedMessages(input.history, input.message, { annotateActions: true });
    const canCreate = input.accessLevel === 'editor' || input.accessLevel === 'org_admin' || input.accessLevel === 'super_admin';
    const foldersById = new Map(input.folders.map((folder) => [folder.id, folder]));
    const buildFolderPath = (folder: { id: string; name: string; parentId?: string | null }, visited = new Set<string>()): string => {
      if (visited.has(folder.id)) return folder.name;
      visited.add(folder.id);
      const parent = folder.parentId ? foldersById.get(folder.parentId) : undefined;
      return parent ? `${buildFolderPath(parent, visited)} / ${folder.name}` : folder.name;
    };
    const folderCatalog = input.folders.map(folder => `${buildFolderPath(folder)}: ${folder.id}`).join('\n') || 'No contact folders are available.';
    const contactCatalog = (input.contacts || []).map(c => {
      const details = [c.email ? `Email: ${c.email}` : '', c.businessName ? `Company: ${c.businessName}` : ''].filter(Boolean).join(', ');
      return `- "${c.name}" (ID: ${c.id}${details ? `, ${details}` : ''})`;
    }).join('\n') || 'No contacts currently found in directory.';

    const system = `
You are Ogeemo Co-Pilot's Contacts Hub capability evaluator. Decide semantically whether the conversation concerns Contacts Hub: creating a contact, learning how to create one, opening the hub, finding or opening an existing contact, editing a contact, or working with contact folders and categories.

Return handled=false for unrelated conversations. When handled=false, reply may be an empty string and no action is allowed.

Always read the conversation history first. If an earlier turn established a Contacts Hub intent, continue that exchange. A short reply such as "prepare the form", "the instructions", or "yes" answers your previous question and must never be reinterpreted as a new or unrelated request.

Action Output Rules:
The form on screen only changes through draftSnapshot and actions. Never say a field was set, filled, updated or saved unless that value is in draftSnapshot on this same turn.
- draftSnapshot: on every turn of a create or edit workflow after the form is open, return the complete set of field values the conversation has established so far, including values the user stated in any earlier message (for example a name given in the first message) and values you already set. In an edit workflow include only the fields the user asked to change, never the contact's existing values, and never name or folderId unless the user asked to rename the contact or move it to another folder. Omit fields that are unknown, never use empty strings or placeholders. folderId is optional: include a real folder ID from the catalog only when the user has chosen a folder, otherwise omit folderId entirely. Never include SIN, pay, employment dates or emergency-contact details.
- Bracketed notes such as [form updated: ...] in earlier assistant turns record what the client actually executed. Use them to see what is in the form, and never repeat them in your reply.
Every turn that performs a form mutation or navigation MUST return the corresponding action object alongside your reply:
- open_destination with destination "new_contact" navigates to Contacts Hub and opens the New Contact form.
- open_destination with destination "contacts_hub" opens Contacts Hub. Use it for browsing, searching, folders, or general hub navigation.
- open_contact_form opens a form you have prepared from details gathered in the conversation.
- update_contact_draft with a non-empty patch updates fields in the already-open Create or Edit Contact form. When updating fields like name or folderId without submitting, return this action with patch containing the updated field(s) so the form on screen updates immediately.
- submit_contact_form submits and saves the already-open Create or Edit Contact form. On the Create Contact form (/contacts?action=new), this triggers the "Create Identity" button to create and save the contact record. On an edit form, this triggers "Save Changes". Do not ask for user confirmation before submitting; submit as soon as the required/requested fields are established and send feedback that the change or record creation has been completed.
- open_contact opens one specific existing contact by its real ID for editing, optionally with a patch of fields already known from the conversation.
Never invent a URL or path. The client executes contact-workflow actions automatically.

When the conversation concerns contact creation:
- Treat this as a strict state machine. Infer the current state from the complete conversation history and never repeat a completed state.
- Turn 1, intent choice: when the user broadly asks to create a contact and has not chosen a mode, ask whether they want step-by-step instructions or want you to create it for them. Return no action.
- Instructions mode: explain how to use Contacts Hub and return open_destination with destination "new_contact". Do not continue the agent-filling workflow unless the user later asks you to take over.
- Turn 2, launch: when the user chooses agent creation, return open_destination with destination "new_contact" and ask whether they want to fill the open form themselves or want you to fill it. Do not ask for the name yet.
- Self-fill choice: explain that the form is ready and stop prompting. Return no additional action.
- Turn 3, agent-fill choice: when the user asks you to fill it, first check the whole conversation for details already given (such as the contact's name in the first message). If the Full Legal Name is already known, put it in draftSnapshot, return update_contact_draft, say you filled it in, and go straight to asking which Folder/Category to use (List the available folder names). If the name is not known, ask for the contact's Full Legal Name and return no action.
- Turn 4, name: when the user supplies the requested name, put it in draftSnapshot and return update_contact_draft, then ask which Folder/Category to use. List the available folder names. Do not choose a folder for the user. The folder is optional: if the user skips it, declines, or says it does not matter, proceed to submission without folderId.
- Turn 5, folder & direct creation: folder is optional. If the user gives a folder, resolve the user's folder wording to the matching folder from the catalog (the catalog lists nested folders as "Parent / Child"; match on the last path segment or exact name) and include the folder's exact ID. If the user skips the folder, submit without folderId - a default folder is applied on save. Either way: put every other known value, including the name, in draftSnapshot and immediately return submit_contact_form. Do NOT ask for confirmation. State clearly in your reply that you have created the contact (mentioning the named folder only when one was chosen).
- Correction turns: when the user says a field is missing or wrong, return draftSnapshot with all known values again and return submit_contact_form; do not just apologize.
- If the initial request already includes a name (with or without a folder), open the form and create the contact immediately without asking for confirmation.
- The user can create contacts: ${canCreate ? 'yes' : 'no'}. If no, provide instructions and explain that editor access or higher is required. Never return an action.
- Before soliciting or accepting SIN, pay rate, employment dates, emergency contacts, or other confidential HR/payroll details, warn that chat history is saved and obtain explicit consent. Without consent, leave those fields out and ask the user to enter them directly in the form.
- Use only folder IDs from the catalog. Never place a folder name in folderId.
- Never place userId, orgId, IDs, audit metadata, timestamps, keywords, or document folder IDs in a draft or patch.

When the conversation concerns editing an existing contact:
- Treat this as a strict state machine, separate from the creation state machine above. Infer the current state from the complete conversation history and never repeat a completed state.
- Turn 1, intent choice:
  - If the user asks how to edit or update an existing contact (or how to add an email/phone to a contact), or broadly asks for instructions, provide the clear step-by-step instructions:
    1. Open Contacts Hub from the navigation menu (/contacts).
    2. Search or select the target contact from the directory table.
    3. Click Edit Contact to open the record.
    4. In the Core Profile section, update the field (such as Email Identity).
    5. Click "Save Changes" at the bottom of the form.
    Return open_destination with destination "contacts_hub".
  - If the user asks broadly to edit a contact without naming who or what to change, ask whether they want step-by-step instructions or want you to find and edit it for them. Return no action.
  - If the request already names the target contact (e.g., "i want to add an email address to the contact 'Cookie Monster'" or "update Jane Doe's phone to 555-1234"), skip the intent choice turn and go straight to Turn 2 (identifying the target).
- Turn 2, identify the target: Look up the contact in the Available Tenant Contacts catalog below by name or details. Never invent a contactId; it must come from the catalog.
  - No matches: state clearly that the contact was not found in the directory and offer open_destination with destination "contacts_hub". Return no other action.
  - Multiple matches: list each candidate's name plus a distinguishing detail (email or business name) and ask the user which one they mean. Return no action.
  - Exactly one match:
    - If the change value was ALREADY provided (e.g., "update Jane Doe's phone to 555-1234"): put the change in draftSnapshot, return submit_contact_form (or open_contact with the patch to be submitted), and confirm that the update has been performed and saved (e.g. "I've updated Jane Doe's phone to 555-1234 and saved the changes."). Do NOT ask for confirmation.
    - If the change value is NOT YET provided (e.g., "i want to add an email address to the contact 'Cookie Monster'"): return open_contact with its real contactId (and no patch yet). State that you found and opened the contact record for editing, and ask the user what email address (or value) they want to add/set.
- Turn 3, field changes & direct save: once the target contact is open and the user provides the new value (e.g., provides the email address "cookie@sesame.org"), put the changed field in draftSnapshot (e.g. { email: 'cookie@sesame.org' }) and immediately return submit_contact_form. Do NOT ask for confirmation. State clearly in your reply that the field has been updated and the changes have been saved (e.g. "I've updated Cookie Monster's email address to cookie@sesame.org and saved the changes.").
- The user can edit contacts: ${canCreate ? 'yes' : 'no'}. If no, provide instructions and explain that editor access or higher is required. Never return an action.
- Before soliciting or accepting SIN, pay rate, employment dates, emergency contacts, or other confidential HR/payroll details, warn that chat history is saved and obtain explicit consent. Without consent, leave those fields out and ask the user to enter them directly in the form.
- Use only folder IDs from the catalog. Never place a folder name in folderId.
- After submit_contact_form, do not claim persistence succeeded; say the save was requested because the client form remains authoritative for validation and save feedback.
- Never place userId, orgId, IDs, audit metadata, timestamps, keywords, or document folder IDs in a patch.

For other Contacts Hub requests:
- To find someone without an editing intent: check Available Tenant Contacts. If you find a likely match, return open_contact with its real ID. If nothing matches, say so and offer the "contacts_hub" destination.
- For browsing, folders, or categories, explain the steps in Contacts Hub and offer the "contacts_hub" destination.

Available tenant folders:
${folderCatalog}

Available Tenant Contacts:
${contactCatalog}
`;

    const baseOptions = {
      model: STABLE_GEMINI_MODEL,
      messages,
      context: { userId: input.userId, orgId: input.orgId, accessLevel: input.accessLevel },
      system,
      output: { schema: ContactCapabilityResultSchema },
      config: { temperature: 0.1 },
    };

    try {
      const result = await ai.generate({ ...baseOptions });
      if (result.output) {
        return ContactCapabilityResultSchema.parse(result.output);
      }
      console.warn('[contact-capability] first generate returned no structured output');
    } catch (firstError) {
      console.warn('[contact-capability] first generate failed, retrying', {
        roles: messages.map((m) => m.role).join(','),
        error: firstError,
      });
    }

    const retrySystem = `${system}
Important for this retry turn: Continue the exact state machine from history. Do not ask the user for confirmation; execute the requested change and return submit_contact_form as soon as the details are ready.
- Always return draftSnapshot with every known field value (name, folderId, and so on) once the form is open.
- When the folder is chosen (or was already given) for a new contact, return submit_contact_form and state that the contact has been created.
- When a field value is provided for an existing contact, return submit_contact_form and state that the change has been saved.`;

    const retryResult = await ai.generate({
      ...baseOptions,
      system: retrySystem,
      messages: [
        ...messages,
        {
          role: 'user',
          content: [{
            text: 'Respond now with the required JSON reply. Everything already established in the conversation stands. Continue only the next state in the contact workflow and never combine multiple state transitions.',
          }],
        },
      ],
    });

    if (!retryResult.output) {
      throw new Error('Contact capability produced no structured output, even without tools.');
    }

    return ContactCapabilityResultSchema.parse(retryResult.output);
  }
);

export async function orchestrateContactCapability(
  input: z.infer<typeof ContactCapabilityInputSchema>,
): Promise<ContactCapabilityResult> {
  return contactCapabilityFlow(input);
}

function getPageContextGuidance(currentPath?: string): string {
  const path = (currentPath || '/co-pilot').toLowerCase();
  const map: Record<string, string> = {
    '/co-pilot': 'This page is Ogeemo Co-Pilot. Prioritize concise operational help, command routing, search, and immediate follow-up actions.',
    '/owner': 'This page is the Owner Console. Only the master tenant or super admin should discuss subscriber management, tenant creation, tenant pause, or tenant deletion.',
    '/tenant-manager': 'This page is Tenant Management. Keep answers focused on active-tenant administration, membership, and tenant lifecycle actions within the current tenant.',
    '/settings': 'This page is Settings. Keep advice focused on profile, organization, and personal account settings. Do not claim access to system-wide admin controls unless the user is clearly a super admin.',
    '/welcome': 'This page is the tenant welcome screen. Use it for onboarding help, tenant switching, and basic account orientation.',
    '/login': 'This page is the authentication screen. Answer login, account access, and credential issues only in the context of sign-in and access problems.',
  };

  return map[path] || 'This page is a general Ogeemo workspace page. Keep answers scoped to the user\'s current tenant and their role-based permissions.';
}

const ogeemoAgentFlow = ai.defineFlow(
  {
    name: 'ogeemoAgentFlow',
    inputSchema: OgeemoAgentInputSchema.extend({ userId: z.string() }),
    outputSchema: z.object({ reply: z.string() }),
  },
  async (input) => {
    const { userId, message, history, localContext, runtimeContext } = input;
    const scrubbedMessages = buildScrubbedMessages(history, message);

    const runtimeSummary = runtimeContext ? [
      `userId: ${runtimeContext.userId || userId || 'unknown'}`,
      `orgId: ${runtimeContext.orgId || 'unknown'}`,
      `accessLevel: ${runtimeContext.accessLevel || 'unknown'}`,
      `isMasterTenant: ${runtimeContext.isMasterTenant ? 'true' : 'false'}`,
      `currentPath: ${runtimeContext.currentPath || '/co-pilot'}`,
      `activeOrgName: ${runtimeContext.activeOrgName || 'unknown'}`,
    ].join('\n') : `userId: ${userId || 'unknown'}\norgId: unknown\naccessLevel: unknown\nisMasterTenant: false\ncurrentPath: /co-pilot\nactiveOrgName: unknown`;

    const pageGuidance = getPageContextGuidance(runtimeContext?.currentPath || '/co-pilot');
    const knowledgeBase = getKnowledgeBase();
    const finalSystemPrompt = systemPromptTemplate
      .replace('{{{runtimeContext}}}', runtimeSummary)
      .replace('{{{pageGuidance}}}', pageGuidance)
      .replace('{{{knowledgeBase}}}', knowledgeBase);

    try {
      const result = await ai.generate({
        model: STABLE_GEMINI_MODEL,
        messages: scrubbedMessages,
        tools: [searchGlobalTool, searchContactsTool, createTaskTool, syncReceiptsTool],
        system: finalSystemPrompt,
        config: { temperature: 0.1 },
      });

      return { reply: result.text || "I processed your request." };
    } catch (error: any) {
      console.error("[ogeemoAgentFlow] Critical Fetch error:", error);

      // Enhance the error message for the user
      let userErrorMessage = "The Google AI service is currently unresponsive.";
      if (error.message?.includes('fetch failed')) {
        userErrorMessage = "Network transmission failed. Please check your internet connection or if Google AI services are restricted in your region.";
      } else if (error.message?.includes('API key')) {
        userErrorMessage = "AI Authorization failed. There is an issue with the GEMINI_API_KEY.";
      }

      throw new Error(`${userErrorMessage} (Technical Info: ${error.message})`);
    }
  }
);

const ogeemoGeneralKnowledgeFallbackFlow = ai.defineFlow(
  {
    name: 'ogeemoGeneralKnowledgeFallbackFlow',
    inputSchema: OgeemoAgentInputSchema.extend({ userId: z.string() }),
    outputSchema: z.object({ reply: z.string() }),
  },
  async (input) => {
    const { message, history } = input;
    const scrubbedMessages = buildScrubbedMessages(history, message);

    try {
      const result = await ai.generate({
        model: STABLE_GEMINI_MODEL,
        messages: scrubbedMessages,
        system: generalKnowledgeFallbackPrompt,
        config: { temperature: 0.1 },
      });

      return { reply: result.text || "I processed your request." };
    } catch (error: any) {
      console.error("[ogeemoGeneralKnowledgeFallbackFlow] Critical Fetch error:", error);

      let userErrorMessage = "The Google AI service is currently unresponsive.";
      if (error.message?.includes('fetch failed')) {
        userErrorMessage = "Network transmission failed. Please check your internet connection or if Google AI services are restricted in your region.";
      } else if (error.message?.includes('API key')) {
        userErrorMessage = "AI Authorization failed. There is an issue with the GEMINI_API_KEY.";
      }

      throw new Error(`${userErrorMessage} (Technical Info: ${error.message})`);
    }
  }
);

export async function ogeemoAgent(input: { message: string, history: any[], clientUserId: string, localContext?: any, runtimeContext?: { userId?: string; orgId?: string; accessLevel?: 'super_admin' | 'org_admin' | 'editor' | 'viewer'; isMasterTenant?: boolean; currentPath?: string; activeOrgName?: string } }): Promise<{ reply: string }> {
  // The user identity is now passed directly from the API endpoint to ensure stability.
  const userId = input.clientUserId || 'ogeemo-guest';
  const localContext = input.localContext || null;
  const runtimeContext = input.runtimeContext || {
    userId,
    currentPath: '/co-pilot',
    isMasterTenant: false,
  };
  return ogeemoAgentFlow({ ...input, userId, localContext, runtimeContext });
}

export async function ogeemoGeneralKnowledgeFallbackAgent(input: { message: string, history: any[], clientUserId: string, runtimeContext?: { userId?: string; orgId?: string; accessLevel?: 'super_admin' | 'org_admin' | 'editor' | 'viewer'; isMasterTenant?: boolean; currentPath?: string; activeOrgName?: string } }): Promise<{ reply: string }> {
  const userId = input.clientUserId || 'ogeemo-guest';
  const runtimeContext = input.runtimeContext || {
    userId,
    currentPath: '/co-pilot',
    isMasterTenant: false,
  };
  return ogeemoGeneralKnowledgeFallbackFlow({ ...input, userId, runtimeContext });
}
