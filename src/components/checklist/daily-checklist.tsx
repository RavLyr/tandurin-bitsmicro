"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { toast } from "@/components/ui/use-toast";
import {
  type RecurringTemplate,
  type RecurringState,
  jakartaTodayKey,
  recurringState,
  CATEGORY_LABEL,
  STATE_ICON,
  STATE_COLOR,
} from "./recurring-checklist";
import { fetchWithAuthRetry } from "@/lib/fetch-with-retry";

/**
 * DailyChecklist (T-16, F-05): "Tugas Hari Ini" — every recurring template
 * for the user, grouped by project, each row showing its state for today
 * (done ✓ / pending ○ / overdue ✗). Clicking a row posts /api/recurring/check.
 */
export function DailyChecklist() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const today = jakartaTodayKey();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuthRetry("/api/recurring");
      if (!res.ok) throw new Error("load failed");
      const json = (await res.json()) as { templates: RecurringTemplate[] };
      setTemplates(json.templates ?? []);
    } catch {
      toast(STRINGS.recurring.loadFailed, "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCheck = useCallback(
    async (template: RecurringTemplate) => {
      setTogglingId(template.id);
      const prevLastLog = template.last_log;
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

  const groups = useMemo(() => {
    const map = new Map<string, RecurringTemplate[]>();
    for (const t of templates) {
      const key = t.project_name ?? STRINGS.dashboard.unorganizedTitle;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [templates]);

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
    <section aria-label={STRINGS.recurring.todayTitle} className="flex flex-col gap-4">
      <h2 className="font-headline text-lg font-semibold text-on-surface">
        {STRINGS.recurring.todayTitle}
      </h2>
      {groups.map(([project, items]) => (
        <div key={project} className="flex flex-col gap-2">
          <h3 className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            {project}
          </h3>
          <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-2">
            {items.map((template) => {
              const state: RecurringState = recurringState(template, today);
              const doneToday = state === "done";
              const statusLabel =
                state === "done"
                  ? STRINGS.recurring.completed
                  : state === "overdue"
                    ? STRINGS.recurring.overdue
                    : STRINGS.recurring.category[template.category];
              return (
                <li
                  key={template.id}
                  className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
                >
                  <button
                    type="button"
                    aria-label={`${template.title} — ${doneToday ? STRINGS.recurring.completed : STRINGS.recurring.pending}`}
                    aria-pressed={doneToday}
                    disabled={togglingId === template.id}
                    onClick={() => void handleCheck(template)}
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
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate font-body text-sm font-semibold text-on-surface">
                      {template.title}
                    </p>
                    <p className="font-label text-xs text-on-surface-variant">{statusLabel}</p>
                  </div>
                  <span className="shrink-0 rounded bg-surface-container-high px-2 py-0.5 font-label text-[11px] uppercase tracking-wide text-on-surface-variant">
                    {CATEGORY_LABEL[template.category]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}