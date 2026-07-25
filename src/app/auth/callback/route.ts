import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/projects";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?reason=supabase-unconfigured", url.origin));
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectPath = next.startsWith("/") ? next : "/projects";
  if (redirectPath.includes("reset-password")) {
    return NextResponse.redirect(new URL("/reset-password?mode=update", url.origin));
  }
  return NextResponse.redirect(new URL(redirectPath, url.origin));
}
