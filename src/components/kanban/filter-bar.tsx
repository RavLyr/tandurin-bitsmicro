"use client";

import { STRINGS } from "@/lib/i18n";

export interface KanbanProject {
  id: string;
  name: string;
}

/**
 * Kanban filter bar (T-304/F-06 + T-13): board title + search input + project
 * filter chips ("Semua Proyek" + one per project). Search filters on the task
 * title. When the user has exactly one project, the "Semua Proyek" chip is
 * redundant (it equals that single project), so it renders as a contextual
 * chip labeled with the project's name instead.
 */
export function KanbanFilterBar({
  search,
  onSearch,
  projects,
  filterKey,
  onFilter,
}: {
  search: string;
  onSearch: (value: string) => void;
  projects: KanbanProject[];
  filterKey: string;
  onFilter: (key: string) => void;
}) {
  const singleProject = projects.length === 1 ? projects[0] : null;
  return (
    <div className="sticky top-16 z-30 flex w-full flex-col items-start justify-between gap-4 border-b border-border-color bg-surface-container-lowest/90 px-4 py-4 backdrop-blur-md md:flex-row md:items-center lg:px-8">
      <div className="flex w-full flex-col items-start gap-4 md:w-auto md:flex-row md:items-center">
        <h1 className="font-headline text-xl font-bold text-on-surface">
          {STRINGS.dashboard.title}
        </h1>
        <div className="hidden h-4 w-px bg-outline-variant md:block" />
        <div className="relative w-full md:w-64">
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            aria-hidden="true"
          >
            search
          </span>
          <input
            aria-label={STRINGS.dashboard.searchAria}
            type="text"
            placeholder={STRINGS.dashboard.searchPlaceholder}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="w-full rounded-md border border-outline bg-surface py-2 pl-10 pr-4 font-body text-sm text-on-surface transition-colors placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="hide-scrollbar flex w-full items-center gap-3 overflow-x-auto pb-2 md:w-auto md:pb-0">
        {singleProject ? (
          <button
            type="button"
            aria-label={`${STRINGS.dashboard.filterAria}: ${singleProject.name}`}
            onClick={() => onFilter(singleProject.id)}
            className={`shrink-0 rounded-lg border px-4 py-1.5 font-label text-xs uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              filterKey === singleProject.id
                ? "bg-primary text-on-primary hover:bg-inverse-surface"
                : "border-outline bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
          >
            {singleProject.name}
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label={STRINGS.dashboard.filterAria}
              onClick={() => onFilter("semua")}
              className={`shrink-0 rounded-lg px-4 py-1.5 font-label text-xs uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                filterKey === "semua"
                  ? "border border-primary bg-primary text-on-primary hover:bg-inverse-surface"
                  : "border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container"
              }`}
            >
              {STRINGS.dashboard.filterAll}
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onFilter(project.id)}
                className={`shrink-0 rounded-lg px-4 py-1.5 font-label text-xs uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  filterKey === project.id
                    ? "border border-primary bg-primary text-on-primary hover:bg-inverse-surface"
                    : "border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                }`}
              >
                {project.name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}