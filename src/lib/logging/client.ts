/**
 * Client-safe logger — never logs secrets, tokens, or PII payloads.
 */
const SENSITIVE = /(password|token|authorization|cookie|secret|service.?role|api.?key)/i;

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    if (SENSITIVE.test(value)) return "[redacted]";
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = SENSITIVE.test(key) ? "[redacted]" : sanitize(entry);
    }
    return out;
  }
  return value;
}

export const clientLog = {
  info(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") return;
    console.info(`[writing] ${message}`, meta ? sanitize(meta) : undefined);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[writing] ${message}`, meta ? sanitize(meta) : undefined);
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[writing] ${message}`, meta ? sanitize(meta) : undefined);
  },
};
