/**
 * Server logging abstraction — strips sensitive keys before console output.
 * Swap implementation later for a hosted sink without changing call sites.
 */
const SENSITIVE = /(password|token|authorization|cookie|secret|service.?role|api.?key|email)/i;

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    if (SENSITIVE.test(value)) return "[redacted]";
    return value.length > 800 ? `${value.slice(0, 800)}…` : value;
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

export const serverLog = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[writing:server] ${message}`, meta ? sanitize(meta) : "");
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[writing:server] ${message}`, meta ? sanitize(meta) : "");
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[writing:server] ${message}`, meta ? sanitize(meta) : "");
  },
};
