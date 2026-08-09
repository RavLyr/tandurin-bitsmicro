"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { LandCard, type LandItem } from "@/components/lands/land-card";
import { LandForm } from "@/components/lands/land-form";
import { STRINGS } from "@/lib/i18n";

interface LandProject {
  id: string;
  name: string;
  status: "active" | "archived";
}

/**
 * /lahan — My lands (F-07, T-402, DESIGN §4.5).
 * Client fetches /api/lands; add/edit via modal; delete/make-active with
 * confirm. Active land uses the partial-unique-index invariant server-side.
 * "Lihat Proyek" on a card loads that land's projects inline (T-23).
 */
export default function LahanPage() {
  const [lands, setLands] = useState<LandItem[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LandItem | null>(null);
  const [deleting, setDeleting] = useState<LandItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [projectsLand, setProjectsLand] = useState<LandItem | null>(null);
  const [projects, setProjects] = useState<LandProject[] | null>(null);

  const loadLands = useCallback(async () => {
    try {
      const response = await fetch("/api/lands");
      if (response.ok) {
        const json = (await response.json()) as { data: LandItem[] };
        setLands(json.data);
      } else {
        setLands([]);
        toast(STRINGS.lands.loadFailed, "danger");
      }
    } catch {
      setLands([]);
      toast(STRINGS.lands.loadFailed, "danger");
    }
  }, []);

  useEffect(() => {
    void loadLands();
  }, [loadLands]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    toast(STRINGS.lands.saved);
    void loadLands();
  };

  const handleMakeActive = async (land: LandItem) => {
    setBusyId(land.id);
    try {
      const response = await fetch(`/api/lands/active/${land.id}`, { method: "PATCH" });
      if (response.ok) {
        toast(STRINGS.lands.activated);
        void loadLands();
      } else {
        const json = (await response.json()) as { error?: string };
        toast(json.error ?? STRINGS.lands.activeFailed, "danger");
      }
    } catch {
      toast(STRINGS.lands.activeFailed, "danger");
    } finally {
      setBusyId(null);
    }
  };

  const handleViewProjects = async (land: LandItem) => {
    setProjectsLand(land);
    setProjects(null);
    try {
      const response = await fetch(`/api/projects?land_id=${land.id}`);
      if (response.ok) {
        const json = (await response.json()) as { projects: LandProject[] };
        setProjects(json.projects ?? []);
      } else {
        setProjects([]);
        toast(STRINGS.projects.loadFailed, "danger");
      }
    } catch {
      setProjects([]);
      toast(STRINGS.projects.loadFailed, "danger");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const response = await fetch(`/api/lands/${deleting.id}`, { method: "DELETE" });
      if (response.ok) {
        toast(STRINGS.lands.deleted);
        setDeleting(null);
        void loadLands();
      } else {
        const json = (await response.json()) as { error?: string };
        toast(json.error ?? STRINGS.lands.failed, "danger");
        setDeleting(null);
      }
    } catch {
      toast(STRINGS.lands.failed, "danger");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AppHeader activePath="lahan" />
      <main className="w-full pt-16">
        <div className="relative flex items-end justify-between bg-surface-container-low px-5 pb-12 pt-12 lg:px-16 lg:pt-16">
          <div className="flex flex-col gap-4">
            <span className="font-label relative z-10 text-xs uppercase tracking-[0.2em] text-primary">
              {STRINGS.lahan.eyebrow}
            </span>
            <h1 className="font-display relative z-10 -ml-2 text-4xl font-bold text-primary lg:text-5xl">
              {STRINGS.lahan.title}
            </h1>
          </div>
          <button
            type="button"
            className="relative z-10 flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-on-primary shadow-md transition-colors duration-300 hover:bg-surface-variant hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 lg:px-8 lg:py-4"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              add
            </span>
            {STRINGS.lahan.addLand}
          </button>
        </div>

        <div className="relative z-20 -mt-8 px-5 py-12 lg:px-16">
          {lands === null ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : lands.length === 0 ? (
            <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant" aria-hidden="true">
                landscape
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="font-headline text-xl font-semibold text-on-surface">
                  {STRINGS.lahan.emptyTitle}
                </h2>
                <p className="font-body text-sm text-on-surface-variant">
                  {STRINGS.lahan.emptyBody}
                </p>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  add
                </span>
                {STRINGS.lahan.addLand}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lands.map((land) => (
                <LandCard
                  key={land.id}
                  land={land}
                  busy={busyId === land.id}
                  onEdit={(item) => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={setDeleting}
                  onMakeActive={handleMakeActive}
                  onViewProjects={(item) => void handleViewProjects(item)}
                />
              ))}
            </div>
          )}
        </div>

        {projectsLand ? (
          <div className="relative z-20 px-5 lg:px-16">
            <div className="rounded-2xl border border-outline-variant bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-label text-xs uppercase tracking-[0.2em] text-primary">
                    {STRINGS.lands.projectListEyebrow}
                  </span>
                  <h2 className="font-headline truncate text-lg font-semibold text-on-surface">
                    {STRINGS.lands.projectListTitle(projectsLand.name)}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    setProjectsLand(null);
                    setProjects(null);
                  }}
                >
                  {STRINGS.common.close}
                </Button>
              </div>

              {projects === null ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Skeleton className="h-10 rounded-xl" />
                  <Skeleton className="h-10 rounded-xl" />
                </div>
              ) : projects.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant" aria-hidden="true">
                    folder_open
                  </span>
                  <p className="font-body text-sm text-on-surface-variant">
                    {STRINGS.lands.projectListEmpty}
                  </p>
                  <a
                    href="/projects/new"
                    className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                      add
                    </span>
                    {STRINGS.lands.projectListCta}
                  </a>
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {projects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3"
                    >
                      <span className="font-body min-w-0 truncate text-sm font-medium text-on-surface">
                        {project.name}
                      </span>
                      <Badge variant={project.status === "active" ? "primary" : "neutral"}>
                        {project.status === "active"
                          ? STRINGS.projects.activeBadge
                          : STRINGS.projects.archivedBadge}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <div className="h-8" />

        {formOpen ? (
          <LandForm
            open={formOpen}
            initial={editing}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSaved={handleSaved}
          />
        ) : null}

        <ConfirmDialog
          open={deleting != null}
          title={STRINGS.lands.deleteConfirmTitle}
          description={STRINGS.lands.deleteConfirmBody}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleting(null)}
        />
      </main>
      <BottomNav activePath="lahan" />
    </>
  );
}