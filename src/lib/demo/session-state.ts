import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_SESSION_COOKIE, DEMO_TEST_ID, DEMO_USER_ID } from "@/lib/demo/constants";

export async function isDemoSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DEMO_SESSION_COOKIE)?.value === DEMO_TEST_ID;
}

/** Demo writing is offered when Supabase is missing. */
export function isDemoWritingAvailable(): boolean {
  return !isSupabaseConfigured();
}

export async function requireDemoSession(): Promise<{ userId: string }> {
  if (!(await isDemoSession())) {
    throw new Error("Demo session required.");
  }
  return { userId: DEMO_USER_ID };
}
