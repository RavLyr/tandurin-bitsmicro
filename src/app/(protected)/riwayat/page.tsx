"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";

/**
 * /riwayat — Consultation history (Stitch screen-ui/code(5).html).
 * Prototype port: list + search with empty state; conversation data wiring lands in T-403.
 * ponytail: search is static (no query yet); upgrade path = T-403 fetches conversations + filters.
 */
export default function RiwayatPage() {
  const [search, setSearch] = useState("");

  void search; // wired to filtering by conversations in T-403

  return (
    <>
      <AppHeader activePath="riwayat" />
      <main className="w-full pt-16">
        <div className="flex w-full flex-col px-margin-mobile py-8 md:px-margin-desktop md:py-16">
          <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="flex flex-col gap-4">
              <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-on-surface md:text-5xl">
                {STRINGS.riwayat.title}
              </h1>
              <p className="max-w-2xl font-body text-base text-on-surface-variant md:text-lg">
                {STRINGS.riwayat.subtitle}
              </p>
            </div>
            <div className="relative w-full flex-shrink-0 md:w-[320px]">
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-on-surface-variant"
                aria-hidden="true"
              >
                search
              </span>
              <input
                aria-label={STRINGS.riwayat.searchAria}
                type="text"
                placeholder={STRINGS.riwayat.searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-full border-none bg-surface-container-high py-3 pl-12 pr-4 font-body text-on-surface outline-none transition-shadow placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-6 rounded-xl bg-surface-container-highest p-10 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant" aria-hidden="true">
                history
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="font-headline text-xl font-semibold text-on-surface">
                  {STRINGS.riwayat.emptyTitle}
                </h2>
                <p className="font-body text-sm text-on-surface-variant">
                  {STRINGS.riwayat.emptyBody}
                </p>
              </div>
              <Link
                href="/chat"
                className="flex items-center gap-2 rounded bg-primary px-6 py-3 font-button uppercase text-on-primary transition-all duration-300 hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {STRINGS.riwayat.cta}
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-14 flex justify-center">
            <button
              type="button"
              className="font-button uppercase text-on-surface underline underline-offset-4 transition-colors hover:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STRINGS.riwayat.loadMore}
            </button>
          </div>
        </div>
      </main>
      <BottomNav activePath="riwayat" />
    </>
  );
}