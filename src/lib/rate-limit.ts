/**
 * Fixed-window rate limiter, in process memory.
 *
 * The enquiry endpoint is the only unauthenticated write on the site. Without a
 * limit, a single script can fill the enquiries table overnight. This is the
 * cheapest useful defence.
 *
 * HONEST CAVEAT: this counter lives in the Node process. On Vercel that means
 * it is per-serverless-instance, so a determined attacker spread across many
 * cold starts gets a higher effective ceiling. It stops casual abuse and bot
 * spray, which is what it is for. If enquiry volume ever justifies it, swap the
 * Map for Upstash Redis — the call signature below will not change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Stops the Map growing without bound on a long-lived server. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; the leftmost entry is the
 * original client. Falls back to a constant so the limiter degrades to a global
 * ceiling rather than to no limit at all.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
