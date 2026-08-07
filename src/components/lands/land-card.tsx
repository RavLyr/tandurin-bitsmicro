"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/i18n";

export interface LandItem {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  area_m2: number | null;
  media: LandMedia;
  water: LandWater;
  sunlight: LandSunlight;
  budget_idr: number | null;
  experience: LandExperience;
  is_active: boolean;
  task_count?: number;
}

type LandMedia = "soil" | "hydroponic" | "pot" | "other";
type LandWater = "plenty" | "limited";
type LandSunlight = "full" | "partial" | "shade";
type LandExperience = "beginner" | "experienced" | "professional";

function formatIdr(value: number | null): string | null {
  if (value == null) return null;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function LandCard({
  land,
  busy = false,
  onEdit,
  onDelete,
  onMakeActive,
}: {
  land: LandItem;
  busy?: boolean;
  onEdit: (land: LandItem) => void;
  onDelete: (land: LandItem) => void;
  onMakeActive: (land: LandItem) => void;
}) {
  const budget = formatIdr(land.budget_idr);

  return (
    <article
      data-active={land.is_active || undefined}
      className="relative flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm transition-colors data-[active]:border-primary data-[active]:border-2 data-[active]:bg-primary-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-headline truncate text-lg font-semibold text-on-surface">
              {land.name}
            </h3>
            {land.is_active ? (
              <Badge variant="primary">{STRINGS.lands.activeBadge}</Badge>
            ) : null}
          </div>
          {land.location ? (
            <p className="font-body flex items-center gap-1 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                location_on
              </span>
              <span className="sr-only">{STRINGS.lands.locationIconAria}</span>
              {land.location}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" className="p-1.5" onClick={() => onEdit(land)} aria-label={STRINGS.lands.editLandAria}>
            <span className="material-symbols-outlined text-lg">edit</span>
          </Button>
          <Button variant="ghost" className="p-1.5" onClick={() => onDelete(land)} aria-label={STRINGS.lands.deleteLandAria}>
            <span className="material-symbols-outlined text-lg">delete</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">{STRINGS.lands.mediaLabels[land.media]}</Badge>
        <Badge variant="neutral">{STRINGS.lands.sunlightLabels[land.sunlight]}</Badge>
        <Badge variant="neutral">{STRINGS.lands.waterLabels[land.water]}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        {land.area_m2 != null ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-on-surface-variant">{STRINGS.lands.fieldArea}</dt>
            <dd className="font-medium text-on-surface">{land.area_m2} m²</dd>
          </div>
        ) : null}
        {budget ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-on-surface-variant">{STRINGS.lands.fieldBudget}</dt>
            <dd className="font-medium text-on-surface">{budget}</dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-on-surface-variant">{STRINGS.lands.activeTasks}</dt>
          <dd className="font-medium text-on-surface">
            <span aria-label={STRINGS.lands.activeTasksAria(land.task_count ?? 0)}>
              {land.task_count ?? 0}
            </span>
          </dd>
        </div>
      </dl>

      {!land.is_active ? (
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => onMakeActive(land)}>
          {STRINGS.lands.makeActive}
        </Button>
      ) : null}
    </article>
  );
}