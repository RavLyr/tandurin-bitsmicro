import { STRINGS } from "@/lib/i18n";

type LogoProps = {
  className?: string;
};

/**
 * Brand mark for Tanduri — a sprout glyph on the primary surface.
 * Replaces the Stitch `<img>` logo so the UI has no dependency on remote assets.
 */
export function Logo({ className = "h-8 w-auto" }: LogoProps) {
  return (
    <span
      role="img"
      aria-label={STRINGS.brand.logoAria}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary ${className}`}
    >
      <img src="/main-logo.svg" alt="" />
    </span>
  );
}