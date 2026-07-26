"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthActionState = {
  error: string | null;
  message: string | null;
};

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. See .env.example.", message: null };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!email || password.length < 8) {
    return { error: "Email and a password of at least 8 characters are required.", message: null };
  }

  const supabase = await createServerSupabaseClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || undefined },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { error: error.message, message: null };
  return {
    error: null,
    message: "Check your email to confirm your account, then sign in.",
  };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. See .env.example.", message: null };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/projects");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message, message: null };
  redirect(next.startsWith("/") ? next : "/projects");
}

export async function signOutAction(): Promise<void> {
  const { cookies } = await import("next/headers");
  const { DEMO_SESSION_COOKIE } = await import("@/lib/demo/constants");
  const { clearDemoStore } = await import("@/lib/demo/store");
  const jar = await cookies();
  if (jar.get(DEMO_SESSION_COOKIE)?.value) {
    jar.delete(DEMO_SESSION_COOKIE);
    await clearDemoStore();
    redirect("/");
  }
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. See .env.example.", message: null };
  }
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required.", message: null };
  const supabase = await createServerSupabaseClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message, message: null };
  return {
    error: null,
    message: "If that email exists, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. See .env.example.", message: null };
  }
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", message: null };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, message: null };
  redirect("/projects");
}
