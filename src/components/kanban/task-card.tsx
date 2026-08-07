"use client";

import { memo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { STRINGS } from "@/lib/i18n";

export interface KanbanTask {
  id: string;
  land_id: string | null;
  conversation_id: string | null;
  title: string;
  description: string | null;
  status: "belum_dikerjakan" | "sedang_dikerjakan" | "selesai";
  due_date: string;
  position: number;
  phase: string | null;
  crop: string | null;
  created_at: string;
  updated_at: string;
  comments?: Array<{ id: string; content: string; created_at: string }>;
}

const PHASE_LABELS: Record<string, string> = {
  olah_lahan: "Olah Lahan",
  semai: "Semai Bibit",
  tanam: "Tanam Bibit",
  penyiraman: "Penyiraman",
  pemupukan: "Pemupukan",
  perawatan: "Perawatan",
  panen: "Panen",
};

const UNKNOWN_PHASE = "Tahap Tanam";

function overdueDays(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
});

/**
 * Kanban task card (T-304, F-06): sortable, overdue styling, phase badge,
 * expandable description + comment thread, "Tandai Selesai" quick action,
 * delete with confirmation dialog. Keyboard fallback move buttons per DESIGN §9.
 */
export const TaskCard = memo(function TaskCard({
  task,
  isDragging,
  onMove,
  onEditDescription,
  onToggleDone,
  onDelete,
  onComment,
}: {
  task: KanbanTask;
  isDragging: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onEditDescription: (id: string, description: string) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onComment: (id: string, content: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    disabled: isDragging,
  });
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [comment, setComment] = useState("");

  const days = overdueDays(task.due_date);
  const overdue = days > 0 && task.status !== "selesai";
  const done = task.status === "selesai";

  const commitDescription = () => {
    onEditDescription(task.id, draft.trim());
    setEditingDesc(false);
  };

  const commitComment = () => {
    const content = comment.trim();
    if (!content) return;
    onComment(task.id, content);
    setComment("");
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border border-outline bg-surface-container-lowest p-4 transition-shadow hover:shadow-md ${
        overdue ? "border-l-4 border-l-error bg-danger-soft" : ""
      } ${done ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`font-headline line-clamp-2 text-base font-semibold text-on-surface ${
            done ? "line-through" : ""
          }`}
        >
          {task.title}
        </h3>
        <button
          type="button"
          aria-label={STRINGS.kanban.deleteAria}
          onClick={() => onDelete(task.id)}
          className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            delete
          </span>
        </button>
      </div>

      {done ? (
        <div className="mt-2 flex items-center gap-1 font-label text-xs font-bold uppercase text-[#2E7D32]">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            check_circle
          </span>
          {STRINGS.kanban.markDone}
        </div>
      ) : null}

      {task.description ? (
        <p className="mt-2 font-body line-clamp-2 text-sm text-on-surface-variant">
          {task.description}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline pt-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-on-surface-variant" aria-hidden="true">
            calendar_today
          </span>
          <span
            className={`font-label text-xs ${overdue ? "font-bold text-error" : "text-on-surface-variant"}`}
          >
            {dateFormatter.format(new Date(`${task.due_date}T00:00:00`))}
          </span>
        </div>
        {task.phase ? (
          <span className="rounded border border-outline px-2 py-0.5 font-label text-[10px] uppercase text-on-surface-variant">
            {PHASE_LABELS[task.phase] ?? UNKNOWN_PHASE}
          </span>
        ) : null}
      </div>

      {overdue ? (
        <span className="mt-2 inline-block rounded bg-error/20 px-2 py-0.5 font-label text-xs font-bold uppercase text-on-error-container">
          {STRINGS.kanban.overdue(days)}
        </span>
      ) : null}

      {task.status === "sedang_dikerjakan" && !done ? (
        <button
          type="button"
          onClick={() => onToggleDone(task.id)}
          className="mt-3 w-full rounded bg-primary py-1.5 font-button text-xs font-semibold uppercase text-on-primary transition-colors hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {STRINGS.kanban.markDone}
        </button>
      ) : null}

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={STRINGS.kanban.editDescriptionAria}
          onClick={() => {
            setDraft(task.description ?? "");
            setEditingDesc((v) => !v);
          }}
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            edit
          </span>
        </button>
        <button
          type="button"
          aria-label={STRINGS.kanban.commentsAria}
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            comment
          </span>
        </button>
        {/* Keyboard fallback move (DESIGN §9) */}
        <button
          type="button"
          aria-label={`Pindah ke kolom sebelumnya`}
          onClick={() => onMove(task.id, -1)}
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <button
          type="button"
          aria-label={`Pindah ke kolom berikutnya`}
          onClick={() => onMove(task.id, 1)}
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            arrow_forward
          </span>
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Seret untuk memindahkan"
          className="ml-auto cursor-grab rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary active:cursor-grabbing"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            drag_indicator
          </span>
        </button>
      </div>

      {editingDesc ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={STRINGS.kanban.editDescriptionAria}
            className="w-full rounded-md border border-outline bg-surface p-2 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={commitDescription}
            className="self-end rounded bg-primary px-3 py-1 font-button text-xs font-semibold uppercase text-on-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STRINGS.kanban.sendComment}
          </button>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-3 border-t border-outline pt-3">
          {task.comments && task.comments.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {task.comments.map((c) => (
                <li key={c.id} className="font-body text-xs text-on-surface-variant">
                  {c.content}
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              commitComment();
            }}
          >
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={STRINGS.kanban.commentPlaceholder}
              aria-label={STRINGS.kanban.commentPlaceholder}
              className="w-full rounded-md border border-outline bg-surface px-3 py-1.5 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="shrink-0 rounded bg-primary px-3 py-1.5 font-button text-xs font-semibold uppercase text-on-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STRINGS.kanban.sendComment}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
});