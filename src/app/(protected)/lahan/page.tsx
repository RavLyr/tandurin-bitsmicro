"use client";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";

/**
 * /lahan — My lands (Stitch screen-ui/code(7).html).
 * Prototype port: header hero + card grid with empty state; CRUD wiring lands in T-402.
 * ponytail: only empty state rendered (no land cards fully implemented); upgrade path = T-402.
 */
export default function LahanPage() {
  return (
    <>
      <AppHeader activePath="lahan" />
      <main className="w-full pt-16">
        {/* Header hero */}
        <div className="relative flex items-end justify-between bg-surface-container-low px-5 pb-12 pt-12 lg:px-16 lg:pt-16">
          <div className="flex flex-col gap-4">
            <span className="font-label relative z-10 text-xs uppercase tracking-[0.2em] text-primary">
              {STRINGS.lahan.eyebrow}
            </span>
            <h1 className="font-display relative z-10 -ml-2 text-4xl font-bold text-primary lg:text-5xl">
              {STRINGS.lahan.title}
            </h1>
          </div>
          <button
            type="button"
            className="relative z-10 flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-on-primary shadow-md transition-colors duration-300 hover:bg-surface-variant hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 lg:px-8 lg:py-4"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              add
            </span>
            {STRINGS.lahan.addLand}
          </button>
          {/* Decorative abstract shape */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 overflow-hidden" aria-hidden="true">
            <svg
              className="absolute -right-[200px] -top-[300px] h-[800px] w-[800px] text-surface-container opacity-50"
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M47.7,-57.2C59.6,-45.5,65.3,-27.1,68.5,-7.9C71.7,11.3,72.4,31.3,62.8,45.4C53.2,59.5,33.3,67.7,13.2,69.5C-6.9,71.3,-27.2,66.6,-43.3,55.1C-59.4,43.6,-71.4,25.2,-74.6,5.3C-77.8,-14.6,-72.2,-36.1,-58.5,-48.5C-44.8,-60.9,-22.4,-64.2,-2.1,-61.7C18.2,-59.2,35.8,-68.9,47.7,-57.2Z"
                fill="currentColor"
                transform="translate(100 100) scale(1.1)"
              />
            </svg>
          </div>
        </div>

        {/* Main grid */}
        <div className="relative z-20 -mt-8 px-5 py-12 lg:px-16">
          <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant" aria-hidden="true">
              landscape
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="font-headline text-xl font-semibold text-on-surface">
                {STRINGS.lahan.emptyTitle}
              </h2>
              <p className="font-body text-sm text-on-surface-variant">
                {STRINGS.lahan.emptyBody}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                add
              </span>
              {STRINGS.lahan.addLand}
            </button>
          </div>
        </div>

        <div className="h-8" />
      </main>
      <BottomNav activePath="lahan" />
    </>
  );
}