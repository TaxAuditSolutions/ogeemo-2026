/**
 * The createProject tool of the Co-Pilot agent (see tests/agent-project-tool.test.ts).
 *
 * The project is saved by the server on behalf of the signed-in user: who they are, their workspace and their role come
 * from the session (never from the model), a client must be a contact of that workspace, and a project with the same
 * name is not created again until the user has said so.
 */
import { oneLine } from '@/lib/ai-input';
import { buildAiProject, canCreateProjects, projectNameKey, type AiProjectInput } from '@/lib/ai-project';
import type { ToolContext } from '@/lib/ai-runtime';
import type { DbLike } from '@/ai/agent-tools';

export async function createProjectHandler(db: DbLike | null, ctx: ToolContext, input: AiProjectInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return { success: false, message: 'User or workspace not authenticated, so no project was created.' };
  if (!canCreateProjects(ctx.accessLevel)) {
    return { success: false, message: 'Your role can view this workspace but not create projects. Ask an editor or administrator.' };
  }
  if (!db) return { success: false, message: 'The database is not available, so the project was NOT created.' };

  const built = buildAiProject(input, { userId: ctx.userId, orgId: ctx.orgId, now });
  if (!built.ok) return { success: false, message: built.error };
  const project = built.project as Record<string, any>;

  try {
    if (project.contactId) {
      const contact = await db.collection('contacts').doc(project.contactId).get();
      if (!(contact.exists && contact.data()?.orgId === ctx.orgId)) {
        return { success: false, message: 'That contact was not found in this workspace. Search for the contact first and use the id it returns.' };
      }
    }

    if (input.allowDuplicate !== true) {
      const existing = await db.collection('projects').where('orgId', '==', ctx.orgId).get();
      const key = projectNameKey(project.name);
      const match = existing.docs.find((doc: any) => projectNameKey(doc.data()?.name) === key);
      if (match) {
        return {
          success: false,
          message: `A project called "${oneLine(match.data()?.name, 80)}" already exists. Nothing was created. Tell the user, and ask whether to create another project with the same name anyway; only if they say yes, call createProject again with allowDuplicate set to true.`,
        };
      }
    }

    const ref = await db.collection('projects').add(project);
    return {
      success: true,
      projectId: ref.id as string,
      message: `Created the project "${oneLine(project.name, 80)}" with Planning status. It is on the Project List (/projects/all); its steps are planned in the Project Planner.`,
    };
  } catch (error: any) {
    return { success: false, message: `The project could not be saved: ${oneLine(error?.message, 160)}` };
  }
}
