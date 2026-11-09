/**
 * Reading an archive back and rebuilding the task or idea from it (pure; see tests/task-archive.test.ts).
 */
import type { Event as TaskEvent } from '@/types/calendar-types';
import { ARCHIVE_MARKER, isoOf } from '@/lib/task-archive';

export interface TaskSnapshot {
  kind: 'task';
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  start: string | null;
  end: string | null;
  isScheduled: boolean;
  projectId: string | null;
  contactId: string | null;
  workerId: string | null;
  duration: number;
  durationSource: 'sessions' | 'scheduled' | 'manual' | null;
  sessions: { id: string; startTime: string | null; endTime: string | null; durationSeconds: number; notes: string }[];
  isBillable: boolean;
  billableRate: number;
  activityType: string;
  urgency: string | null;
  importance: string | null;
}

export interface IdeaSnapshot {
  kind: 'idea';
  title: string;
  description: string;
  status: 'Yes' | 'No' | 'Maybe';
}

export type ParsedArchive = { ok: true; archive: TaskSnapshot | IdeaSnapshot } | { ok: false; error: string };

/** True for a file name made by the archive buttons. */
export function isArchiveFileName(name: unknown): boolean {
  return typeof name === 'string' && /^Archived (Task|Idea) - /.test(name);
}

/** Reads an archive file back. Old empty archives and files that are not archives say so plainly. */
export function parseArchive(content: unknown): ParsedArchive {
  const text = typeof content === 'string' ? content : '';
  if (!text.trim()) return { ok: false, error: 'This archive is empty. It was made before archives kept their contents, so there is nothing to restore.' };
  const at = text.indexOf(ARCHIVE_MARKER);
  if (at < 0) return { ok: false, error: 'This file is not an Ogeemo archive, so it cannot be restored.' };
  try {
    const value = JSON.parse(text.slice(at + ARCHIVE_MARKER.length).trim());
    if (!value || typeof value.title !== 'string' || !value.title.trim()) return { ok: false, error: 'The archive is damaged (no title).' };
    if (value.kind === 'task') return { ok: true, archive: value as TaskSnapshot };
    if (value.kind === 'idea') return { ok: true, archive: value as IdeaSnapshot };
    return { ok: false, error: 'The archive is damaged (unknown kind).' };
  } catch {
    return { ok: false, error: 'The archive is damaged and cannot be read.' };
  }
}

const dateOf = (value: unknown): Date | undefined => {
  const iso = isoOf(value);
  return iso ? new Date(iso) : undefined;
};

export interface RestoredTask {
  task: Omit<TaskEvent, 'id' | 'userId'>;
  /** What could not be put back exactly, for the message to the user. */
  notes: string[];
}

/** The task to create from a snapshot. A project or client that no longer exists is dropped, and the user is told. */
export function taskFromSnapshot(snapshot: TaskSnapshot, exists: { project: boolean; contact: boolean }): RestoredTask {
  const notes: string[] = [];
  let projectId = snapshot.projectId;
  if (projectId && !exists.project) {
    projectId = null;
    notes.push('its project no longer exists, so it was restored without one');
  }
  let contactId = snapshot.contactId;
  if (contactId && !exists.contact) {
    contactId = null;
    notes.push('its client no longer exists, so it was restored without one');
  }
  const status = snapshot.status === 'inProgress' || snapshot.status === 'done' ? snapshot.status : 'todo';
  const sessions = (snapshot.sessions ?? []).map((s) => ({
    id: s.id,
    startTime: dateOf(s.startTime) ?? new Date(),
    endTime: dateOf(s.endTime) ?? new Date(),
    durationSeconds: Number(s.durationSeconds) || 0,
    notes: s.notes || undefined,
  }));
  const task = {
    title: snapshot.title,
    description: snapshot.description || '',
    status,
    position: 0,
    start: dateOf(snapshot.start),
    end: dateOf(snapshot.end),
    isScheduled: Boolean(snapshot.isScheduled && snapshot.start),
    projectId,
    contactId,
    workerId: snapshot.workerId ?? null,
    duration: snapshot.duration || undefined,
    durationSource: snapshot.durationSource ?? null,
    sessions: sessions.length ? sessions : undefined,
    isBillable: Boolean(snapshot.isBillable),
    billableRate: Number(snapshot.billableRate) || 0,
    activityType: (snapshot.activityType as TaskEvent['activityType']) || 'task',
    urgency: (snapshot.urgency ?? undefined) as TaskEvent['urgency'],
    importance: (snapshot.importance ?? undefined) as TaskEvent['importance'],
    billedInvoiceId: null,
    billedAt: null,
  } as Omit<TaskEvent, 'id' | 'userId'>;
  return { task, notes };
}

/** The idea to create from a snapshot. A decision that is not Yes, No or Maybe becomes Maybe. */
export function ideaFromSnapshot(snapshot: IdeaSnapshot): { title: string; description: string; status: 'Yes' | 'No' | 'Maybe' } {
  const status = snapshot.status === 'Yes' || snapshot.status === 'No' ? snapshot.status : 'Maybe';
  return { title: snapshot.title, description: snapshot.description || '', status };
}
