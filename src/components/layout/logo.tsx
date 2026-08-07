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
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[68%] w-[68%]"
        fill="currentColor"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    </span>
  );
}