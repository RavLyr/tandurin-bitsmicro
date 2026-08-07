import type { HTMLAttributes } from "react";

/**
 * Shared surface card (DESIGN §4.1: `bg-surface rounded-lg border`).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-outline-variant bg-surface p-6 ${className ?? ""}`}
      {...props}
    />
  );
}
