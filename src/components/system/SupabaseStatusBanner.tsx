"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Soft outage banner — probes Auth health once. Never logs keys.
 */
export function SupabaseStatusBanner() {
  const [outage, setOutage] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    async function probe() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.getSession();
        if (!cancelled && error && /fetch|network|failed/i.test(error.message)) {
          setOutage(true);
        }
      } catch {
        if (!cancelled) setOutage(true);
      }
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!outage) return null;
  return (
    <div className="system-banner system-banner--error" role="alert">
      Auth/database may be unreachable. Retry in a moment, or keep working with local reading and
      notes.
      <button type="button" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}
