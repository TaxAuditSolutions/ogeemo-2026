/**
 * Duration provenance for Activity Manager events (Tasks/Events).
 *
 * Model (see docs/time-billing-model.md):
 * - 'sessions'  -> duration is actual worked time (sum of Time Sessions / running timer)
 * - 'scheduled' -> duration is only the planned start/end span; no session worked yet
 * - 'manual'    -> duration was entered directly (e.g. HR clock-time entry)
 *
 * Explicit durationSource always wins. Legacy documents written before the
 * field existed fall back to a heuristic: sessions present -> 'sessions',
 * scheduled but sessionless -> 'scheduled', otherwise 'manual'.
 */
export type DurationSource = 'sessions' | 'scheduled' | 'manual';

export interface DurationSourceInput {
  durationSource?: DurationSource | null;
  isScheduled?: boolean;
  sessions?: Array<{ durationSeconds?: number }> | null;
}

export function resolveDurationSource(event: DurationSourceInput): DurationSource {
  const explicit = event.durationSource;
  if (explicit === 'sessions' || explicit === 'scheduled' || explicit === 'manual') {
    return explicit;
  }
  if (event.sessions && event.sessions.length > 0) {
    return 'sessions';
  }
  if (event.isScheduled) {
    return 'scheduled';
  }
  return 'manual';
}

/** True when the event's duration is only a planned schedule span (not yet worked). */
export function isScheduledPlaceholder(event: DurationSourceInput): boolean {
  return resolveDurationSource(event) === 'scheduled';
}

export interface DurationComputationInput {
  /** Logged Time Sessions (actual worked segments). */
  sessions: Array<{ durationSeconds?: number }>;
  /** Seconds elapsed on a still-running timer for this event. */
  elapsedSeconds: number;
  /** Planned start/end span in seconds, or 0 when unavailable/all-day. */
  scheduledSpanSeconds: number;
}

export interface ComputedDuration {
  durationSeconds: number;
  source: DurationSource | null;
}

/**
 * Single source of truth for an Activity's duration and its provenance.
 * - Actual work (sessions and/or running timer) always wins.
 * - The scheduled span is only used as a labelled placeholder when no work
 *   has been recorded yet; source 'scheduled' marks it non-billable.
 * - Zero duration has no source (nothing to bill, nothing to show).
 */
export function computeDurationAndSource(input: DurationComputationInput): ComputedDuration {
  const hasActualWork = input.sessions.length > 0 || input.elapsedSeconds > 0;
  if (hasActualWork) {
    const worked = input.sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) + input.elapsedSeconds;
    return { durationSeconds: worked, source: worked > 0 ? 'sessions' : null };
  }
  if (input.scheduledSpanSeconds > 0) {
    return { durationSeconds: input.scheduledSpanSeconds, source: 'scheduled' };
  }
  return { durationSeconds: 0, source: null };
}
