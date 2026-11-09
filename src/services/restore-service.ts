'use client';

/**
 * Restoring an archived task or idea (see archive-service.ts and lib/task-restore.ts).
 *
 * The archive file is removed in the same step as the restore succeeds, so one archive cannot be restored
 * twice. An empty, damaged or foreign file is refused and left alone.
 */
import { collection, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { addTask } from '@/services/project-service';
import { addIdea } from '@/core/ideas-service';
import { FILES_COLLECTION, currentUser, getDb, orgIdOf } from '@/services/archive-service';
import { ideaFromSnapshot, isArchiveFileName, parseArchive, taskFromSnapshot } from '@/lib/task-restore';

export interface RestoreResult {
  kind: 'task' | 'idea';
  title: string;
  /** What could not be put back exactly. */
  notes: string[];
}

export async function restoreArchive(fileId: string): Promise<RestoreResult> {
  const db = getDb();
  const user = currentUser();
  const orgId = await orgIdOf();
  const fileRef = doc(db, FILES_COLLECTION, fileId);
  const fileSnap = await getDoc(fileRef);
  if (!fileSnap.exists() || fileSnap.data().orgId !== orgId) throw new Error('That file no longer exists.');
  if (!isArchiveFileName(fileSnap.data().name)) throw new Error('This file is not an archived task or idea.');

  const parsed = parseArchive(fileSnap.data().content);
  if (!parsed.ok) throw new Error(parsed.error);

  if (parsed.archive.kind === 'idea') {
    const idea = ideaFromSnapshot(parsed.archive);
    const existing = await getDocs(query(collection(db, 'ideas'), where('orgId', '==', orgId)));
    await addIdea({ ...idea, position: existing.size, userId: user.uid } as any);
    const batch = writeBatch(db);
    batch.delete(fileRef);
    await batch.commit();
    return { kind: 'idea', title: idea.title, notes: [] };
  }

  const snapshot = parsed.archive;
  const [projectSnap, contactSnap] = await Promise.all([
    snapshot.projectId ? getDoc(doc(db, 'projects', snapshot.projectId)) : Promise.resolve(null),
    snapshot.contactId ? getDoc(doc(db, 'contacts', snapshot.contactId)) : Promise.resolve(null),
  ]);
  const { task, notes } = taskFromSnapshot(snapshot, {
    project: Boolean(projectSnap && projectSnap.exists() && projectSnap.data()?.orgId === orgId),
    contact: Boolean(contactSnap && contactSnap.exists() && contactSnap.data()?.orgId === orgId),
  });
  await addTask({ ...(task as any), userId: user.uid });
  const batch = writeBatch(db);
  batch.delete(fileRef);
  await batch.commit();
  return { kind: 'task', title: snapshot.title, notes };
}
