import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container disabled:hover:bg-primary",
  secondary:
    "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim disabled:hover:bg-secondary-container",
  outline:
    "border border-outline bg-surface text-on-surface hover:bg-surface-container disabled:hover:bg-surface",
  danger: "bg-error text-on-error hover:bg-on-error-container disabled:hover:bg-error",
  ghost:
    "bg-transparent text-on-surface hover:bg-surface-container disabled:hover:bg-transparent",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

/**
 * Shared button primitive (DESIGN §4.7 / §4.1).
 * ponytail: no focus ring color variants per variant; upgrade path = add
 * `--focus-ring` token when Airtable defines one (T-005 leaves it as-is).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-button uppercase tracking-wider transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ""}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
