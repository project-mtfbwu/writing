import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isDemoSession } from "@/lib/demo/session-state";
import { DEMO_USER_ID } from "@/lib/demo/constants";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type WritingAccess =
  | { mode: "demo"; userId: string }
  | {
      mode: "supabase";
      userId: string;
      user: User;
      supabase: SupabaseClient<Database>;
    };

/**
 * Auth gate for /projects pages and writing loads.
 * Demo cookie unlocks the full write surface without Supabase.
 */
export async function requireWritingAccess(nextPath: string): Promise<WritingAccess> {
  if (await isDemoSession()) {
    return { mode: "demo", userId: DEMO_USER_ID };
  }
  if (!isSupabaseConfigured()) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&reason=supabase-unconfigured`);
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return { mode: "supabase", userId: user.id, user, supabase };
}
