"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { STRINGS } from "@/lib/i18n";
import { TaskCard, type KanbanTask } from "./task-card";

export interface KanbanColumnDef {
  status: "belum_dikerjakan" | "sedang_dikerjakan" | "selesai";
  title: string;
  dotClass: string;
  dim: boolean;
}

/**
 * Kanban column (T-304, F-06): droppable target + sortable card list.
 * Empty column shows the placeholder; header carries the count badge.
 */
export function KanbanColumn({
  column,
  tasks,
  isDragging,
  onMove,
  onEditDescription,
  onToggleDone,
  onDelete,
  onComment,
}: {
  column: KanbanColumnDef;
  tasks: KanbanTask[];
  isDragging: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onEditDescription: (id: string, description: string) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onComment: (id: string, content: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  void isDragging;

  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col gap-4 rounded-lg border p-3 transition-colors ${
        isOver ? "border-primary bg-primary-soft/30" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-outline pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${column.dotClass}`} />
          <h2 className="font-headline text-lg font-semibold text-on-surface">{column.title}</h2>
        </div>
        <span
          aria-label={`${tasks.length} ${column.title}`}
          className="rounded bg-surface-container-high px-2 py-1 font-label text-xs text-on-surface-variant"
        >
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {tasks.length === 0 ? (
            <div
              className={`flex rounded-md border border-dashed border-outline p-4 ${
                column.dim ? "opacity-75" : ""
              }`}
            >
              <p className="font-body text-sm text-on-surface-variant">{STRINGS.dashboard.emptyColumn}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isDragging={isDragging}
                onMove={onMove}
                onEditDescription={onEditDescription}
                onToggleDone={onToggleDone}
                onDelete={onDelete}
                onComment={onComment}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}