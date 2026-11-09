/**
 * The calendar tools of the Co-Pilot agent (see tests/agent-calendar-tool.test.ts).
 *
 * createAppointment books an appointment on the signed-in person's Calendar; getCalendar reads it back. Who is asking,
 * their workspace and their role come from the server session (never from the model), and the person's calendar is
 * only their own events. An appointment that overlaps one of their unfinished events is not booked until the user
 * says so, and the answer offers the next free time.
 */
import { oneLine } from '@/lib/ai-input';
import { buildAiAppointment, canCreateAppointments, type AiAppointmentInput } from '@/lib/ai-appointment';
import { addDaysToDateString, calendarItemsFor, describeSlot, findConflicts, itemsBetween, localDateOf, suggestFreeSlot } from '@/lib/ai-calendar';
import { parseWhenInZone } from '@/lib/ai-time';
import type { ToolContext } from '@/lib/ai-runtime';
import type { DbLike } from '@/ai/agent-tools';

const MAX_LISTED = 30;

/** The person's own scheduled events. `workerId` may hold their contact id, so that is looked up from their profile. */
async function myCalendar(db: DbLike, userId: string, orgId: string) {
  let contactId: string | null = null;
  try {
    const profile = await db.collection('users').doc(userId).get();
    const linked = profile.data()?.contactId;
    if (typeof linked === 'string' && linked) contactId = linked;
  } catch {
    // Without the profile only events assigned to the sign-in id are found, which is the common case.
  }
  const snap = await db.collection('tasks').where('orgId', '==', orgId).where('isScheduled', '==', true).get();
  return calendarItemsFor(snap.docs.map((doc: any) => doc.data()), { userId, contactId });
}

export async function createAppointmentHandler(db: DbLike | null, ctx: ToolContext, input: AiAppointmentInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return { success: false, message: 'User or workspace not authenticated, so no appointment was booked.' };
  if (!canCreateAppointments(ctx.accessLevel)) {
    return { success: false, message: 'Your role can view this workspace but not book appointments. Ask an editor or administrator.' };
  }
  if (!db) return { success: false, message: 'The database is not available, so the appointment was NOT booked.' };

  const built = buildAiAppointment(input, { userId: ctx.userId, orgId: ctx.orgId, timeZone: ctx.timeZone, now });
  if (!built.ok) return { success: false, message: built.error };
  const appointment = built.appointment as Record<string, any>;

  try {
    let withName = '';
    if (appointment.contactId) {
      const contact = await db.collection('contacts').doc(appointment.contactId).get();
      if (!contact.exists || contact.data()?.orgId !== ctx.orgId) {
        return { success: false, message: 'That contact was not found in this workspace. Search for the contact first and use the id it returns.' };
      }
      const name = oneLine(contact.data()?.name, 80);
      if (name) withName = ` with ${name}`;
    }

    if (input.allowDoubleBooking !== true) {
      const items = await myCalendar(db, ctx.userId, ctx.orgId);
      const clashes = findConflicts(items, built.start, built.end);
      if (clashes.length > 0) {
        const list = clashes.slice(0, 3).map((item) => `"${item.title}" (${describeSlot(item.start, item.end, ctx.timeZone)})`).join(', ');
        const free = suggestFreeSlot(items, built.start, built.minutes, ctx.timeZone, now);
        const offer = free ? ` The next free time of that length is ${describeSlot(free.start, free.end, ctx.timeZone)}.` : '';
        return {
          success: false,
          message: `That overlaps ${list}. Nothing was booked.${offer} Tell the user, and offer that time or another; only if they say to book it anyway, call createAppointment again with allowDoubleBooking set to true.`,
        };
      }
    }

    const ref = await db.collection('tasks').add(appointment);
    return {
      success: true,
      appointmentId: ref.id as string,
      message: `Booked "${oneLine(appointment.title, 80)}"${withName} for ${describeSlot(built.start, built.end, ctx.timeZone)} (${built.minutes} min). It is on your Calendar.`,
    };
  } catch (error: any) {
    return { success: false, message: `The appointment could not be saved: ${oneLine(error?.message, 160)}` };
  }
}


export async function getCalendarHandler(db: DbLike | null, ctx: ToolContext, input: { date?: string; days?: number }, now: Date = new Date()) {
  const none = [] as Array<{ title: string; when: string; status: string }>;
  if (!ctx.userId || !ctx.orgId) return { success: false, events: none, message: 'User or workspace not authenticated.' };
  if (!db) return { success: false, events: none, message: 'Database not available.' };

  const requested = oneLine(input.date, 40);
  if (requested && !/^\d{4}-\d{2}-\d{2}/.test(requested)) {
    return { success: false, events: none, message: 'Give the date as YYYY-MM-DD, for example 2026-11-10.' };
  }
  const day = requested ? requested.slice(0, 10) : localDateOf(now, ctx.timeZone);
  const days = Math.min(14, Math.max(1, Math.round(Number(input.days) || 1)));
  const from = parseWhenInZone(day, ctx.timeZone, now);
  const to = parseWhenInZone(addDaysToDateString(day, days), ctx.timeZone, now);
  if (!from || !to) return { success: false, events: none, message: `"${day}" is not a date I can use. Give it as YYYY-MM-DD.` };

  try {
    const found = itemsBetween(await myCalendar(db, ctx.userId, ctx.orgId), from, to);
    const events = found.slice(0, MAX_LISTED).map((item) => ({
      title: item.title,
      when: describeSlot(item.start, item.end, ctx.timeZone, item.allDay),
      status: item.status === 'done' ? 'done' : 'open',
    }));
    const span = days === 1 ? `on ${day}` : `from ${day} for ${days} days`;
    const message =
      found.length === 0
        ? `Nothing is on your calendar ${span}.`
        : `You have ${found.length} event${found.length === 1 ? '' : 's'} ${span}${found.length > events.length ? `; showing the first ${events.length}` : ''}.`;
    return { success: true, events, message };
  } catch (error: any) {
    return { success: false, events: none, message: `The calendar could not be read: ${oneLine(error?.message, 160)}` };
  }
}
