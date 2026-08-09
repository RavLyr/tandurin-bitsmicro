"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { toast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn, type KanbanColumnDef } from "./column";
import { RealtimeBanner } from "./realtime-banner";
import { KanbanFilterBar, type KanbanProject } from "./filter-bar";
import type { KanbanTask } from "./task-card";
import { fetchWithAuthRetry } from "@/lib/fetch-with-retry";

const COLUMNS: KanbanColumnDef[] = [
  {
    status: "belum_dikerjakan",
    title: STRINGS.dashboard.columns.todo.title,
    dotClass: "bg-error",
    dim: false,
  },
  {
    status: "sedang_dikerjakan",
    title: STRINGS.dashboard.columns.inProgress.title,
    dotClass: "bg-kanban-progress",
    dim: false,
  },
  {
    status: "selesai",
    title: STRINGS.dashboard.columns.done.title,
    dotClass: "bg-kanban-complete",
    dim: true,
  },
];

const STATUS_ORDER: KanbanTask["status"][] = ["belum_dikerjakan", "sedang_dikerjakan", "selesai"];

/**
 * Kanban board (T-304, F-06): fetches tasks, drags between columns via
 * @dnd-kit, optimistic moves with revert on failure, realtime via Supabase
 * channel (30s polling fallback), search + project filter, offline gate.
 */
export function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [projects, setProjects] = useState<KanbanProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("semua");
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const projectsRef = useRef<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const loadTasks = useCallback(async (signal?: AbortSignal) => {
    try {
      // Fetch all tasks; column/unorganized partitioning happens client-side
      // so realtime merges stay simple regardless of the selected project.
      const res = await fetchWithAuthRetry("/api/tasks", { signal });
      if (!res.ok) throw new Error("load failed");
      const json = (await res.json()) as { tasks: KanbanTask[] };
      setTasks(json.tasks ?? []);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast(STRINGS.kanban.saveFailed, "danger");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const [listRes, activeRes] = await Promise.all([
        fetchWithAuthRetry("/api/projects"),
        fetchWithAuthRetry("/api/projects/active"),
      ]);
      if (listRes.ok) {
        const json = (await listRes.json()) as { projects: KanbanProject[] };
        setProjects(json.projects ?? []);
      }
      if (activeRes.ok) {
        const json = (await activeRes.json()) as { project: KanbanProject | null };
        if (json.project) setFilterKey(json.project.id);
      }
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadTasks, loadProjects]);

  useEffect(() => {
    projectsRef.current = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  }, [projects]);

  // Realtime channel (F-06): merge INSERT/UPDATE/DELETE; 30s polling fallback.
  useEffect(() => {
    const supabase = createClient();
    let polling: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setupChannel = (userId: string) => {
      channel = supabase
        .channel("tasks-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
          (payload) => {
            const event = payload.eventType;
            const row = payload.new as Partial<KanbanTask> | null;
            const oldRow = payload.old as Partial<KanbanTask> | null;
            if (event === "INSERT" && row?.id) {
              const enriched = { ...row, project_name: row.project_id ? projectsRef.current[row.project_id] ?? null : null } as KanbanTask;
              setTasks((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, enriched]));
            } else if (event === "UPDATE" && row?.id) {
              setTasks((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row, project_name: row.project_name ?? t.project_name } : t)));
            } else if (event === "DELETE" && oldRow?.id) {
              setTasks((prev) => prev.filter((t) => t.id !== oldRow.id));
            }
          }
        )
        .subscribe((status) => {
          if (disposed) return;
          setRealtimeConnected(status === "SUBSCRIBED");
          if (status !== "SUBSCRIBED") {
            if (!polling) {
              polling = setInterval(() => void loadTasks(), 30_000);
            }
          } else if (polling) {
            clearInterval(polling);
            polling = null;
            void loadTasks();
          }
        });
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user && !disposed) setupChannel(data.user.id);
    });

    const online = () => setOffline(false);
    const offlineEvt = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvt);

    return () => {
      disposed = true;
      if (polling) clearInterval(polling);
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvt);
    };
  }, [loadTasks]);

  const optimisticMove = useCallback((id: string, status: KanbanTask["status"], position: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, position } : t))
    );
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);

      const activeTask = tasksRef.current.find((t) => t.id === activeId);
      if (!activeTask) return;

      // Dropped on a column → move to that column (append at end).
      if (STATUS_ORDER.includes(overId as KanbanTask["status"])) {
        const targetStatus = overId as KanbanTask["status"];
        if (targetStatus === activeTask.status) return;
        const targetMax = Math.max(
          -1,
          ...tasksRef.current
            .filter((t) => t.status === targetStatus)
            .map((t) => t.position)
        );
        const prevStatus = activeTask.status;
        const prevPosition = activeTask.position;
        optimisticMove(activeId, targetStatus, targetMax + 1);

        try {
          const res = await fetch("/api/tasks/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: activeId, status: targetStatus }),
          });
          if (!res.ok) throw new Error("move failed");
        } catch {
          optimisticMove(activeId, prevStatus, prevPosition);
          toast(STRINGS.kanban.moveFailed, "danger");
        }
        return;
      }

      // Dropped on another card in the same column → reorder.
      const overTask = tasksRef.current.find((t) => t.id === overId);
      if (!overTask || overTask.status !== activeTask.status) return;
      const columnTasks = tasksRef.current
        .filter((t) => t.status === activeTask.status)
        .sort((a, b) => a.position - b.position);
      const from = columnTasks.findIndex((t) => t.id === activeId);
      const to = columnTasks.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1 || from === to) return;

      const reordered = arrayMove(columnTasks, from, to).map((t, i) => ({ ...t, position: i }));
      setTasks((prev) => {
        const others = prev.filter((t) => t.status !== activeTask.status);
        return [...others, ...reordered].sort((a, b) => {
          const sa = STATUS_ORDER.indexOf(a.status);
          const sb = STATUS_ORDER.indexOf(b.status);
          return sa !== sb ? sa - sb : a.position - b.position;
        });
      });

      try {
        await Promise.all(
          reordered.map((t) =>
            fetch("/api/tasks/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: t.id, status: t.status, position: t.position }),
            })
          )
        );
      } catch {
        void loadTasks();
        toast(STRINGS.kanban.moveFailed, "danger");
      }
    },
    [loadTasks, optimisticMove]
  );

  const handleMove = useCallback(
    (id: string, direction: -1 | 1) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      const currentIndex = STATUS_ORDER.indexOf(task.status);
      const nextIndex = Math.min(2, Math.max(0, currentIndex + direction));
      if (nextIndex === currentIndex) return;
      void handleDragEnd({
        active: { id },
        over: { id: STATUS_ORDER[nextIndex] },
      } as unknown as DragEndEvent);
    },
    [handleDragEnd]
  );

  const handleEditDescription = useCallback(
    async (id: string, description: string) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, description } : t)));
      const res = await fetch("/api/tasks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, description }),
      });
      if (!res.ok) {
        void loadTasks();
        toast(STRINGS.kanban.saveFailed, "danger");
      } else {
        toast(STRINGS.kanban.saveSuccess);
      }
    },
    [loadTasks]
  );

  const handleToggleDone = useCallback(
    (id: string) => {
      void handleDragEnd({
        active: { id },
        over: { id: "selesai" },
      } as unknown as DragEndEvent);
    },
    [handleDragEnd]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== deleteId));
      toast(STRINGS.kanban.deleteSuccess);
    } else if (res.status === 404) {
      setTasks((prev) => prev.filter((t) => t.id !== deleteId));
      toast(STRINGS.kanban.taskDeleted, "danger");
    } else {
      toast(STRINGS.kanban.deleteFailed, "danger");
    }
  }, [deleteId]);

  const handleComment = useCallback(
    async (id: string, content: string) => {
      const res = await fetch(`/api/tasks/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        toast(STRINGS.kanban.commentFailed, "danger");
        return;
      }
      const json = (await res.json()) as { comment: { id: string; content: string; created_at: string } };
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, comments: [...(t.comments ?? []), json.comment] }
            : t
        )
      );
    },
    []
  );

  const visibleTasks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filterKey !== "semua" && t.project_id !== filterKey) return false;
      if (!needle) return true;
      return t.title.toLowerCase().includes(needle);
    });
  }, [tasks, search, filterKey]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map((c) => [
          c.status,
          visibleTasks
            .filter((t) => t.status === c.status)
            .sort((a, b) => a.position - b.position),
        ])
      ) as Record<KanbanTask["status"], KanbanTask[]>,
    [visibleTasks]
  );

  // Tasks without a project are excluded from project-filtered columns; keep
  // them reachable via the "Unorganized" section at the bottom of the board.
  const unorganizedTasks = useMemo(
    () => (filterKey === "semua" ? [] : tasks.filter((t) => t.project_id === null)),
    [tasks, filterKey]
  );

  return (
    <>
      <RealtimeBanner connected={realtimeConnected} />
      <KanbanFilterBar
        search={search}
        onSearch={setSearch}
        projects={projects}
        filterKey={filterKey}
        onFilter={setFilterKey}
      />

      {offline ? (
        <div className="mx-auto mt-6 max-w-md rounded-lg border border-outline bg-surface p-6 text-center font-body text-sm text-on-surface-variant">
          {STRINGS.kanban.offlineNotice}
        </div>
      ) : null}

      <div className="hide-scrollbar w-full flex-1 overflow-x-auto px-4 py-8 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            {COLUMNS.map((c) => (
              <div key={c.status} className="flex flex-col gap-4">
                <Skeleton className="h-8 w-40 rounded-md" />
                <Skeleton className="h-28 w-full rounded-md" />
                <Skeleton className="h-28 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              {STRINGS.dashboard.ctaTitle}
            </h2>
            <p className="max-w-md font-body text-sm text-on-surface-variant">
              {STRINGS.dashboard.ctaBody}
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/chat"
                className="rounded-md bg-primary px-6 py-3 font-button uppercase text-on-primary transition-colors duration-300 hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {STRINGS.dashboard.ctaLink}
              </Link>
              <Link
                href="/projects/new"
                className="rounded-md border border-outline-variant bg-surface px-6 py-3 font-button uppercase text-on-surface transition-colors duration-300 hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {STRINGS.dashboard.ctaCreateProject}
              </Link>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={undefined}
            onDragStart={(e) => setDraggingId(String(e.active.id))}
            onDragEnd={(e) => void handleDragEnd(e)}
            onDragCancel={() => setDraggingId(null)}
          >
            <div className="grid min-w-[900px] grid-cols-1 items-start gap-6 md:grid-cols-3">
              {COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.status}
                  column={column}
                  tasks={grouped[column.status]}
                  isDragging={draggingId !== null}
                  onMove={handleMove}
                  onEditDescription={(id, d) => void handleEditDescription(id, d)}
                  onToggleDone={handleToggleDone}
                  onDelete={setDeleteId}
                  onComment={(id, c) => void handleComment(id, c)}
                />
              ))}
            </div>
          </DndContext>
        )}
        {unorganizedTasks.length > 0 ? (
          <section
            aria-label={STRINGS.dashboard.unorganized.title}
            className="mt-10 flex flex-col gap-3 border-t border-outline pt-6"
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-headline text-base font-semibold text-on-surface">
                {STRINGS.dashboard.unorganized.title}
              </h2>
              <p className="font-body text-sm text-on-surface-variant">
                {STRINGS.dashboard.unorganized.hint}
              </p>
            </div>
            <ul className="grid min-w-[900px] grid-cols-1 gap-3 md:grid-cols-3">
              {unorganizedTasks
                .sort((a, b) => a.position - b.position)
                .map((task) => {
                  const column = COLUMNS.find((c) => c.status === task.status) ?? COLUMNS[0];
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.dotClass}`}
                      />
                      <p className="min-w-0 flex-1 truncate font-body text-sm text-on-surface">
                        {task.title}
                      </p>
                      <button
                        type="button"
                        aria-label={STRINGS.kanban.moveLeft}
                        onClick={() => handleMove(task.id, -1)}
                        className="shrink-0 rounded p-1 font-button text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label={STRINGS.kanban.moveRight}
                        onClick={() => handleMove(task.id, 1)}
                        className="shrink-0 rounded p-1 font-button text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        ›
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title={STRINGS.kanban.deleteConfirm}
        confirmLabel={STRINGS.kanban.deleteConfirmAction}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

export { COLUMNS, STATUS_ORDER };