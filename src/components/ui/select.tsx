import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

/**
 * Shared native select with label (no dependency; DESIGN §4.7).
 * ponytail: native <select> instead of a custom dropdown; upgrade path =
 * headless-listbox component if Airtable adds a menu component.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={selectId}
            className="font-label text-xs uppercase tracking-wider text-on-surface-variant"
          >
            {label}
          </label>
        ) : null}
        <div className="relative w-full">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none rounded-md border border-outline-variant bg-surface px-3 py-2 pr-9 font-body text-sm text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${className ?? ""}`}
            {...props}
          >
            {children}
          </select>
          <span
            className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
            aria-hidden="true"
          >
            expand_more
          </span>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
