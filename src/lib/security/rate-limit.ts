/** Simple per-key write rate limit for server actions (in-process). */
const hits = new Map<string, number[]>();

export function assertWriteRateLimit(key: string, limit = 30, windowMs = 60_000): void {
  const now = Date.now();
  const windowHits = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (windowHits.length >= limit) {
    throw new Error("Too many write requests. Wait a moment and retry.");
  }
  windowHits.push(now);
  hits.set(key, windowHits);
}
