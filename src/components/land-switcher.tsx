"use client";

import { useEffect, useRef, useState } from "react";
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
 * the browser client (anon key + RLS), shows the active land check-marked.
 * ponytail: no outside-click handling (closes on selection/route only);
 * upgrade path = headless-listbox dropdown when Airtable adds a menu component.
 */
export function LandSwitcher() {
  const [open, setOpen] = useState(false);
  const [lands, setLands] = useState<LandOption[] | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("lands")
      .select("id, name, is_active")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLands([]);
          return;
        }
        setLands(data as LandOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeLand = lands?.find((land) => land.is_active);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={STRINGS.header.landSwitcherAria}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded border border-outline px-3 py-1.5 font-label text-sm uppercase transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          yard
        </span>
        <span className="max-w-32 truncate">
          {activeLand?.name ?? STRINGS.header.landSwitcher}
        </span>
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={STRINGS.header.landSwitcherAria}
          className="absolute left-0 top-full z-40 mt-2 w-56 rounded-md border border-outline-variant bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/0.08)]"
        >
          {lands === null ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : lands.length === 0 ? (
            <div className="px-3 py-2">
              <p className="font-body text-sm text-on-surface-variant">
                {STRINGS.header.landSwitcherEmpty}
              </p>
            </div>
          ) : (
            lands.map((land) => (
              <button
                key={land.id}
                type="button"
                role="option"
                aria-selected={land.is_active}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-symbols-outlined text-sm text-on-surface-variant" aria-hidden="true">
                  yard
                </span>
                <span className="flex-1 truncate">{land.name}</span>
                {land.is_active ? (
                  <span
                    aria-label={STRINGS.header.landSwitcherCheckAria}
                    className="material-symbols-outlined text-sm text-primary"
                  >
                    check
                  </span>
                ) : null}
              </button>
            ))
          )}
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
        </div>
      ) : null}
    </div>
  );
}
