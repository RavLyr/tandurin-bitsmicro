"use client";

import Link from "next/link";
import { STRINGS } from "@/lib/i18n";

interface TaskRow {
  title?: unknown;
  due_date?: unknown;
  phase?: unknown;
}

/**
 * Task summary card (F-05, metadata.type "task-summary"): the generated
 * schedule as a compact list, with a "Buka Kanban" link to /dashboard
 * (DESIGN §4.3).
 */
export function TaskSummaryCard({ tasks }: { tasks: unknown }) {
  const rows = (Array.isArray(tasks) ? tasks : []) as TaskRow[];
  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-outline-variant bg-surface p-4">
      <h3 className="font-headline text-sm font-semibold text-on-surface">
        {STRINGS.chat.taskSummaryTitle}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((task, index) => {
          const title = typeof task.title === "string" ? task.title : `#${index + 1}`;
          const due =
            typeof task.due_date === "string"
              ? new Intl.DateTimeFormat("id-ID", {
                  timeZone: "Asia/Jakarta",
                  day: "numeric",
                  month: "short",
                }).format(new Date(task.due_date))
              : null;
          return (
            <li key={index} className="flex items-center justify-between gap-3">
              <span className="font-body text-sm text-on-surface">{title}</span>
              {due ? <span className="font-label text-xs text-on-surface-variant">{due}</span> : null}
            </li>
          );
        })}
      </ul>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary transition-colors hover:bg-surface-variant hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {STRINGS.chat.openKanban}
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          arrow_forward
        </span>
      </Link>
    </section>
  );
}