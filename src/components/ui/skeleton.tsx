import type { HTMLAttributes } from "react";

/**
 * Loading placeholder block (DESIGN §4.7: pulse on surface-container-low).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-container-low ${className ?? ""}`}
      {...props}
    />
  );
}
