"use client";

import "./globals.css";

/**
 * Last-resort boundary for failures in the root layout itself. It replaces the
 * whole document, so it must render <html> and <body> and cannot depend on
 * anything from the layout it's standing in for.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-600">
            WorkForge hit an unexpected error. Please reload the page.
          </p>
          <button onClick={reset} className="btn-primary mt-6">
            Reload
          </button>
          {error.digest && (
            <p className="mt-6 text-xs text-slate-400">
              Reference: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
