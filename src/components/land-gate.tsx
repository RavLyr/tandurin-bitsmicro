"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { STRINGS } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Land gate (F-07 precondition): blocks protected feature content until the
 * user has at least one land. While checking shows a skeleton; when no land
 * exists renders an empty-state card with a CTA to /lahan instead of children.
 *
 * ponytail: polls /api/lands once on mount (assumes lands are added/edited
 * on /lahan and the user re-enters the page); upgrade path = share a lands
 * context/store so the gate reacts to changes without navigation.
 */
export function LandGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "empty" | "ok">("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/lands")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: unknown[] } | null) => {
        if (cancelled) return;
        setState((json?.data?.length ?? 0) > 0 ? "ok" : "empty");
      })
      .catch(() => {
        // Fail open so a network blip never bricks the page.
        if (!cancelled) setState("ok");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div
        className="flex w-full flex-col gap-6 px-margin-mobile py-8 lg:px-margin-desktop"
        role="status"
        aria-live="polite"
        aria-label={STRINGS.landGate.loading}
      >
        <Skeleton className="h-6 w-52 rounded-md" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-8 px-margin-mobile py-14 lg:px-margin-desktop">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest px-8 py-10 text-center">
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            landscape
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="font-headline text-lg font-bold text-on-surface">
              {STRINGS.landGate.title}
            </h2>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant">
              {STRINGS.landGate.body}
            </p>
          </div>
          <Link
            href="/lahan"
            aria-label={STRINGS.landGate.ctaAria}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-label text-sm font-semibold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              add
            </span>
            {STRINGS.landGate.cta}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}