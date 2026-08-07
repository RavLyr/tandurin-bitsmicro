"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/i18n";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Confirmation dialog (DESIGN §4.7): focus trapped, Esc closes, initial focus
 * on the "Batal" (cancel) button. Renders nothing when closed.
 * ponytail: no portal/framer-motion; upgrade path = <Dialog> wrapper with
 * backdrop animation if Airtable adds an animated dialog component.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = STRINGS.common.delete,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const cancelButton = panel.querySelector<HTMLButtonElement>("button[data-dialog-cancel]");
    cancelButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface p-6 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
      >
        <h2 id="confirm-dialog-title" className="font-headline text-lg font-semibold text-on-surface">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 font-body text-sm text-on-surface-variant">{description}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" data-dialog-cancel onClick={onCancel}>
            {STRINGS.common.cancel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
