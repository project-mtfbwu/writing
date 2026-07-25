import { z } from "zod";

/**
 * Public (browser-safe) Supabase config.
 * Never put SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC_* vars.
 */
export const PublicSupabaseEnvSchema = z.object({
  url: z.string().url(),
  publishableKey: z.string().min(1),
});

export type PublicSupabaseEnv = z.infer<typeof PublicSupabaseEnvSchema>;

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) return null;
  const parsed = PublicSupabaseEnvSchema.safeParse({ url, publishableKey });
  return parsed.success ? parsed.data : null;
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return env;
}

/** Server-only service role — never import this module from client components. */
export const ServiceRoleEnvSchema = z.object({
  url: z.string().url(),
  serviceRoleKey: z.string().min(1),
});

export function readServiceRoleEnv(): z.infer<typeof ServiceRoleEnvSchema> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  const parsed = ServiceRoleEnvSchema.safeParse({ url, serviceRoleKey });
  return parsed.success ? parsed.data : null;
}

export function isSupabaseConfigured(): boolean {
  return readPublicSupabaseEnv() !== null;
}
