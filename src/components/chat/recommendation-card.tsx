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
 *
 * Two actions (T-024):
 *  - "Buat Proyek": turns the recommendation into its own project. The parent
 *    passes the crop list up to the chat client, which sends it to the route as
 *    `project_crops` so the orchestrator can build the project deterministically.
 *  - "Buat Jadwal": confirms the plan so the orchestrator generates the task
 *    schedule (T-301/T-302). Only shown when the parent has an `onConfirm`
 *    handler (i.e. this recommendation is the live, unconfirmed last one).
 */
export function RecommendationCard({
  data,
  disabled,
  onCreateProject,
  onConfirm,
}: {
  data: unknown;
  disabled?: boolean;
  onCreateProject?: (crops: string[]) => void;
  onConfirm?: () => void;
}) {
  const rows = (Array.isArray(data) ? data : []) as CropRow[];
  if (rows.length === 0) return null;

  const crops = rows
    .map((r) => r.crop)
    .filter((c): c is string => typeof c === "string" && c.trim() !== "");

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

      {onCreateProject && crops.length > 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCreateProject(crops)}
          title={STRINGS.chat.createProjectHint}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary px-4 py-2.5 font-label text-sm font-bold uppercase text-on-primary transition-colors hover:bg-primary-strong focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            park
          </span>
          {STRINGS.chat.createProject}
        </button>
      ) : null}

      {onConfirm ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          title={STRINGS.chat.createScheduleHint}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 font-label text-sm font-bold uppercase text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            calendar_month
          </span>
          {STRINGS.chat.createSchedule}
        </button>
      ) : null}
    </section>
  );
}