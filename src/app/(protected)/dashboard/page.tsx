"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";

/**
 * /dashboard — Papan Tugas (Stitch screen-ui/code(2).html).
 * Prototype port: three fixed Kanban columns with empty states, no task data wired yet (T-304).
 * ponytail: inline Tailwind + static columns instead of shared primitives and @dnd-kit drag-drop;
 * upgrade path = dnd-kit wiring (T-201/T-304), primitives extraction (T-005).
 */
export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("semua");

  const columns = [
    {
      key: "belum_dikerjakan",
      title: STRINGS.dashboard.columns.todo.title,
      dotClass: "bg-error",
      ariaCount: STRINGS.dashboard.columns.todo.ariaCount,
      dim: false,
    },
    {
      key: "sedang_dikerjakan",
      title: STRINGS.dashboard.columns.inProgress.title,
      dotClass: "bg-kanban-progress",
      ariaCount: STRINGS.dashboard.columns.inProgress.ariaCount,
      dim: false,
    },
    {
      key: "selesai",
      title: STRINGS.dashboard.columns.done.title,
      dotClass: "bg-kanban-complete",
      ariaCount: STRINGS.dashboard.columns.done.ariaCount,
      dim: true,
    },
  ];

  return (
    <>
      <AppHeader activePath="dashboard" />
      <main className="w-full pt-16">
        <div className="flex min-h-[calc(100vh-64px)] w-full flex-col bg-bg pb-margin-desktop">
          {/* Filter Bar */}
          <div className="sticky top-16 z-30 flex w-full flex-col items-start justify-between gap-4 border-b border-border-color bg-surface-container-lowest/90 px-margin-mobile py-4 backdrop-blur-md md:flex-row md:items-center lg:px-margin-desktop">
            <div className="flex w-full flex-col items-start gap-4 md:w-auto md:flex-row md:items-center">
              <h1 className="font-headline text-xl font-bold text-on-surface">{STRINGS.dashboard.title}</h1>
              <div className="hidden h-4 w-px bg-outline-variant md:block" />
              <div className="relative w-full md:w-64">
                <span
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  aria-label={STRINGS.dashboard.searchAria}
                  type="text"
                  placeholder={STRINGS.dashboard.searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-md border border-outline bg-surface py-2 pl-10 pr-4 font-body text-sm text-on-surface transition-colors placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="hide-scrollbar flex w-full items-center gap-3 overflow-x-auto pb-2 md:w-auto md:pb-0">
              <button
                aria-label={STRINGS.dashboard.filterAria}
                onClick={() => setFilterKey("semua")}
                className={`shrink-0 rounded-md px-4 py-1.5 font-label text-xs uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  filterKey === "semua"
                    ? "border border-primary bg-primary text-on-primary hover:bg-inverse-surface"
                    : "border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                }`}
              >
                {STRINGS.dashboard.filterAll}
              </button>
            </div>
          </div>

          {/* Kanban Board Canvas */}
          <div className="hide-scrollbar w-full flex-1 overflow-x-auto px-margin-mobile py-8 lg:px-margin-desktop">
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
              {columns.map((column) => (
                <section key={column.key} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b-2 border-outline pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${column.dotClass}`} />
                      <h2 className="font-headline text-lg font-semibold text-on-surface">
                        {column.title}
                      </h2>
                    </div>
                    <span
                      aria-label={column.ariaCount}
                      className="rounded bg-surface-container-high px-2 py-1 font-label text-xs text-on-surface-variant"
                    >
                      0
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div
                      className={`flex rounded-md border border-dashed border-outline p-4 ${
                        column.dim ? "opacity-75" : ""
                      }`}
                    >
                      <p className="font-body text-sm text-on-surface-variant">
                        {STRINGS.dashboard.emptyColumn}
                      </p>
                    </div>
                  </div>

                  <button
                    aria-label={STRINGS.dashboard.addTaskAriaLabel(column.title)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-outline py-3 font-body text-sm font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      add
                    </span>
                    {STRINGS.dashboard.addTask}
                  </button>
                </section>
              ))}
            </div>

            {/* Zero-task CTA (DESIGN §4.2) */}
            <div className="mt-10 flex flex-col items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center">
              <h2 className="font-headline text-lg font-semibold text-on-surface">
                {STRINGS.dashboard.ctaTitle}
              </h2>
              <p className="max-w-md font-body text-sm text-on-surface-variant">
                {STRINGS.dashboard.ctaBody}
              </p>
              <Link
                href="/chat"
                className="rounded-md bg-primary px-6 py-3 font-button uppercase text-on-primary transition-colors duration-300 hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {STRINGS.dashboard.ctaLink}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <BottomNav activePath="dashboard" />
    </>
  );
}