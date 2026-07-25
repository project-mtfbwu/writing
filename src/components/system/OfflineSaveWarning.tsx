"use client";

import { useEffect, useState } from "react";
import { clientLog } from "@/lib/logging/client";

/** Visible when the browser reports offline — saves may not reach the server. */
export function OfflineSaveWarning() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      const next = !navigator.onLine;
      setOffline(next);
      if (next) clientLog.warn("Browser offline — remote saves may fail");
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="system-banner system-banner--warn" role="status" aria-live="polite">
      You appear offline. Local edits may not save to the server until you reconnect. Use Export
      if you need a backup copy.
    </div>
  );
}
