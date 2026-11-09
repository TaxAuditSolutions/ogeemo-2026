/**
 * Building a task the AI assistant creates (pure; see tests/ai-task.test.ts).
 *
 * The assistant used to save whatever the model produced straight into the tasks collection: no orgId (so the app,
 * which lists tasks by workspace, never showed it), no role check, no title or date checks, and ids that were
 * never looked up. A task is now built here with every field the app expects, and refused if the input is not sound.
 */
import { oneLine } from '@/lib/ai-input';
import { parseWhenInZone } from '@/lib/ai-time';

/** Roles that may create records. A viewer can read, not write. */
const WRITER_LEVELS = new Set(['super_admin', 'org_admin', 'editor']);

export function canCreateTasks(accessLevel: unknown): boolean {
  return typeof accessLevel === 'string' && WRITER_LEVELS.has(accessLevel);
}

export interface AiTaskInput {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  contactId?: string;
  projectId?: string;
}

export interface AiTaskContext {
  userId: string;
  orgId: string;
  /** The user's time zone, for a time sent without an offset. */
  timeZone: string;
  now: Date;
}

export type AiTaskResult = { ok: true; task: Record<string, unknown> } | { ok: false; error: string };

const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DEFAULT_LENGTH_MS = 60 * 60 * 1000;

export function buildAiTask(input: AiTaskInput, ctx: AiTaskContext): AiTaskResult {
  const title = oneLine(input.title, 200);
  if (!title) return { ok: false, error: 'A task needs a title.' };
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 5000) : '';

  for (const [label, value] of [['contact', input.contactId], ['project', input.projectId]] as const) {
    if (value !== undefined && value !== '' && !FIRESTORE_ID.test(value)) {
      return { ok: false, error: `That ${label} id is not valid. Search for the ${label} first and use its id.` };
    }
  }

  let start: Date | null = null;
  let end: Date | null = null;
  if (input.startTime) {
    start = parseWhenInZone(input.startTime, ctx.timeZone, ctx.now);
    if (!start) return { ok: false, error: `"${oneLine(input.startTime, 40)}" is not a date and time I can use. Send it like 2026-11-10T15:00:00-05:00.` };
  }
  if (input.endTime) {
    if (!start) return { ok: false, error: 'An end time needs a start time.' };
    end = parseWhenInZone(input.endTime, ctx.timeZone, ctx.now);
    if (!end) return { ok: false, error: `"${oneLine(input.endTime, 40)}" is not an end time I can use.` };
    if (end.getTime() <= start.getTime()) return { ok: false, error: 'The end time must be after the start time.' };
  }
  if (start && !end) end = new Date(start.getTime() + DEFAULT_LENGTH_MS);

  const projectId = input.projectId || null;
  return {
    ok: true,
    task: {
      title,
      description,
      start,
      end,
      status: 'todo',
      position: 0,
      projectId,
      stepId: null,
      contactId: input.contactId || null,
      isScheduled: start !== null,
      // A plain to-do (no date, no project) belongs on the To-Do List.
      isTodoItem: start === null && projectId === null,
      userId: ctx.userId,
      orgId: ctx.orgId,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
  };
}
