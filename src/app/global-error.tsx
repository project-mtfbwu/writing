"use client";

import { useEffect } from "react";
import { clientLog } from "@/lib/logging/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    clientLog.error("Global route error", { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="project-page">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error. Your content was not silently discarded.</p>
          <button type="button" onClick={reset}>
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
