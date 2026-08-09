"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STRINGS } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuthRetry } from "@/lib/fetch-with-retry";

export interface ProjectOption {
  id: string;
  name: string;
}

/**
 * Project switcher dropdown (T-18): fetches the user's projects via
 * `/api/projects` and marks the active one via `/api/projects/active`.
 * Selecting a project persists it server-side (active heuristic) and reloads
 * so the kanban board picks up the new filter. Empty state links to /chat
 * (create via consultation) — the manual form is on /projects/new.
 *
 * ponytail: full reload after switch instead of event bus between header and
 * board; upgrade path = shared "active project" context once waves 5-6 land.
 */
export function ProjectSwitcher() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [listRes, activeRes] = await Promise.all([
        fetchWithAuthRetry("/api/projects"),
        fetchWithAuthRetry("/api/projects/active"),
      ]);
      if (listRes.ok) {
        const json = (await listRes.json()) as { projects: ProjectOption[] };
        setProjects(json.projects ?? []);
      } else {
        setProjects([]);
      }
      if (activeRes.ok) {
        const json = (await activeRes.json()) as {
          project: ProjectOption | null;
        };
        setActiveId(json.project?.id ?? null);
      }
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeProject = projects?.find((p) => p.id === activeId) ?? null;

  const switchProject = async (project: ProjectOption) => {
    if (project.id === activeId || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/projects/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });
      if (res.ok) {
        // Reload so the kanban board mounts with the new active project.
        window.location.reload();
        return;
      }
      setOpen(false);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={STRINGS.header.projectSwitcherAria}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded border border-outline px-3 py-1.5 font-label text-sm uppercase transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">
          eco
        </span>
        <span className="flex flex-col items-start gap-0 leading-tight">
          {activeProject ? (
            <span className="text-[10px] not-italic normal-case tracking-normal text-on-surface-variant">
              {STRINGS.header.projectSwitcherActiveLabel}
            </span>
          ) : null}
          <span className="max-w-32 truncate normal-case tracking-normal text-on-surface">
            {activeProject?.name ?? STRINGS.header.projectSwitcher}
          </span>
        </span>
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={STRINGS.header.projectSwitcherAria}
          className="absolute left-0 top-full z-40 mt-2 w-64 rounded-md border border-outline-variant bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/0.08)]"
        >
          {projects === null ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="font-body text-sm font-semibold text-on-surface">
                {STRINGS.header.projectSwitcherEmpty}
              </p>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {STRINGS.header.projectSwitcherEmptyHint}
              </p>
              <Link
                href="/projects/new"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 font-label text-sm font-semibold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
                {STRINGS.header.projectSwitcherEmptyCta}
              </Link>
            </div>
          ) : (
            <>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  role="option"
                  aria-selected={project.id === activeId}
                  onClick={() => void switchProject(project)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span
                    className="material-symbols-outlined text-sm text-on-surface-variant"
                    aria-hidden="true"
                  >
                    eco
                  </span>
                  <span className="flex flex-1 flex-col gap-0 leading-tight">
                    {project.id === activeId ? (
                      <span className="text-[10px] normal-case tracking-normal text-primary">
                        {STRINGS.header.projectSwitcherActiveLabel}
                      </span>
                    ) : null}
                    <span className="truncate">{project.name}</span>
                  </span>
                  {project.id === activeId ? (
                    <span
                      aria-label={STRINGS.header.projectSwitcherCheckAria}
                      className="material-symbols-outlined text-sm text-primary"
                    >
                      check
                    </span>
                  ) : null}
                </button>
              ))}
              <div className="border-t border-outline-variant">
                <Link
                  href="/projects/new"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 font-body text-sm font-semibold text-primary transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    add
                  </span>
                  {STRINGS.header.projectSwitcherEmptyCta}
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}