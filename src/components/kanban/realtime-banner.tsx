"use client";

import { STRINGS } from "@/lib/i18n";

/**
 * Realtime connectivity banner (T-304, F-06): amber notice while the realtime
 * channel is disconnected (chain: supabase channel → polling fallback).
 */
export function RealtimeBanner({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full items-center justify-center gap-2 bg-kanban-progress/15 px-4 py-2 font-label text-xs font-semibold uppercase tracking-wide text-[#9a6a1a]"
    >
      <span
        className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#E3A334]"
        aria-hidden="true"
      />
      {STRINGS.kanban.realtimeBanner}
    </div>
  );
}