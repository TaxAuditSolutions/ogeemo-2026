/**
 * Building a project the AI assistant creates (pure; see tests/ai-project.test.ts).
 *
 * Before this the Co-Pilot could only open the New Project form. A project it saves itself is built here with every
 * field the app's own addProject writes (workspace, creator, Planning status, empty steps) and refused if the input is
 * not sound. Like the contact tool, an editor or above may create one and a contact id must belong to the workspace
 * (the handler checks that).
 */
import { oneLine } from '@/lib/ai-input';
import { canCreateTasks } from '@/lib/ai-task';

/** The same roles that may create tasks may create projects: an editor or above. */
export const canCreateProjects = canCreateTasks;

export interface AiProjectInput {
  name?: string;
  description?: string;
  /** The client the project is for, from searchContacts. */
  contactId?: string;
  /** Only after the user has said to create a project although one with that name exists. */
  allowDuplicate?: boolean;
}

export interface AiProjectContext {
  userId: string;
  orgId: string;
  now: Date;
}

export type AiProjectResult = { ok: true; project: Record<string, unknown> } | { ok: false; error: string };

const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** A project name as compared for duplicates: case and spacing do not matter. */
export function projectNameKey(name: unknown): string {
  return typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().toLowerCase() : '';
}

export function buildAiProject(input: AiProjectInput, ctx: AiProjectContext): AiProjectResult {
  const name = oneLine(input.name, 200);
  if (!name) return { ok: false, error: 'A project needs a name. Ask the user what to call it.' };
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 5000) : '';

  const contactId = typeof input.contactId === 'string' ? input.contactId.trim() : '';
  if (contactId && !FIRESTORE_ID.test(contactId)) {
    return { ok: false, error: 'That contact id is not valid. Search for the contact first and use its id.' };
  }

  return {
    ok: true,
    project: {
      name,
      description,
      status: 'planning',
      urgency: 'important',
      importance: 'B',
      contactId: contactId || null,
      projectManagerId: null,
      projectValue: null,
      startDate: null,
      endDate: null,
      steps: [],
      userId: ctx.userId,
      orgId: ctx.orgId,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
  };
}
