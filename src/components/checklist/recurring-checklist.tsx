"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { toast } from "@/components/ui/use-toast";
import { fetchWithAuthRetry } from "@/lib/fetch-with-retry";

export interface RecurringTemplate {
  id: string;
  project_id: string;
  project_name: string | null;
  title: string;
  description: string | null;
  category: "penyiraman" | "pemupukan" | "perawatan" | "pestisida";
  interval_days: number;
  time_of_day: string | null;
  created_at: string;
  updated_at: string;
  last_log: { scheduled_date: string; completed_at: string } | null;
}

export type RecurringState = "done" | "pending" | "overdue";

/** Today's date key (YYYY-MM-DD) in Asia/Jakarta — client-safe ISO split. */
export function jakartaTodayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Add whole days to a YYYY-MM-DD key without timezone drift. */
export function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${mm}-${dd}`;
}

/** A template is done when its latest log lands on `today`; overdue when the
 *  next expected cycle (last log + interval, or creation if never done) is
 *  before today; otherwise pending. */
export function recurringState(template: RecurringTemplate, today: string): RecurringState {
  if (template.last_log?.scheduled_date === today) return "done";
  const baseKey = template.last_log?.scheduled_date ?? template.created_at.slice(0, 10);
  return addDaysKey(baseKey, template.interval_days) < today ? "overdue" : "pending";
}

export const CATEGORY_LABEL: Record<RecurringTemplate["category"], string> = {
  penyiraman: STRINGS.recurring.category.penyiraman,
  pemupukan: STRINGS.recurring.category.pemupukan,
  perawatan: STRINGS.recurring.category.perawatan,
  pestisida: STRINGS.recurring.category.pestisida,
};

export const STATE_ICON: Record<RecurringState, string> = {
  done: "check_circle",
  pending: "radio_button_unchecked",
  overdue: "cancel",
};

export const STATE_COLOR: Record<RecurringState, string> = {
  done: "text-kanban-complete",
  pending: "text-on-surface-variant",
  overdue: "text-error",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
});

/**
 * RecurringTaskChecklist (T-14, F-05): per-project recurring tasks drawn from
 * `recurring_task_templates` + latest `recurring_task_logs`. One row per
 * template: category badge, title, description, last completed date and a
 * toggle that POST /api/recurring/check. State colors: green = done today,
 * gray = pending, red = overdue (missed cycle). Card layout on mobile, list
 * on desktop.
 */
export function RecurringTaskChecklist({ projectId }: { projectId: string }) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const today = jakartaTodayKey();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuthRetry(`/api/recurring?project_id=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error("load failed");
      const json = (await res.json()) as { templates: RecurringTemplate[] };
      setTemplates(json.templates ?? []);
    } catch {
      toast(STRINGS.recurring.loadFailed, "danger");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = useCallback(
    async (template: RecurringTemplate) => {
      setTogglingId(template.id);
      const prevLastLog = template.last_log;
      // Optimistic: mark completed today, revert on failure.
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id
            ? { ...t, last_log: { scheduled_date: today, completed_at: new Date().toISOString() } }
            : t
        )
      );
      try {
        const res = await fetch("/api/recurring/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_id: template.id, scheduled_date: today }),
        });
        if (res.status === 409) {
          toast(STRINGS.recurring.alreadyChecked);
          return;
        }
        if (!res.ok) throw new Error("check failed");
        toast(STRINGS.recurring.checkSuccess);
      } catch {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, last_log: prevLastLog } : t))
        );
        toast(STRINGS.recurring.checkFailed, "danger");
      } finally {
        setTogglingId(null);
      }
    },
    [today]
  );

  const done = useMemo(
    () => templates.filter((t) => recurringState(t, today) === "done").length,
    [templates, today]
  );

  if (loading) {
    return (
      <section className="flex flex-col gap-3" aria-busy="true">
        <div className="h-10 w-48 animate-pulse rounded-md bg-surface-container-high" />
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-container-high" />
        ))}
      </section>
    );
  }

  if (templates.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-outline bg-surface-container-lowest p-6 text-center font-body text-sm text-on-surface-variant">
        {STRINGS.recurring.empty}
      </section>
    );
  }

  return (
    <section aria-label={STRINGS.recurring.title} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold text-on-surface">
          {STRINGS.recurring.title}
        </h2>
        <span className="rounded bg-surface-container-high px-2 py-1 font-label text-xs text-on-surface-variant">
          {done}/{templates.length} {STRINGS.recurring.title.toLowerCase()}
        </span>
      </div>
      <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3">
        {templates.map((template) => {
          const state = recurringState(template, today);
          const doneToday = state === "done";
          return (
            <li
              key={template.id}
              className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
            >
              <button
                type="button"
                aria-label={`${template.title} — ${doneToday ? STRINGS.recurring.completed : STRINGS.recurring.pending}`}
                aria-pressed={doneToday}
                disabled={togglingId === template.id}
                onClick={() => void handleToggle(template)}
                className={`shrink-0 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  togglingId === template.id ? "opacity-60" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-2xl ${STATE_COLOR[state]}`}
                >
                  {STATE_ICON[state]}
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 rounded bg-surface-container-high px-2 py-0.5 font-label text-[11px] uppercase tracking-wide text-on-surface-variant">
                    {CATEGORY_LABEL[template.category]}
                  </span>
                  <span className="font-label text-xs text-on-surface-variant">
                    {STRINGS.recurring.schedule(template.interval_days)}
                  </span>
                </div>
                <p className="font-body text-sm font-semibold text-on-surface">{template.title}</p>
                {template.description ? (
                  <p className="line-clamp-2 font-body text-sm text-on-surface-variant">
                    {template.description}
                  </p>
                ) : null}
                <p className="font-label text-xs text-on-surface-variant">
                  {template.last_log
                    ? STRINGS.recurring.lastCompleted(dateFormatter.format(new Date(`${template.last_log.scheduled_date}T00:00:00`)))
                    : STRINGS.recurring.neverCompleted}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}