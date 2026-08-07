"use client";

import { STRINGS } from "@/lib/i18n";

interface CropRow {
  crop?: unknown;
  match_percent?: unknown;
  reason?: unknown;
}

/**
 * Recommendation card (F-03, metadata.type "recommendation"): crop suggestions
 * from the agent — each row shows the crop, its Kecocokan badge (match %), and
 * the reason string. Falls back gracefully to nothing when malformed.
 */
export function RecommendationCard({ data }: { data: unknown }) {
  const rows = (Array.isArray(data) ? data : []) as CropRow[];
  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-outline-variant bg-surface p-4">
      <h3 className="font-headline text-sm font-semibold text-on-surface">
        {STRINGS.chat.recommendationTitle}
      </h3>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((crop, index) => {
          const name = typeof crop.crop === "string" ? crop.crop : `#${index + 1}`;
          const percent = typeof crop.match_percent === "number" ? crop.match_percent : null;
          const reason = typeof crop.reason === "string" ? crop.reason : "";

          return (
            <li key={index} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-headline text-sm font-semibold text-on-surface">{name}</p>
                {reason ? <p className="font-body text-xs text-on-surface-variant">{reason}</p> : null}
              </div>
              {percent != null ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-label text-xs text-primary-deep">
                  {STRINGS.chat.matchBadge(percent)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}