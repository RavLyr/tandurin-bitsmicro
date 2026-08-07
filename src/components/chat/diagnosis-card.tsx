"use client";

import { STRINGS } from "@/lib/i18n";

interface DiagnosisRow {
  label?: unknown;
  severity?: unknown;
  actions?: unknown;
}

const SEVERITY_BADGES: Record<string, string> = {
  tinggi: "bg-error/15 text-error",
  sedang: "bg-accent-warning/15 text-accent-warning",
  rendah: "bg-primary-soft text-primary-deep",
};

/**
 * Diagnosis card (F-04, metadata.type "diagnosis"): top-likelihood condition
 * with severity badge and a numbered "Tindakan Segera" action list, per
 * DESIGN §4.3 diagnosis card from the Stitch screen.
 */
export function DiagnosisCard({ data }: { data: unknown }) {
  const rows = (Array.isArray(data) ? data : []) as DiagnosisRow[];
  if (rows.length === 0) return null;

  const top = rows[0];
  const label = typeof top.label === "string" ? top.label : null;
  const severity = typeof top.severity === "string" ? top.severity : null;
  const actions = Array.isArray(top.actions)
    ? top.actions.filter((a): a is string => typeof a === "string")
    : [];

  if (!label && actions.length === 0) return null;

  return (
    <section className="rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-headline text-sm font-semibold text-on-surface">{label}</h3>
        {severity && SEVERITY_BADGES[severity] ? (
          <span className={`rounded-full px-2 py-0.5 font-label text-xs ${SEVERITY_BADGES[severity]}`}>
            {STRINGS.chat.severityLabel(severity)}
          </span>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="mt-3">
          <h4 className="font-label text-xs uppercase tracking-wide text-on-surface-variant">
            {STRINGS.chat.diagnosisActions}
          </h4>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
            {actions.map((action, index) => (
              <li key={index} className="font-body text-sm text-on-surface">
                {action}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}