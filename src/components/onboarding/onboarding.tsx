"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/i18n";

const STORAGE_KEY = "tanduri:onboarding.seen";
const SHOW_EVENT = "tanduri:show-onboarding";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * fire a custom event any component can use to reopen the guide later
 * (e.g. a "Panduan" button in the header).
 */
export function openOnboarding() {
  window.dispatchEvent(new CustomEvent(SHOW_EVENT));
}

/**
 * First-run onboarding / welcome guide (new capability, DESIGN §5.1).
 * A short, dismissible tour explaining the core loop in plain language for
 * laypeople: add a land -> chat consult -> manage tasks on the board.
 * Shows once per browser (localStorage); reopened via openOnboarding().
 *
 * ponytail: no per-step animated spotlight; upgrade path = @floating-ui/react
 * guided tour when Airtable adds a tour component.
 */
export function Onboarding({ delayMs = 800 }: { delayMs?: number }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(false);
  const steps = STRINGS.onboarding.steps;
  const total = steps.length;

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } finally {
      seenRef.current = true;
      setOpen(false);
    }
  }, []);

  const show = useCallback(() => setOpen(true), []);

  // First visit -> show once after a short delay so the board can paint.
  useEffect(() => {
    try {
      seenRef.current = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seenRef.current = false;
    }
    if (seenRef.current) return;
    const timer = window.setTimeout(show, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, show]);

  // Reopen on demand (header "Panduan" button).
  useEffect(() => {
    const handler = () => {
      if (!seenRef.current) show();
      else setOpen((v) => !v);
    };
    window.addEventListener(SHOW_EVENT, handler);
    return () => window.removeEventListener(SHOW_EVENT, handler);
  }, [show]);

  // Focus trap + Esc close (mirrors ConfirmDialog).
  useEffect(() => {
    if (!open) {
      if (seenRef.current) {
        // Reset position next time it reopens via the guide button.
        setStep(0);
      }
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;

    const primary = panel.querySelector<HTMLButtonElement>("button[data-onboarding-primary]");
    primary?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    // Lock background scroll while the tour is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismiss, step]);

  if (!open) return null;

  const slide = steps[step];
  const isLast = step === total - 1;

  const next = () => {
    if (isLast) {
      dismiss();
      return;
    }
    setStep(step + 1);
  };

  const prev = () => {
    if (step === 0) return;
    setStep(step - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={dismiss}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={STRINGS.onboarding.ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface p-6 shadow-[0_8px_24px_rgb(0_0_0/0.14)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-2xl leading-none">{slide.icon}</span>
          </span>
          <button
            type="button"
            aria-label={STRINGS.onboarding.closeAria}
            onClick={dismiss}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold text-on-surface sm:text-3xl">
          {slide.title}
        </h2>
        <p className="mt-3 font-body text-base leading-relaxed text-on-surface-variant">
          {slide.body}
        </p>

        <div
          className="mt-6 flex items-center gap-1.5"
          aria-label={STRINGS.onboarding.stepLabel(step, total)}
        >
          {steps.map((_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === step ? "w-6 bg-primary" : "w-3 bg-outline-variant"
              }`}
            />
          ))}
          <span className="ml-2 font-label text-xs text-on-surface-variant">
            {STRINGS.onboarding.stepLabel(step, total)}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={dismiss}>
            {STRINGS.onboarding.skip}
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="outline" onClick={prev}>
                {STRINGS.onboarding.prev}
              </Button>
            ) : null}
            <Button
              data-onboarding-primary
              onClick={next}
              aria-label={isLast ? STRINGS.onboarding.start : STRINGS.onboarding.next}
            >
              {isLast ? STRINGS.onboarding.start : STRINGS.onboarding.next}
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                {isLast ? "eco" : "arrow_forward"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}