"use client";

import { startDemoSessionAction } from "@/lib/demo/session";
import { DEMO_TEST_ID } from "@/lib/demo/constants";

export function DemoLoginButton({ next = "/projects" }: { next?: string }) {
  return (
    <form action={startDemoSessionAction} className="auth-form auth-form--demo">
      <input type="hidden" name="next" value={next} />
      <p className="atlas-muted">
        No Supabase? Enter test mode with a fixed local writer id. Data stays in this browser
        (cookies) and is not synced to a server database.
      </p>
      <button type="submit" className="learn-cta">
        Continue as Test ID ({DEMO_TEST_ID})
      </button>
    </form>
  );
}
