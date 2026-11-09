'use client';

/**
 * Archiving tasks and ideas (see lib/task-archive.ts); restoring is in restore-service.ts.
 *
 * Archive writes the file AND removes the original in ONE batch. Before, the file was added first and the
 * original deleted second: if the second step failed you had both, and the file was empty anyway. An
 * activity that work still depends on (an invoice or quote line, an open work order) cannot be archived;
 * recorded time does not block, because the archive keeps it and Restore brings it back.
 */
import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { findOrCreateFileFolder } from '@/core/file-manager-folders';
import { getTaskLinks, queueStepRemoval } from '@/services/project-service';
import { billedDeleteProblem } from '@/lib/time-entry-lock';
import { taskArchiveProblem } from '@/lib/task-links';
import { buildIdeaArchive, buildTaskArchive } from '@/lib/task-archive';

export const FILES_COLLECTION = 'files';
const TASKS_COLLECTION = 'tasks';
const IDEAS_COLLECTION = 'ideas';

export function getDb() {
  return getFirebaseServices().db;
}

export function currentUser() {
  const user = getFirebaseServices().auth.currentUser;
  if (!user) throw new Error('User must be logged in.');
  return user;
}

export async function orgIdOf(): Promise<string> {
  const user = currentUser();
  const claim = (await user.getIdTokenResult()).claims.orgId;
  if (typeof claim === 'string' && claim.trim()) return claim;
  const profile = await getDoc(doc(getDb(), 'users', user.uid));
  const orgId = profile.data()?.orgId;
  if (typeof orgId === 'string' && orgId.trim()) return orgId;
  throw new Error('Authenticated user is missing an orgId claim and profile orgId.');
}

function fileRecord(name: string, content: string, folderId: string, userId: string, orgId: string) {
  const now = new Date();
  const lower = name.toLowerCase();
  return {
    name,
    type: 'text/plain',
    size: content.length,
    modifiedAt: now,
    folderId,
    userId,
    orgId,
    storagePath: `userFiles/${userId}/${folderId}/${now.getTime()}-${name}.txt`,
    content,
    keywords: Array.from(new Set([lower, ...lower.split(/[\s\-._]+/).filter(Boolean)])),
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Archives a task: saves its full contents to the File Manager and removes it, together or not at all. */
export async function archiveTask(taskId: string): Promise<{ fileName: string }> {
  const db = getDb();
  const user = currentUser();
  const orgId = await orgIdOf();
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists() || snap.data().orgId !== orgId) throw new Error('That activity no longer exists.');

  const data = snap.data();
  const blocked = billedDeleteProblem(data, 'activity') ?? taskArchiveProblem(await getTaskLinks(taskId, data));
  if (blocked) throw new Error(blocked);

  const toDate = (value: any) => (value && typeof value.toDate === 'function' ? value.toDate() : value);
  const archive = buildTaskArchive({
    ...(data as any),
    id: taskId,
    start: toDate(data.start),
    end: toDate(data.end),
    sessions: (data.sessions || []).map((s: any) => ({ ...s, startTime: toDate(s.startTime), endTime: toDate(s.endTime) })),
  });

  const folder = await findOrCreateFileFolder(user.uid, 'Archived Tasks');
  const batch = writeBatch(db);
  batch.set(doc(collection(db, FILES_COLLECTION)), fileRecord(archive.fileName, archive.content, folder.id, user.uid, orgId));
  await queueStepRemoval(batch, { ...(data as any), id: taskId });
  batch.delete(taskRef);
  await batch.commit();
  return { fileName: archive.fileName };
}

/** Archives an idea the same way: its text is kept in the file and the idea is removed in one step. */
export async function archiveIdea(ideaId: string): Promise<{ fileName: string }> {
  const db = getDb();
  const user = currentUser();
  const orgId = await orgIdOf();
  const ideaRef = doc(db, IDEAS_COLLECTION, ideaId);
  const snap = await getDoc(ideaRef);
  if (!snap.exists() || snap.data().orgId !== orgId) throw new Error('That idea no longer exists.');

  const archive = buildIdeaArchive({ title: snap.data().title, description: snap.data().description, status: snap.data().status });
  const folder = await findOrCreateFileFolder(user.uid, 'Archived Ideas');
  const batch = writeBatch(db);
  batch.set(doc(collection(db, FILES_COLLECTION)), fileRecord(archive.fileName, archive.content, folder.id, user.uid, orgId));
  batch.delete(ideaRef);
  await batch.commit();
  return { fileName: archive.fileName };
}
