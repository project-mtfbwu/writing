import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requirePublicSupabaseEnv } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const env = requirePublicSupabaseEnv();
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
