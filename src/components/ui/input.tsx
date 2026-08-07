import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Shared text input with label (DESIGN §4.1 register style: bordered).
 * For the underline style used on /login, pass `variant="underline"` classes
 * via className until T-101 decides on a dedicated variant prop.
 * ponytail: underline variant not implemented as prop; upgrade path = add
 * `variant: "bordered" | "underline"` when auth pages wire real forms (T-101).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="font-label text-xs uppercase tracking-wider text-on-surface-variant"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            error ? "border-error" : ""
          } ${className ?? ""}`}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {error ? (
          <p role="alert" className="font-body text-xs text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
