'use client';

/**
 * The To-Do List trash bin (see lib/task-trash.ts).
 *
 * Moving a task to the trash writes it to `trashedTasks` AND removes the original (and its project step) in ONE batch,
 * so there is never both or neither. Restore creates the task again and removes the trash record, also together.
 * Emptying the trash is the only step that cannot be undone.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { addTask, getTaskLinks, queueStepRemoval } from '@/services/project-service';
import { currentUser, getDb, orgIdOf } from '@/services/archive-service';
import { billedDeleteProblem } from '@/lib/time-entry-lock';
import { buildTrashRecord, sortTrash, taskFromTrash, trashProblem, type TrashedTask } from '@/lib/task-trash';

export const TRASHED_TASKS_COLLECTION = 'trashedTasks';
const TASKS_COLLECTION = 'tasks';

const toDate = (value: any): Date | undefined => (value && typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : undefined);

export interface TrashedResult {
  /** The trash records made, so a message can offer Undo. */
  trashIds: string[];
  titles: string[];
}

/** Moves tasks to the trash. Nothing moves if any one of them is in use (all or nothing), and the message names it. */
export async function trashTasks(taskIds: string[]): Promise<TrashedResult> {
  const db = getDb();
  const user = currentUser();
  const orgId = await orgIdOf();

  const ready: { id: string; data: Record<string, any> }[] = [];
  for (const id of Array.from(new Set(taskIds))) {
    const snap = await getDoc(doc(db, TASKS_COLLECTION, id));
    if (!snap.exists() || snap.data().orgId !== orgId) continue;
    const data = snap.data();
    const problem = billedDeleteProblem(data, 'activity') ?? trashProblem(await getTaskLinks(id, data));
    if (problem) throw new Error(`"${data.title || 'An activity'}": ${problem}`);
    ready.push({ id, data });
  }

  const trashIds: string[] = [];
  const titles: string[] = [];
  for (const { id, data } of ready) {
    const task = {
      ...(data as any),
      id,
      start: toDate(data.start),
      end: toDate(data.end),
      sessions: (data.sessions || []).map((s: any) => ({ ...s, startTime: toDate(s.startTime), endTime: toDate(s.endTime) })),
    };
    const record = buildTrashRecord(task);
    const now = new Date();
    const trashRef = doc(collection(db, TRASHED_TASKS_COLLECTION));
    const batch = writeBatch(db);
    batch.set(trashRef, {
      ...record,
      sourceId: id,
      orgId,
      userId: user.uid,
      createdBy: user.uid,
      trashedAt: now,
      trashedBy: user.uid,
    });
    await queueStepRemoval(batch, task);
    batch.delete(doc(db, TASKS_COLLECTION, id));
    await batch.commit();
    trashIds.push(trashRef.id);
    titles.push(record.title);
  }
  return { trashIds, titles };
}

/** What is in this workspace's trash, newest first. */
export async function getTrashedTasks(): Promise<TrashedTask[]> {
  const db = getDb();
  const orgId = await orgIdOf();
  const snap = await getDocs(query(collection(db, TRASHED_TASKS_COLLECTION), where('orgId', '==', orgId)));
  return sortTrash(
    snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: typeof data.title === 'string' && data.title ? data.title : 'Untitled task',
        status: (data.status === 'inProgress' || data.status === 'done' ? data.status : 'todo') as TrashedTask['status'],
        trashedAt: toDate(data.trashedAt) ?? null,
      };
    }),
  );
}

/** Puts a trashed task back, then removes it from the trash. A project or client that is gone is dropped, and `notes` says so. */
export async function restoreTrashedTask(trashId: string): Promise<{ title: string; notes: string[] }> {
  const db = getDb();
  const user = currentUser();
  const orgId = await orgIdOf();
  const ref = doc(db, TRASHED_TASKS_COLLECTION, trashId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().orgId !== orgId) throw new Error('That item is no longer in the trash.');

  const data = snap.data();
  const projectId = typeof data.projectId === 'string' && data.projectId ? data.projectId : null;
  const contactId = typeof data.contactId === 'string' && data.contactId ? data.contactId : null;
  const [projectSnap, contactSnap] = await Promise.all([
    projectId ? getDoc(doc(db, 'projects', projectId)) : Promise.resolve(null),
    contactId ? getDoc(doc(db, 'contacts', contactId)) : Promise.resolve(null),
  ]);
  const restored = taskFromTrash(data, {
    project: Boolean(projectSnap && projectSnap.exists() && projectSnap.data()?.orgId === orgId),
    contact: Boolean(contactSnap && contactSnap.exists() && contactSnap.data()?.orgId === orgId),
  });
  if (!restored.ok) throw new Error(restored.error);

  await addTask({ ...(restored.task as any), userId: user.uid });
  await deleteDoc(ref);
  return { title: restored.task.title, notes: restored.notes };
}

/** Removes trashed tasks for good. */
export async function deleteTrashedTasks(trashIds: string[]): Promise<number> {
  const db = getDb();
  const orgId = await orgIdOf();
  let removed = 0;
  for (const id of Array.from(new Set(trashIds))) {
    const ref = doc(db, TRASHED_TASKS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().orgId !== orgId) continue;
    await deleteDoc(ref);
    removed += 1;
  }
  return removed;
}
