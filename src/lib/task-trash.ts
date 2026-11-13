/**
 * The To-Do List trash bin (pure; see tests/task-trash.test.ts).
 *
 * A trashed task is MOVED out of `tasks` into `trashedTasks`, so every other screen (Calendar, time reports, the
 * Co-Pilot, the project board) treats it exactly as if it had been deleted, and nothing has to filter it out. The
 * record keeps the same exact copy the archive uses (task-archive.ts), so Restore puts it back through the same,
 * already tested, path (task-restore.ts): a project or client that no longer exists is dropped and the person is told,
 * and billing links are never restored.
 *
 * What may be trashed is what may be deleted: nothing on an invoice, a quote or an open work order, and nothing with
 * recorded time (that time feeds payroll and the time reports, and emptying the trash would erase it; archive such a
 * task instead, which keeps the time).
 */
import type { Event as TaskEvent } from '@/types/calendar-types';
import { buildTaskArchive } from '@/lib/task-archive';
import { parseArchive, taskFromSnapshot } from '@/lib/task-restore';
import { blockingReasons, type TaskLinks } from '@/lib/task-links';

export const UNTITLED_TASK = 'Untitled task';

/** What is stored in `trashedTasks` for one trashed task (the service adds orgId, userId and the dates). */
export interface TrashRecord {
  title: string;
  status: 'todo' | 'inProgress' | 'done';
  projectId: string | null;
  contactId: string | null;
  isTodoItem: boolean;
  /** The exact copy (same text the archive keeps). */
  content: string;
}

/** What the Trash window shows for one item. */
export interface TrashedTask {
  id: string;
  title: string;
  status: TrashRecord['status'];
  trashedAt: Date | null;
}

const list = (items: string[]) => (items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);

function hoursText(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/** Why this task cannot go in the trash, or null. */
export function trashProblem(links: TaskLinks): string | null {
  const blocking = blockingReasons(links);
  if (blocking.length > 0) {
    return `This activity is still in use by ${list(blocking)}, so it cannot be moved to the trash. Remove it from there first (delete the invoice or quote, or finish or cancel the work order).`;
  }
  if (links.workedSeconds > 0) {
    return `This activity has ${hoursText(links.workedSeconds)} of recorded time, which feeds payroll and the time reports, so it cannot be moved to the trash. Archive it instead: the archive keeps the time and can be restored from the File Manager.`;
  }
  return null;
}

const statusOf = (value: unknown): TrashRecord['status'] => (value === 'inProgress' || value === 'done' ? value : 'todo');

/** The record to store for a task. The title always has text, because an archive without one cannot be read back. */
export function buildTrashRecord(task: Partial<TaskEvent>, now: Date = new Date()): TrashRecord {
  const title = typeof task.title === 'string' && task.title.trim() ? task.title.trim() : UNTITLED_TASK;
  const archive = buildTaskArchive({ ...task, title }, now);
  return {
    title,
    status: statusOf(task.status),
    projectId: task.projectId && task.projectId !== 'inbox' ? task.projectId : null,
    contactId: task.contactId || null,
    isTodoItem: Boolean(task.isTodoItem),
    content: archive.content,
  };
}

export type RestoredFromTrash =
  | { ok: true; task: Omit<TaskEvent, 'id' | 'userId'>; notes: string[] }
  | { ok: false; error: string };

/** The task to create again from a trashed record. A plain to-do goes back on the To-Do List. */
export function taskFromTrash(
  record: { content?: unknown; isTodoItem?: unknown },
  exists: { project: boolean; contact: boolean },
): RestoredFromTrash {
  const parsed = parseArchive(record.content);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.archive.kind !== 'task') return { ok: false, error: 'This item is not a task, so it cannot be restored here.' };
  const restored = taskFromSnapshot(parsed.archive, exists);
  return { ok: true, task: { ...restored.task, isTodoItem: record.isTodoItem === true }, notes: restored.notes };
}

/** Newest first; an item with no date goes last. */
export function sortTrash<T extends { trashedAt: Date | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (b.trashedAt?.getTime() ?? 0) - (a.trashedAt?.getTime() ?? 0));
}

/** One plain sentence for the message after a move to the trash. */
export function trashedMessage(titles: readonly string[]): string {
  if (titles.length === 0) return '';
  if (titles.length === 1) return `"${titles[0]}" is in the trash.`;
  return `${titles.length} items are in the trash.`;
}
