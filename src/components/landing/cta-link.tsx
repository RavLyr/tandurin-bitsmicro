import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type CtaLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

const VARIANTS = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  outline: "border border-outline bg-surface text-on-surface hover:bg-surface-container",
};

const SIZES = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3.5 text-base",
};

/**
 * Landing-page call-to-action link. Next Link + the button look, kept in one
 * place so every CTA on the page uses identical spacing/focus behavior.
 */
export function CtaLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-button uppercase tracking-wider transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}