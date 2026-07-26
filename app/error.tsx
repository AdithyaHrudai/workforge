"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. In production Next replaces the real message with
 * an opaque `digest`, so nothing sensitive reaches the browser — we surface that
 * digest instead, because it's what makes a user's report traceable in the logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real reporter (Sentry etc.) when one is configured.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <p className="text-sm font-semibold text-brand-600">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        The error has been logged. You can retry, or head back to your dashboard.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          Go to dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-slate-400">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
