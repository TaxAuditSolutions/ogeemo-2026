/**
 * The createTask tool of the Co-Pilot agent (see tests/agent-tools.test.ts).
 *
 * It used to save whatever the model produced with no workspace (so the app never listed it), no role check, no
 * date check and ids it never looked up, and it reported success without saving when the database was missing.
 */
import { buildAiTask, canCreateTasks, type AiTaskInput } from '@/lib/ai-task';
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';
import type { DbLike } from '@/ai/agent-tools';

async function belongsToWorkspace(db: DbLike, collection: string, id: string, orgId: string): Promise<boolean> {
  const snap = await db.collection(collection).doc(id).get();
  return Boolean(snap.exists && snap.data()?.orgId === orgId);
}

function whenText(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'full', timeStyle: 'short' }).format(date);
  } catch {
    return date.toISOString();
  }
}

export async function createTaskHandler(db: DbLike | null, ctx: ToolContext, input: AiTaskInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return { success: false, message: 'User or workspace not authenticated, so no task was created.' };
  if (!canCreateTasks(ctx.accessLevel)) {
    return { success: false, message: 'Your role can view this workspace but not create tasks. Ask an editor or administrator.' };
  }
  if (!db) return { success: false, message: 'The database is not available, so the task was NOT created.' };

  const built = buildAiTask(input, { userId: ctx.userId, orgId: ctx.orgId, timeZone: ctx.timeZone, now });
  if (!built.ok) return { success: false, message: built.error };
  const task = built.task as Record<string, any>;

  try {
    if (task.contactId && !(await belongsToWorkspace(db, 'contacts', task.contactId, ctx.orgId))) {
      return { success: false, message: 'That contact was not found in this workspace. Search for the contact first and use the id it returns.' };
    }
    if (task.projectId && !(await belongsToWorkspace(db, 'projects', task.projectId, ctx.orgId))) {
      return { success: false, message: 'That project was not found in this workspace. Search for the project first and use the id it returns.' };
    }

    const ref = await db.collection('tasks').add(task);

    // A task inside a project also becomes a step of that project, as when it is added in the app.
    if (task.projectId) {
      const projectRef = db.collection('projects').doc(task.projectId);
      const project = await projectRef.get();
      const steps = Array.isArray(project.data()?.steps) ? project.data().steps : [];
      const stepId = `step_${ref.id}`;
      await projectRef.update({ steps: [...steps, { id: stepId, title: task.title, description: task.description || '', isCompleted: false }] });
      await ref.update({ stepId });
    }

    const where = task.start ? ` for ${whenText(task.start, ctx.timeZone)}` : '';
    return { success: true, taskId: ref.id as string, message: `Created "${oneLine(task.title, 80)}"${where}.` };
  } catch (error: any) {
    return { success: false, message: `The task could not be saved: ${oneLine(error?.message, 160)}` };
  }
}
