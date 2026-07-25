"use client";

import { useEffect, useRef } from "react";
import { createUserDataStore } from "@/lib/storage/local";
import { loadLearningProgress } from "@/lib/learning/progress";
import { migrateAnonymousUserDataAction } from "@/lib/projects/migrate-action";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const FLAG = "writing.migration.anonymous.v1";

/** After sign-in, merge anonymous local progress without duplicating remote rows. */
export function MigrateAnonymousOnMount() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!isSupabaseConfigured()) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FLAG) === "done") return;

    void (async () => {
      const store = createUserDataStore();
      const [bookmarks, notes] = await Promise.all([store.listBookmarks(), store.listNotes()]);
      const progress = loadLearningProgress();
      const result = await migrateAnonymousUserDataAction({ bookmarks, notes, progress });
      if (!result.error && result.migrated) {
        window.localStorage.setItem(FLAG, "done");
      }
    })();
  }, []);

  return null;
}
