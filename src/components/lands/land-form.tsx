"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { STRINGS } from "@/lib/i18n";
import type { LandItem } from "./land-card";

export interface LandFormProps {
  open: boolean;
  initial: LandItem | null;
  onClose: () => void;
  onSaved: (land: LandItem) => void;
}

interface LandFormState {
  name: string;
  location: string;
  latitude: string;
  longitude: string;
  area_m2: string;
  budget_idr: string;
  media: LandItem["media"];
  water: LandItem["water"];
  sunlight: LandItem["sunlight"];
  experience: LandItem["experience"];
}

function emptyForm(): LandFormState {
  return {
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    area_m2: "",
    budget_idr: "",
    media: "soil",
    water: "plenty",
    sunlight: "full",
    experience: "beginner",
  };
}

function toForm(land: LandItem): LandFormState {
  return {
    name: land.name,
    location: land.location ?? "",
    latitude: land.latitude != null ? String(land.latitude) : "",
    longitude: land.longitude != null ? String(land.longitude) : "",
    area_m2: land.area_m2 != null ? String(land.area_m2) : "",
    budget_idr: land.budget_idr != null ? String(land.budget_idr) : "",
    media: land.media,
    water: land.water,
    sunlight: land.sunlight,
    experience: land.experience,
  };
}

function toNumber(value: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(form: LandFormState): Record<string, unknown> {
  const latitude = toNumber(form.latitude);
  const longitude = toNumber(form.longitude);
  return {
    name: form.name.trim(),
    location: form.location.trim() || null,
    latitude: latitude == null ? null : latitude,
    longitude: longitude == null ? null : longitude,
    area_m2: toNumber(form.area_m2),
    budget_idr: toNumber(form.budget_idr),
    media: form.media,
    water: form.water,
    sunlight: form.sunlight,
    experience: form.experience,
  };
}

/**
 * Add/edit land form modal (T-402, DESIGN §4.5). Submits via the lands API;
 * shows field-level error messages (422) under the fields.
 * ponytail: plain overlay modal (no animation); upgrade path = shared Dialog.
 */
export function LandForm({ open, initial, onClose, onSaved }: LandFormProps) {
  const [form, setForm] = useState<LandFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial ? toForm(initial) : emptyForm());
      setErrors({});
      setSaving(false);
      nameRef.current?.focus();
    }
  }, [open, initial]);

  if (!open) return null;

  const setField = (key: keyof LandFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/lands/${initial.id}` : "/api/lands";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const json = await response.json();

      if (!response.ok) {
        if (json.errors) {
          setErrors(json.errors);
        } else if (json.error) {
          setErrors({ name: json.error });
        }
        return;
      }
      onSaved(json.data as LandItem);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-error">{errors[key]}</p>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="land-form-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-outline-variant bg-surface p-6 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
      >
        <h2 id="land-form-title" className="font-headline text-lg font-semibold text-on-surface">
          {initial ? STRINGS.lands.formTitleEdit : STRINGS.lands.formTitleAdd}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="land-name" className="mb-1 block text-sm font-medium text-on-surface">
              {STRINGS.lands.fieldName}
            </label>
            <Input
              id="land-name"
              ref={nameRef}
              value={form.name}
              placeholder={STRINGS.lands.fieldNamePlaceholder}
              onChange={(event) => setField("name", event.target.value)}
            />
            {fieldError("name")}
          </div>

          <div>
            <label htmlFor="land-location" className="mb-1 block text-sm font-medium text-on-surface">
              {STRINGS.lands.fieldLocation}
            </label>
            <Input
              id="land-location"
              value={form.location}
              placeholder={STRINGS.lands.fieldLocationPlaceholder}
              onChange={(event) => setField("location", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="land-latitude" className="mb-1 block text-sm font-medium text-on-surface">
                {STRINGS.lands.fieldLatitude}
              </label>
              <Input
                id="land-latitude"
                value={form.latitude}
                placeholder="e.g. -6.9667"
                onChange={(event) => setField("latitude", event.target.value)}
              />
              {fieldError("latitude")}
            </div>
            <div>
              <label htmlFor="land-longitude" className="mb-1 block text-sm font-medium text-on-surface">
                {STRINGS.lands.fieldLongitude}
              </label>
              <Input
                id="land-longitude"
                value={form.longitude}
                placeholder="e.g. 110.4167"
                onChange={(event) => setField("longitude", event.target.value)}
              />
              {fieldError("longitude")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="land-area" className="mb-1 block text-sm font-medium text-on-surface">
                {STRINGS.lands.fieldArea}
              </label>
              <Input
                id="land-area"
                type="number"
                value={form.area_m2}
                placeholder={STRINGS.lands.fieldAreaPlaceholder}
                onChange={(event) => setField("area_m2", event.target.value)}
              />
              {fieldError("area_m2")}
            </div>
            <div>
              <label htmlFor="land-budget" className="mb-1 block text-sm font-medium text-on-surface">
                {STRINGS.lands.fieldBudget}
              </label>
              <Input
                id="land-budget"
                type="number"
                value={form.budget_idr}
                placeholder={STRINGS.lands.fieldBudgetPlaceholder}
                onChange={(event) => setField("budget_idr", event.target.value)}
              />
              {fieldError("budget_idr")}
            </div>
          </div>

          <div>
            <label htmlFor="land-media" className="mb-1 block text-sm font-medium text-on-surface">
              {STRINGS.lands.fieldMedia}
            </label>
            <Select
              id="land-media"
              value={form.media}
              onChange={(event) => setField("media", event.target.value)}
            >
              {(Object.keys(STRINGS.lands.mediaLabels) as Array<LandItem["media"]>).map((value) => (
                <option key={value} value={value}>
                  {STRINGS.lands.mediaLabels[value]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="land-water" className="mb-1 block text-sm font-medium text-on-surface">
              {STRINGS.lands.fieldWater}
            </label>
            <Select
              id="land-water"
              value={form.water}
              onChange={(event) => setField("water", event.target.value)}
            >
              {(Object.keys(STRINGS.lands.waterLabels) as Array<LandItem["water"]>).map((value) => (
                <option key={value} value={value}>
                  {STRINGS.lands.waterLabels[value]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="land-sunlight" className="mb-1 block text-sm font-medium text-on-surface">
              {STRINGS.lands.fieldSunlight}
            </label>
            <Select
              id="land-sunlight"
              value={form.sunlight}
              onChange={(event) => setField("sunlight", event.target.value)}
            >
              {(Object.keys(STRINGS.lands.sunlightLabels) as Array<LandItem["sunlight"]>).map(
                (value) => (
                  <option key={value} value={value}>
                    {STRINGS.lands.sunlightLabels[value]}
                  </option>
                )
              )}
            </Select>
          </div>

          <div>
            <label htmlFor="land-experience" className="mb-1 block text-sm font-medium text-on-surface">
              {STRINGS.lands.fieldExperience}
            </label>
            <Select
              id="land-experience"
              value={form.experience}
              onChange={(event) => setField("experience", event.target.value)}
            >
              {(Object.keys(STRINGS.lands.experienceLabels) as Array<LandItem["experience"]>).map(
                (value) => (
                  <option key={value} value={value}>
                    {STRINGS.lands.experienceLabels[value]}
                  </option>
                )
              )}
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {STRINGS.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "..." : STRINGS.lands.save}
          </Button>
        </div>
      </div>
    </div>
  );
}