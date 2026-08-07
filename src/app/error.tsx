"use client";

import { useEffect } from "react";
import { STRINGS } from "@/lib/i18n";

/**
 * Root error boundary (renders inside root layout): Indonesian fallback UI
 * with a "Coba lagi" reset button (F-10, NFR resilience).
 */
export default function Error({
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
    <div className="flex min-h-screen items-center justify-center bg-bg p-margin-mobile">
      <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface p-8 text-center shadow-sm">
        <span className="material-symbols-outlined text-4xl text-error" aria-hidden="true">
          error
        </span>
        <h1 className="mt-4 font-headline text-xl font-semibold text-on-surface">
          {STRINGS.errors.defaultTitle}
        </h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          {STRINGS.errors.defaultBody}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 font-button text-on-primary transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STRINGS.errors.retry}
        </button>
      </div>
    </div>
  );
}