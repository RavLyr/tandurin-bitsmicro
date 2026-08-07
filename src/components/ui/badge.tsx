import type { HTMLAttributes } from "react";

export type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-primary/15 text-primary",
  warning: "bg-kanban-progress/20 text-on-surface",
  danger: "bg-error/15 text-error",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

/**
 * Small status pill (DESIGN §4.7 / kanban phase badges).
 * ponytail: `success` reuses primary green (no separate token in DESIGN §2);
 * upgrade path = `--success` token from Airtable when defined.
 */
export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-label text-xs ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
