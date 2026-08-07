"use client";

import { useEffect, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

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
 * Diagnosis card (F-04, metadata.type "diagnosis"): image preview, top
 * likelihood with severity badge, numbered "Tindakan Segera" actions, and the
 * mandatory AI-estimate disclaimer (F-04 §6 point 6).
 */
export function DiagnosisCard({ data, imagePath }: { data: unknown; imagePath?: string | null }) {
  const rows = (Array.isArray(data) ? data : []) as DiagnosisRow[];
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    const supabase = createClient();
    void supabase.storage
      .from("plant-images")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setImageUrl(data.signedUrl);
      })
      .catch(() => setImageUrl(null));
  }, [imagePath]);

  const top = rows[0];
  const label = typeof top?.label === "string" ? top.label : null;
  const severity = typeof top?.severity === "string" ? top.severity : null;
  const actions = Array.isArray(top?.actions)
    ? top.actions.filter((a): a is string => typeof a === "string")
    : [];

  return (
    <section className="rounded-lg border border-outline-variant bg-surface p-4">
      {imagePath ? (
        <div className="mb-3 overflow-hidden rounded-md border border-outline-variant">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- signed URL image; cannot use next/image with dynamic signed URLs. */
            <img
              src={imageUrl}
              alt={STRINGS.riwayat.imageAlt}
              className="max-h-48 w-full object-cover"
            />
          ) : null}
        </div>
      ) : null}

      {label || actions.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          {label ? (
            <h3 className="font-headline text-sm font-semibold text-on-surface">{label}</h3>
          ) : null}
          {severity && SEVERITY_BADGES[severity] ? (
            <span className={`rounded-full px-2 py-0.5 font-label text-xs ${SEVERITY_BADGES[severity]}`}>
              {STRINGS.chat.severityLabel(severity)}
            </span>
          ) : null}
        </div>
      ) : null}

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

      <p className="mt-3 border-t border-outline-variant pt-2 font-label text-[11px] leading-relaxed text-on-surface-variant">
        {STRINGS.chat.diagnosisDisclaimer}
      </p>
    </section>
  );
}