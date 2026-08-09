"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { STRINGS } from "@/lib/i18n";

interface LandOption {
  id: string;
  name: string;
}

interface FormErrors {
  name?: string;
  land_id?: string;
}

/**
 * Manual "Create Project" form (T-19). Posts to /api/projects then
 * redirects to /dashboard — the new project wins the "most recently
 * active" heuristic, so the board loads it as the active project.
 */
export function ProjectForm() {
  const router = useRouter();
  const [lands, setLands] = useState<LandOption[] | null>(null);
  const [name, setName] = useState("");
  const [landId, setLandId] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const loadLands = useCallback(async () => {
    try {
      const response = await fetch("/api/lands");
      if (response.ok) {
        const json = (await response.json()) as { data: LandOption[] };
        setLands(json.data);
      } else {
        setLands([]);
      }
    } catch {
      setLands([]);
    }
  }, []);

  useEffect(() => {
    void loadLands();
    nameRef.current?.focus();
  }, [loadLands]);

  if (lands !== null && lands.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant" aria-hidden="true">
          landscape
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-headline text-xl font-semibold text-on-surface">
            {STRINGS.projects.noLandsTitle}
          </h2>
          <p className="max-w-md font-body text-sm text-on-surface-variant">
            {STRINGS.projects.noLandsBody}
          </p>
        </div>
        <Button onClick={() => router.push("/lahan")}>
          {STRINGS.projects.noLandsCta}
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          land_id: landId,
          description: description.trim() || undefined,
        }),
      });
      const json = (await response.json()) as {
        project?: { id: string };
        errors?: FormErrors;
        error?: string;
      };

      if (!response.ok) {
        if (json.errors) setErrors(json.errors);
        else if (json.error) setErrors({ name: json.error });
        return;
      }
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: keyof FormErrors) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-error" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-on-surface">
          {STRINGS.projects.fieldName}
        </label>
        <Input
          id="project-name"
          ref={nameRef}
          value={name}
          placeholder={STRINGS.projects.fieldNamePlaceholder}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.name;
              return next;
            });
          }}
        />
        {fieldError("name")}
      </div>

      <div>
        <label htmlFor="project-land" className="mb-1 block text-sm font-medium text-on-surface">
          {STRINGS.projects.fieldLand}
        </label>
        <Select
          id="project-land"
          value={landId}
          onChange={(event) => {
            setLandId(event.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.land_id;
              return next;
            });
          }}
        >
          <option value="">{STRINGS.projects.fieldLandPlaceholder}</option>
          {lands?.map((land) => (
            <option key={land.id} value={land.id}>
              {land.name}
            </option>
          ))}
        </Select>
        {fieldError("land_id")}
      </div>

      <div>
        <label htmlFor="project-description" className="mb-1 block text-sm font-medium text-on-surface">
          {STRINGS.projects.fieldDescription}
        </label>
        <textarea
          id="project-description"
          value={description}
          placeholder={STRINGS.projects.fieldDescriptionPlaceholder}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard")} disabled={saving}>
          {STRINGS.common.cancel}
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? STRINGS.auth.submitting : STRINGS.projects.save}
        </Button>
      </div>
    </div>
  );
}