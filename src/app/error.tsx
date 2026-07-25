"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clientLog } from "@/lib/logging/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    clientLog.error("Route error", { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <main className="project-page">
      <h1>Could not load this page</h1>
      <p className="atlas-muted">Try again, or return home. No sensitive details are shown here.</p>
      <button type="button" onClick={reset}>
        Retry
      </button>
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
