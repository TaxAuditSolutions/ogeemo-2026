/**
 * A small per-user rate limiter for the AI endpoints (pure; see tests/ai-rate-limit.test.ts).
 *
 * Every AI request is billed, so a signed-in user (or a script using their session) must not be able to send
 * hundreds a minute. The counts live in memory, so on a host that runs several instances each keeps its own
 * count: it is a brake on runaway use, not an exact quota.
 */
export interface RateLimiter {
  check(key: string): { ok: true } | { ok: false; retryAfterSeconds: number };
}

export function createRateLimiter(options: { max: number; windowMs: number; now?: () => number }): RateLimiter {
  const { max, windowMs } = options;
  const clock = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return {
    check(key: string) {
      const now = clock();
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      // Keep the map from growing without end: drop users with nothing recent.
      if (hits.size > 5000) {
        for (const [name, times] of hits) {
          if (times.every((time) => now - time >= windowMs)) hits.delete(name);
        }
      }
      return { ok: true };
    },
  };
}
