/** Shared setup for the changeEvent tests. Test helper only. */
import { readToolContext } from '../src/lib/ai-runtime';

/** Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC). */
export const NOW = new Date('2026-11-11T15:00:00Z');
export const at = (iso: string) => new Date(iso);
export const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

export const seed = () => ({
  users: { u1: {}, u2: {} },
  tasks: {
    e1: { orgId: 'orgA', userId: 'u1', title: 'Team call', isScheduled: true, status: 'todo', start: at('2026-11-12T20:00:00Z'), end: at('2026-11-12T21:00:00Z') },
    e2: { orgId: 'orgA', userId: 'u1', title: 'Dentist', isScheduled: true, status: 'todo', start: at('2026-11-12T22:00:00Z'), end: at('2026-11-12T23:00:00Z') },
    eOther: { orgId: 'orgA', userId: 'u2', title: 'Their meeting', isScheduled: true, status: 'todo', start: at('2026-11-12T20:00:00Z'), end: at('2026-11-12T21:00:00Z') },
    eElsewhere: { orgId: 'orgB', userId: 'u1', title: 'Other workspace', isScheduled: true, status: 'todo', start: at('2026-11-12T20:00:00Z'), end: at('2026-11-12T21:00:00Z') },
    eBilled: { orgId: 'orgA', userId: 'u1', title: 'Invoiced work', isScheduled: true, status: 'todo', start: at('2026-11-13T15:00:00Z'), end: at('2026-11-13T16:00:00Z'), billedInvoiceId: 'inv1', duration: 3600, durationSource: 'sessions' },
    eWorked: { orgId: 'orgA', userId: 'u1', title: 'Worked session', isScheduled: true, status: 'todo', start: at('2026-11-13T17:00:00Z'), end: at('2026-11-13T18:00:00Z'), duration: 1800, durationSource: 'sessions', sessions: [{ id: 's', durationSeconds: 1800 }] },
    eStep: { orgId: 'orgA', userId: 'u1', title: 'Project step', isScheduled: true, status: 'todo', projectId: 'p1', stepId: 'step_eStep', start: at('2026-11-14T15:00:00Z'), end: at('2026-11-14T16:00:00Z') },
    eAllDay: { orgId: 'orgA', userId: 'u1', title: 'Holiday', isScheduled: true, status: 'todo', start: at('2026-11-16T05:00:00Z'), end: at('2026-11-17T04:59:00Z') },
    eWo: { orgId: 'orgA', userId: 'u1', title: 'Work order visit', isScheduled: true, status: 'todo', workOrderId: 'wo1', start: at('2026-11-18T15:00:00Z'), end: at('2026-11-18T16:00:00Z') },
  },
  projects: { p1: { orgId: 'orgA', name: 'Site', steps: [{ id: 'step_eStep', title: 'Project step' }, { id: 'other', title: 'Keep me' }] } },
  invoiceLineItems: {} as Record<string, any>,
  quoteLineItems: {} as Record<string, any>,
  workOrders: { wo1: { orgId: 'orgA', workOrderNumber: 'WO-1', status: 'scheduled' } },
  aiPendingChanges: {},
});

/**
 * The options for the user's NEXT turn after a preview: the server read a yes, and this turn began at `minutesLater`
 * (which must be after the preview was made, as it always is in a real conversation).
 */
export const nextTurn = (minutesLater: number, confirmed = true) => ({ confirmed, turnStartedAt: later(minutesLater - 0.5), now: later(minutesLater) });

export const ctx = (userId: string, accessLevel?: string) => readToolContext({ userId, orgId: 'orgA', accessLevel, timeZone: 'America/Toronto' });
export const editor = ctx('u1', 'editor');
export const move = (over: Record<string, any> = {}) => ({ eventId: 'e1', action: 'move' as const, startTime: '2026-11-12T16:00:00-05:00', ...over });
export const cancel = (eventId = 'e1') => ({ eventId, action: 'cancel' as const });
