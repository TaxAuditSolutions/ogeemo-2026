/**
 * What an archived task or idea keeps (pure; see tests/task-archive.test.ts).
 *
 * An archive used to be a file with only a title and EMPTY contents, so "archived" meant "deleted, with a
 * name left behind". Now the file holds a readable summary for people and an exact copy (JSON) for Ogeemo,
 * so Restore can put the task or idea back (see task-restore.ts). Billing links are never restored: a task
 * on an invoice cannot be archived in the first place, so a restored task always starts unbilled.
 */
import type { Event as TaskEvent } from '@/types/calendar-types';

export const ARCHIVE_MARKER = '--- ogeemo-archive-v1 ---';

/** Notes longer than this are cut (a Firestore document holds about 1 MB, shared with the rest of the record). */
const MAX_TEXT = 100_000;

export const isoOf = (value: unknown): string | null => {
  if (!value) return null;
  const date =
    value instanceof Date ? value
    : typeof (value as { toDate?: unknown }).toDate === 'function' ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const clip = (text: unknown): string => {
  const value = typeof text === 'string' ? text : '';
  return value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) + '\n[cut: the original was longer]' : value;
};

/** A file name that is safe in every file system, keeping the "Archived Task - title" pattern people already see. */
export function archiveFileName(kind: 'task' | 'idea', title: string): string {
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled';
  return `Archived ${kind === 'task' ? 'Task' : 'Idea'} - ${clean}.txt`;
}

function hoursText(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export interface ArchiveFile {
  fileName: string;
  content: string;
}

const RESTORE_HINT = 'Restore this from the File Manager (the file menu has Restore). Do not edit the lines below.';

export function buildTaskArchive(task: Partial<TaskEvent> & { title: string }, now: Date = new Date()): ArchiveFile {
  const sessions = (task.sessions ?? []).map((s) => ({
    id: s.id,
    startTime: isoOf(s.startTime),
    endTime: isoOf(s.endTime),
    durationSeconds: Number(s.durationSeconds) || 0,
    notes: s.notes ?? '',
  }));
  const snapshot = {
    kind: 'task' as const,
    version: 1,
    archivedAt: now.toISOString(),
    sourceId: task.id ?? null,
    title: task.title,
    description: clip(task.description),
    status: task.status ?? 'todo',
    start: isoOf(task.start),
    end: isoOf(task.end),
    isScheduled: Boolean(task.isScheduled),
    projectId: task.projectId ?? null,
    contactId: task.contactId ?? null,
    workerId: task.workerId ?? null,
    duration: Number(task.duration) || 0,
    durationSource: task.durationSource ?? null,
    sessions,
    isBillable: Boolean(task.isBillable),
    billableRate: Number(task.billableRate) || 0,
    activityType: task.activityType ?? 'task',
    urgency: task.urgency ?? null,
    importance: task.importance ?? null,
  };

  const worked = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const lines = [
    'ARCHIVED TASK',
    `Title: ${snapshot.title}`,
    `Status: ${snapshot.status}`,
    snapshot.start ? `Scheduled: ${snapshot.start}${snapshot.end ? ' to ' + snapshot.end : ''}` : 'Scheduled: no',
    worked > 0 ? `Time recorded: ${hoursText(worked)} in ${sessions.length} session${sessions.length === 1 ? '' : 's'}` : 'Time recorded: none',
    snapshot.isBillable ? `Billable: yes, at $${snapshot.billableRate.toFixed(2)} per hour` : 'Billable: no',
    `Archived: ${snapshot.archivedAt}`,
    '',
    'Notes:',
    snapshot.description || '(none)',
    '',
    RESTORE_HINT,
    ARCHIVE_MARKER,
    JSON.stringify(snapshot),
  ];
  return { fileName: archiveFileName('task', task.title), content: lines.join('\n') };
}

export function buildIdeaArchive(idea: { title: string; description?: string; status?: string }, now: Date = new Date()): ArchiveFile {
  const snapshot = {
    kind: 'idea' as const,
    version: 1,
    archivedAt: now.toISOString(),
    title: idea.title,
    description: clip(idea.description),
    status: idea.status ?? 'Maybe',
  };
  const lines = [
    'ARCHIVED IDEA',
    `Title: ${snapshot.title}`,
    `Decision: ${snapshot.status}`,
    `Archived: ${snapshot.archivedAt}`,
    '',
    'Description:',
    snapshot.description || '(none)',
    '',
    RESTORE_HINT,
    ARCHIVE_MARKER,
    JSON.stringify(snapshot),
  ];
  return { fileName: archiveFileName('idea', idea.title), content: lines.join('\n') };
}
