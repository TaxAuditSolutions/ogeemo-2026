/**
 * The changeEvent tool of the Co-Pilot agent (see tests/agent-event-tool.test.ts).
 *
 * Moves or cancels one of the signed-in person's OWN calendar events. A cancel cannot be undone, and the model reads
 * event titles that anyone could have typed, so the change is made in two steps that the model cannot shortcut:
 *
 *   1. The first call only PREVIEWS: it checks everything, saves the plan as this person's single pending change, and
 *      returns "Nothing has changed yet".
 *   2. The change is applied only when the SERVER saw the person's next message be a plain yes (`confirmed`, from
 *      src/lib/ai-confirm.ts, passed in the trusted context and never as a tool argument), AND this call describes
 *      exactly the pending plan, AND the event is still as it was when the preview was made.
 *
 * It follows the Calendar's own rules: an invoiced, worked or work-order event cannot be cancelled (the same
 * taskDeleteProblem the Calendar uses), a cancelled task also leaves its project's steps, and a move that overlaps one
 * of the person's other unfinished events is held back until they say to go ahead.
 */
import { oneLine } from '@/lib/ai-input';
import { describeSlot, findConflicts, suggestFreeSlot } from '@/lib/ai-calendar';
import { buildChangePlan, canChangeEvents, describeDone, describePlan, type ChangeInput, type ChangePlan } from '@/lib/ai-event-change';
import { billedDeleteProblem, billedUpdateProblem } from '@/lib/time-entry-lock';
import { taskDeleteProblem } from '@/lib/task-links';
import type { ToolContext } from '@/lib/ai-runtime';
import { myCalendar } from '@/ai/agent-calendar-tool';
import { PENDING_COLLECTION, linksFor, matchesPending, toPending, type Pending } from '@/ai/agent-event-pending';
import type { DbLike } from '@/ai/agent-tools';

export type ChangeStatus = 'preview' | 'done' | 'refused';

const result = (status: ChangeStatus, message: string) => ({ success: status === 'done', status, message });

/** Why the plan cannot be carried out under the Calendar's own rules, or null. */
async function rulesProblem(db: DbLike, ctx: ToolContext, plan: ChangePlan, data: Record<string, any>, now: Date): Promise<string | null> {
  const userId = ctx.userId as string;
  const orgId = ctx.orgId as string;
  if (plan.action === 'cancel') {
    const blocked = billedDeleteProblem(data, 'activity') ?? taskDeleteProblem(await linksFor(db, orgId, plan.eventId, data));
    return blocked ? `${blocked} Nothing was cancelled.` : null;
  }
  const to = plan.to as { start: Date; end: Date };
  const blocked = billedUpdateProblem(data, { start: to.start, end: to.end }, 'activity');
  if (blocked) return `${blocked} Nothing was moved.`;
  if (plan.allowDoubleBooking) return null;
  const others = (await myCalendar(db, userId, orgId)).filter((item) => item.id !== plan.eventId);
  const clashes = findConflicts(others, to.start, to.end);
  if (clashes.length === 0) return null;
  const list = clashes.slice(0, 3).map((item) => `"${item.title}" (${describeSlot(item.start, item.end, ctx.timeZone)})`).join(', ');
  const minutes = Math.round((to.end.getTime() - to.start.getTime()) / 60_000);
  const free = suggestFreeSlot(others, to.start, minutes, ctx.timeZone, now);
  const offer = free ? ` The next free time of that length is ${describeSlot(free.start, free.end, ctx.timeZone)}.` : '';
  return `That overlaps ${list}. Nothing was moved.${offer} Tell the user, and offer that time or another; only if they say to move it anyway, call changeEvent again with allowDoubleBooking set to true.`;
}

/** Takes a cancelled task's step out of its project, as the Calendar's delete does. Returns a note when that failed. */
async function removeProjectStep(db: DbLike, orgId: string, data: Record<string, any>): Promise<string> {
  if (!data.projectId || data.projectId === 'inbox' || !data.stepId) return '';
  try {
    const projectRef = db.collection('projects').doc(String(data.projectId));
    const project = await projectRef.get();
    if (project.exists && project.data()?.orgId === orgId) {
      const steps = Array.isArray(project.data()?.steps) ? project.data().steps : [];
      await projectRef.update({ steps: steps.filter((step: any) => step?.id !== data.stepId) });
    }
    return '';
  } catch {
    return ' Its step in the project could not be removed, so remove it on the Project Planner.';
  }
}

export async function changeEventHandler(
  db: DbLike | null,
  ctx: ToolContext,
  input: ChangeInput,
  opts: { confirmed?: boolean; turnStartedAt?: Date; now?: Date } = {}
) {
  const now = opts.now ?? new Date();
  if (!ctx.userId || !ctx.orgId) return result('refused', 'User or workspace not authenticated, so nothing was changed.');
  if (!canChangeEvents(ctx.accessLevel)) return result('refused', 'Your role can view this workspace but not change events. Ask an editor or administrator.');
  if (!db) return result('refused', 'The database is not available, so nothing was changed.');
  const userId = ctx.userId;
  const orgId = ctx.orgId;

  try {
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    const mine = (await myCalendar(db, userId, orgId)).find((item) => item.id === eventId);
    // Only the person's own scheduled events are in this list, so another person's event, another workspace's event
    // and an id that does not exist are all the same answer.
    if (!mine) return result('refused', 'That is not one of your own scheduled events, or it no longer exists. Read the calendar again (getCalendar) and use the id it gives.');

    const built = buildChangePlan(input, { title: mine.title, start: mine.start, end: mine.end, allDay: mine.allDay }, { timeZone: ctx.timeZone, now });
    if (!built.ok) return result('refused', built.error);
    const plan = built.plan;

    const ref = db.collection('tasks').doc(eventId);
    const snap = await ref.get();
    const data = (snap.exists ? snap.data() : null) as Record<string, any> | null;
    if (!data || data.orgId !== orgId) return result('refused', 'That event no longer exists, so nothing was changed.');

    // The Calendar's own rules are checked on the preview as well, so the user is never offered the impossible.
    const problem = await rulesProblem(db, ctx, plan, data, now);
    if (problem) return result('refused', problem);

    const fresh = toPending(plan, orgId, now);
    const pendingRef = db.collection(PENDING_COLLECTION).doc(userId);
    const saved = (await pendingRef.get()).data() as Partial<Pending> | undefined;

    // The preview must also be OLDER than this turn: a preview saved in this very turn cannot be confirmed by the yes
    // the user gave to an earlier one. With no turn start given, nothing is ever applied.
    const madeBeforeThisTurn = opts.turnStartedAt !== undefined && typeof saved?.createdAt === 'number' && saved.createdAt < opts.turnStartedAt.getTime();
    if (!(opts.confirmed === true && madeBeforeThisTurn && matchesPending(saved, fresh, now))) {
      // A first ask, a changed request, a stale preview, or a "yes" that did not answer this preview: show it and save it.
      await pendingRef.set(fresh);
      return result('preview', `${describePlan(plan, ctx.timeZone)} Show the user exactly this, including that nothing has changed yet, and ask whether to go ahead. Do not call changeEvent again until they have replied.`);
    }

    // Confirmed. The event must still be exactly as it was when the preview was made.
    if (mine.start.getTime() !== saved?.fromStart || mine.end.getTime() !== saved?.fromEnd) {
      await pendingRef.delete();
      return result('refused', 'That event changed after I showed you the plan, so nothing was changed. Ask again if you still want it.');
    }

    if (plan.action === 'cancel') {
      await ref.delete();
      await pendingRef.delete();
      const note = await removeProjectStep(db, orgId, data);
      return result('done', `${describeDone(plan, ctx.timeZone)}${note}`);
    }

    const to = plan.to as { start: Date; end: Date };
    await ref.update({ start: to.start, end: to.end, isScheduled: true, updatedBy: userId, updatedAt: now });
    await pendingRef.delete();
    return result('done', describeDone(plan, ctx.timeZone));
  } catch (error: any) {
    return result('refused', `The change could not be made, so assume nothing changed: ${oneLine(error?.message, 160)}`);
  }
}

