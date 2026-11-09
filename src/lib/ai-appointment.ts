/**
 * Building an appointment the AI assistant books (pure; see tests/ai-appointment.test.ts).
 *
 * `createTask` could already save a scheduled entry, but as a plain task: the Calendar flags an unfinished task amber
 * once its time has passed, and an appointment is never flagged (src/lib/calendar-quick-entry.ts). An appointment is
 * built here with every field the Calendar and Activity Manager expect, including the appointment type, and is refused
 * if it has no title or no day AND time of day, is in the past, ends before it starts, or runs longer than 12 hours.
 * It is never given a `workerId`: the app reads a missing one as "the person who made it".
 */
import { oneLine } from '@/lib/ai-input';
import { canCreateTasks } from '@/lib/ai-task';
import { parseWhenInZone } from '@/lib/ai-time';

/** The same roles that may create tasks may book appointments: an editor or above. */
export const canCreateAppointments = canCreateTasks;

export const DEFAULT_APPOINTMENT_MINUTES = 60;
export const MAX_APPOINTMENT_MINUTES = 12 * 60;
const MIN_APPOINTMENT_MINUTES = 5;
const MINUTE_MS = 60_000;
const PAST_GRACE_MS = 5 * MINUTE_MS;
const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface AiAppointmentInput {
  title?: string;
  /** ISO date-time; without an offset it is read in the user's time zone. A date with no time of day is refused. */
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  contactId?: string;
  location?: string;
  notes?: string;
  /** Only after the user has said to book it although it overlaps something. */
  allowDoubleBooking?: boolean;
}

export interface AiAppointmentContext {
  userId: string;
  orgId: string;
  timeZone: string;
  now: Date;
}

export type AiAppointmentResult =
  | { ok: true; appointment: Record<string, unknown>; start: Date; end: Date; minutes: number }
  | { ok: false; error: string };

export function buildAiAppointment(input: AiAppointmentInput, ctx: AiAppointmentContext): AiAppointmentResult {
  const title = oneLine(input.title, 200);
  if (!title) return { ok: false, error: 'An appointment needs a title. Ask the user what it is for.' };

  const startText = oneLine(input.startTime, 40);
  if (!startText) return { ok: false, error: 'An appointment needs a day and a time. Ask the user when it should be.' };
  if (DATE_ONLY.test(startText)) {
    return { ok: false, error: `"${startText}" has no time of day. Ask the user what time the appointment starts.` };
  }
  const start = parseWhenInZone(startText, ctx.timeZone, ctx.now);
  if (!start) return { ok: false, error: `"${startText}" is not a date and time I can use. Send it like 2026-11-10T15:00:00-05:00.` };
  if (start.getTime() < ctx.now.getTime() - PAST_GRACE_MS) {
    return { ok: false, error: 'That time has already passed. Ask the user for a time that is still ahead.' };
  }

  let end: Date;
  const endText = oneLine(input.endTime, 40);
  if (endText) {
    const parsed = parseWhenInZone(endText, ctx.timeZone, ctx.now);
    if (!parsed) return { ok: false, error: `"${endText}" is not an end time I can use.` };
    end = parsed;
  } else if (input.durationMinutes !== undefined && input.durationMinutes !== null) {
    const minutes = Number(input.durationMinutes);
    if (!Number.isFinite(minutes) || minutes < MIN_APPOINTMENT_MINUTES || minutes > MAX_APPOINTMENT_MINUTES) {
      return { ok: false, error: `The length must be between ${MIN_APPOINTMENT_MINUTES} minutes and 12 hours.` };
    }
    end = new Date(start.getTime() + Math.round(minutes) * MINUTE_MS);
  } else {
    end = new Date(start.getTime() + DEFAULT_APPOINTMENT_MINUTES * MINUTE_MS);
  }
  if (end.getTime() <= start.getTime()) return { ok: false, error: 'The end time must be after the start time.' };
  const minutes = Math.round((end.getTime() - start.getTime()) / MINUTE_MS);
  if (minutes > MAX_APPOINTMENT_MINUTES) {
    return { ok: false, error: 'An appointment can be at most 12 hours long. For longer work, use the Activity Manager.' };
  }

  const contactId = input.contactId === undefined ? '' : String(input.contactId).trim();
  if (contactId && !FIRESTORE_ID.test(contactId)) {
    return { ok: false, error: 'That contact id is not valid. Search for the contact first and use its id.' };
  }

  const where = oneLine(input.location, 200);
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 2000) : '';
  const description = [where ? `Location: ${where}` : '', notes].filter(Boolean).join('\n');

  return {
    ok: true,
    start,
    end,
    minutes,
    appointment: {
      title,
      description,
      start,
      end,
      status: 'todo',
      position: 0,
      projectId: null,
      stepId: null,
      contactId: contactId || null,
      isScheduled: true,
      isTodoItem: false,
      activityType: 'appointment',
      // Planned time only: it never counts as worked or billable time until someone logs real time on it.
      duration: 0,
      userId: ctx.userId,
      orgId: ctx.orgId,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
  };
}
