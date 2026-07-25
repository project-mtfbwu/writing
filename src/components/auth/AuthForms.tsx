"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const initial: AuthActionState = { error: null, message: null };

export function SignInForm({ next = "/projects" }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state.error ? <p className="auth-error">{state.error}</p> : null}
      <p className="auth-meta">
        <Link href="/signup">Create account</Link> ·{" "}
        <Link href="/reset-password">Reset password</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);
  return (
    <form action={action} className="auth-form">
      <label>
        Display name
        <input type="text" name="displayName" autoComplete="nickname" />
      </label>
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
      {state.error ? <p className="auth-error">{state.error}</p> : null}
      {state.message ? <p className="auth-ok">{state.message}</p> : null}
      <p className="auth-meta">
        <Link href="/login">Already have an account?</Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);
  return (
    <form action={action} className="auth-form">
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      {state.error ? <p className="auth-error">{state.error}</p> : null}
      {state.message ? <p className="auth-ok">{state.message}</p> : null}
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <form action={action} className="auth-form">
      <label>
        New password
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
      {state.error ? <p className="auth-error">{state.error}</p> : null}
    </form>
  );
}

export function AuthConfigNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <aside className="auth-notice" role="status">
      <p>
        Supabase credentials are not configured in this environment. Add these to{" "}
        <code>.env.local</code> (never commit that file):
      </p>
      <ul>
        <li>
          <code>NEXT_PUBLIC_SUPABASE_URL</code>
        </li>
        <li>
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
        </li>
      </ul>
      <p>
        Optional server-only: <code>SUPABASE_SERVICE_ROLE_KEY</code> (never expose to the browser).
        See <code>.env.example</code>. Apply migrations under <code>supabase/migrations</code>.
      </p>
    </aside>
  );
}
