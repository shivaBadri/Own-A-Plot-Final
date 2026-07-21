"use client";

import { useEffect } from "react";

/**
 * Global error boundary. Without this, an unhandled render error — a Neon cold
 * start timing out mid-query, say — shows the raw Next.js error screen in
 * production. This keeps the site in its own language and offers a retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center bg-cream">
      <div className="container-page">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-6 max-w-3xl font-serif text-h1 leading-[1.05]">
          The page could not be loaded.
        </h1>
        <p className="prose-max mt-8 text-body text-muted">
          This is usually momentary. Try again — and if it persists, the team has
          been notified.
        </p>
        <button type="button" onClick={reset} className="btn-luxury mt-12">
          Try Again
        </button>
      </div>
    </div>
  );
}
