/**
 * The rate limits for the AI endpoints, one limiter per kind of request so a burst of one kind (say, chat titles)
 * cannot use up another (images, which cost the most). The numbers are generous for a person and stop a script.
 */
import { createRateLimiter } from '@/lib/ai-rate-limit';

const MINUTE = 60_000;

/** Co-Pilot chat messages. */
export const assistantLimiter = createRateLimiter({ max: 30, windowMs: MINUTE });
/** Knowledge Base questions. */
export const knowledgeLimiter = createRateLimiter({ max: 30, windowMs: MINUTE });
/** Chat subject lines (one is requested per new thread). */
export const titleLimiter = createRateLimiter({ max: 20, windowMs: MINUTE });
/** Image generation: each call is billed per image. */
export const imageLimiter = createRateLimiter({ max: 6, windowMs: MINUTE });
/** The sandbox agent. */
export const sandboxLimiter = createRateLimiter({ max: 20, windowMs: MINUTE });

/** The message shown when a limit is hit. */
export function tooManyRequests(retryAfterSeconds: number): string {
  return `You are sending requests too quickly. Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'} and try again.`;
}
