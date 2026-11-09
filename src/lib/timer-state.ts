/**
 * The running timer (pure; see tests/timer-state.test.ts).
 *
 * The timer lives in the browser's storage so it survives a page change. Three screens read it, and each
 * worked out the elapsed time on its own. One rule is kept here: elapsed is the time since it started,
 * less the time it was paused. Only one timer can run at a time: starting another used to overwrite the
 * first, and everything it had counted was lost.
 */

export interface TimerState {
  eventId: string;
  notes: string;
  isActive: boolean;
  isPaused: boolean;
  /** Epoch milliseconds. */
  startTime: number;
  pauseTime: number | null;
  /** Seconds spent paused before the current pause. */
  totalPausedDuration: number;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Reads stored timer text. Anything that is not a well-formed timer (corrupt, hand-edited) is null, never a throw. */
export function parseTimerState(raw: string | null | undefined): TimerState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TimerState> | null;
    if (!value || typeof value !== 'object') return null;
    if (typeof value.eventId !== 'string' || !value.eventId) return null;
    if (!finite(value.startTime)) return null;
    return {
      eventId: value.eventId,
      notes: typeof value.notes === 'string' ? value.notes : '',
      isActive: value.isActive === true,
      isPaused: value.isPaused === true,
      startTime: value.startTime,
      pauseTime: finite(value.pauseTime) ? value.pauseTime : null,
      totalPausedDuration: finite(value.totalPausedDuration) && value.totalPausedDuration > 0 ? value.totalPausedDuration : 0,
    };
  } catch {
    return null;
  }
}

/** Whole seconds worked: since the start, less all paused time. Never negative, 0 when not active. */
export function timerElapsedSeconds(state: TimerState | null | undefined, now: number = Date.now()): number {
  if (!state || !state.isActive) return 0;
  const pausedNow = state.isPaused && state.pauseTime !== null ? Math.max(0, Math.floor((now - state.pauseTime) / 1000)) : 0;
  const elapsed = Math.floor((now - state.startTime) / 1000) - state.totalPausedDuration - pausedNow;
  return elapsed > 0 ? elapsed : 0;
}

/** When a session ends: while paused it ended when the pause began, not now. */
export function sessionEndMs(state: TimerState, now: number = Date.now()): number {
  return state.isPaused && state.pauseTime !== null ? state.pauseTime : now;
}

/** Why another timer cannot start, or null. A running timer is never replaced. */
export function startTimerBlock(existing: TimerState | null | undefined, eventId: string): string | null {
  if (!existing || !existing.isActive) return null;
  const sameEvent = existing.eventId === eventId;
  const name = existing.notes ? `"${existing.notes}"` : 'another activity';
  return sameEvent
    ? 'This timer is already running.'
    : `A timer is already running on ${name}. Log or finish it before starting another, or its time would be lost.`;
}

/** A saved session needs a real length; hours and minutes may arrive blank or as text. */
export function sessionSecondsFrom(hours: unknown, minutes: unknown): { ok: true; seconds: number } | { ok: false; error: string } {
  const h = hours === '' || hours === null || hours === undefined ? 0 : Number(hours);
  const m = minutes === '' || minutes === null || minutes === undefined ? 0 : Number(minutes);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return { ok: false, error: 'Hours and minutes must be zero or more.' };
  if (!Number.isInteger(h) || !Number.isInteger(m)) return { ok: false, error: 'Use whole hours and whole minutes.' };
  if (m > 59) return { ok: false, error: 'Minutes must be 59 or less. Add the extra to the hours.' };
  const seconds = h * 3600 + m * 60;
  if (seconds <= 0) return { ok: false, error: 'A session must be at least one minute.' };
  if (seconds > 24 * 3600) return { ok: false, error: 'A single session cannot be longer than 24 hours.' };
  return { ok: true, seconds };
}
