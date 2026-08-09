"use client";

import { useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { KanbanProject } from "@/components/kanban/filter-bar";

type TaskType = "one-time" | "recurring";

const PHASES = ["olah_lahan", "semai", "tanam", "panen"] as const;
const CATEGORIES = ["penyiraman", "pemupukan", "perawatan", "pestisida"] as const;
const TIMES = ["pagi", "sore"] as const;

const phaseLabel: Record<string, string> = {
  olah_lahan: STRINGS.taskForm.phaseOlahLahan,
  semai: STRINGS.taskForm.phaseSemai,
  tanam: STRINGS.taskForm.phaseTanam,
  panen: STRINGS.taskForm.phasePanen,
};
const categoryLabel: Record<string, string> = {
  penyiraman: STRINGS.taskForm.categoryPenyiraman,
  pemupukan: STRINGS.taskForm.categoryPemupukan,
  perawatan: STRINGS.taskForm.categoryPerawatan,
  pestisida: STRINGS.taskForm.categoryPestisida,
};

export function TaskFormDialog({
  open,
  projects,
  onCancel,
  onSaved,
}: {
  open: boolean;
  projects: KanbanProject[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<TaskType>("one-time");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<(typeof PHASES)[number]>("olah_lahan");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("penyiraman");
  const [interval, setInterval] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState<(typeof TIMES)[number]>("pagi");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setType("one-time");
    setTitle("");
    setDescription("");
    setPhase("olah_lahan");
    setDueDate("");
    setProjectId("");
    setCategory("penyiraman");
    setInterval(1);
    setTimeOfDay("pagi");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast("Judul wajib diisi", "danger");
      return;
    }
    if (!projectId) {
      toast(STRINGS.taskForm.fieldProjectPlaceholder, "danger");
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (type === "one-time") {
        res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            phase,
            due_date: dueDate || undefined,
            project_id: projectId,
          }),
        });
      } else {
        res = await fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            category,
            interval_days: interval,
            time_of_day: timeOfDay,
            project_id: projectId,
          }),
        });
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Gagal menyimpan");
      }
      toast(type === "one-time" ? STRINGS.taskForm.successOneTime : STRINGS.taskForm.successRecurring, "success");
      reset();
      onSaved();
    } catch (err) {
      toast((err as Error).message, "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-scrim/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="font-headline text-xl font-semibold text-on-surface">{STRINGS.taskForm.title}</h2>

        <div className="mt-4 flex gap-1 rounded-lg bg-surface-container-low p-1">
          {(["one-time", "recurring"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-md px-3 py-2 font-label text-sm transition-colors ${
                type === t ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {t === "one-time" ? STRINGS.taskForm.oneTimeTab : STRINGS.taskForm.recurringTab}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldTitle}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={STRINGS.taskForm.fieldTitlePlaceholder}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldDescription}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={STRINGS.taskForm.fieldDescriptionPlaceholder}
              rows={2}
              className="resize-none rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldProject}</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{STRINGS.taskForm.fieldProjectPlaceholder}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {type === "one-time" ? (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldPhase}</span>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as (typeof PHASES)[number])}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {phaseLabel[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldDueDate}</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldCategory}</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldInterval}</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-sm text-on-surface-variant">{STRINGS.taskForm.fieldTimeOfDay}</span>
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value as (typeof TIMES)[number])}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t === "pagi" ? STRINGS.taskForm.timePagi : STRINGS.taskForm.timeSore}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? STRINGS.taskForm.saving : STRINGS.taskForm.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
