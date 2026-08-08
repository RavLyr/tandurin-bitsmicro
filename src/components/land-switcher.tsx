"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export interface LandOption {
  id: string;
  name: string;
  is_active: boolean;
}

/**
 * Land switcher dropdown (DESIGN §3 nav model): fetches the user's lands via
 * the browser client (anon key + RLS) and shows the active land with a clear
 * "Lahan aktif" label. When the user has no land yet, the trigger reads
 * "Pilih Lahan" and the dropdown shows an empty-state with a CTA to /lahan
 * (F-07 precondition).
 *
 * ponytail: no outside-click handling (closes on selection/route only);
 * upgrade path = headless-listbox dropdown when Airtable adds a menu component.
 */
export function LandSwitcher() {
  const [open, setOpen] = useState(false);
  const [lands, setLands] = useState<LandOption[] | null>(null);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("lands")
      .select("id, name, is_active")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setLands([]);
          return;
        }
        setLands((data ?? []) as LandOption[]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeLand = lands?.find((land) => land.is_active);

  const switchLand = async (land: LandOption) => {
    if (land.is_active || switching) return;
    setSwitching(true);
    try {
      const res = await fetch(`/api/lands/active/${land.id}`, { method: "PATCH" });
      if (res.ok) load();
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={STRINGS.header.landSwitcherAria}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded border border-outline px-3 py-1.5 font-label text-sm uppercase transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">
          yard
        </span>
        <span className="flex flex-col items-start gap-0 leading-tight">
          {activeLand ? (
            <span className="text-[10px] not-italic normal-case tracking-normal text-on-surface-variant">
              {STRINGS.header.landSwitcherActiveLabel}
            </span>
          ) : null}
          <span className="max-w-32 truncate normal-case tracking-normal text-on-surface">
            {activeLand?.name ?? STRINGS.header.landSwitcher}
          </span>
        </span>
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={STRINGS.header.landSwitcherAria}
          className="absolute left-0 top-full z-40 mt-2 w-64 rounded-md border border-outline-variant bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/0.08)]"
        >
          {lands === null ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : lands.length === 0 ? (
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="font-body text-sm font-semibold text-on-surface">
                {STRINGS.header.landSwitcherEmpty}
              </p>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {STRINGS.header.landSwitcherEmptyHint}
              </p>
              <Link
                href="/lahan"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 font-label text-sm font-semibold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
                {STRINGS.header.landSwitcherEmptyCta}
              </Link>
            </div>
          ) : (
            <>
              {lands.map((land) => (
                <button
                  key={land.id}
                  type="button"
                  role="option"
                  aria-selected={land.is_active}
                  onClick={() => void switchLand(land)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className="material-symbols-outlined text-sm text-on-surface-variant" aria-hidden="true">
                    yard
                  </span>
                  <span className="flex flex-1 flex-col gap-0 leading-tight">
                    {land.is_active ? (
                      <span className="text-[10px] normal-case tracking-normal text-primary">
                        {STRINGS.header.landSwitcherActiveLabel}
                      </span>
                    ) : null}
                    <span className="truncate">{land.name}</span>
                  </span>
                  {land.is_active ? (
                    <span
                      aria-label={STRINGS.header.landSwitcherCheckAria}
                      className="material-symbols-outlined text-sm text-primary"
                    >
                      check
                    </span>
                  ) : null}
                </button>
              ))}
              <div className="border-t border-outline-variant">
                <Link
                  href="/lahan"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 font-body text-sm font-semibold text-primary transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    tune
                  </span>
                  {STRINGS.header.landSwitcherManage}
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}