"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STRINGS } from "@/lib/i18n";

export type ToastVariant = "success" | "danger" | "warning";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <Toaster>");
  return ctx;
}

let nextId = 1;

// Module-level registry so the imperative `toast()` helper (use-toast.ts) can
// dispatch without being a component (shadcn-style).
let emit: ((message: string, variant: ToastVariant) => void) | null = null;

/**
 * Toast provider (DESIGN §4.7): bottom-center stack, 4s auto-dismiss,
 * `aria-live=polite`. Mount once via <Toaster> in the root layout.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  useEffect(() => {
    emit = toast;
    return () => {
      emit = null;
    };
  }, [toast]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md border px-4 py-3 font-body text-sm shadow-[0_4px_12px_rgb(0_0_0/0.08)] ${
              t.variant === "success"
                ? "border-primary/30 bg-surface text-on-surface"
                : t.variant === "warning"
                  ? "border-kanban-progress/50 bg-surface text-on-surface"
                  : "border-error/40 bg-surface text-on-surface"
            }`}
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-lg ${
                t.variant === "success"
                  ? "text-primary"
                  : t.variant === "warning"
                    ? "text-kanban-progress"
                    : "text-error"
              }`}
            >
              {t.variant === "success" ? "check_circle" : t.variant === "warning" ? "warning" : "error"}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label={STRINGS.common.close}
              onClick={() => dismiss(t.id)}
              className="rounded p-1 text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function dispatchToast(message: string, variant: ToastVariant = "success") {
  if (emit) emit(message, variant);
}
