import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { STRINGS } from "@/lib/i18n";

export function Footer() {
  const { footer } = STRINGS.landing;
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-margin-mobile py-12 text-center md:flex-row md:justify-between md:text-left lg:px-8">
        <Link
          href="/"
          className="flex flex-col items-center gap-2 rounded focus:outline-none focus:ring-2 focus:ring-primary md:items-start"
        >
          <span className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-bold">
              {STRINGS.brand.name}
            </span>
          </span>
          <span className="font-label-sm text-[10px] uppercase tracking-[0.18em] text-inverse-on-surface/70">
            {STRINGS.brand.tagline}
          </span>
        </Link>

        <p className="max-w-md text-sm leading-relaxed text-inverse-on-surface/80">
          {footer.credit}
        </p>

        <nav
          aria-label={STRINGS.landing.header.navAria}
          className="flex items-center gap-6 font-semibold uppercase"
        >
          <Link
            href="/login"
            className="rounded px-1 text-sm transition-colors hover:text-inverse-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {footer.signIn}
          </Link>
          <Link
            href="/register"
            className="rounded px-1 text-sm transition-colors hover:text-inverse-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {footer.signUp}
          </Link>
        </nav>
      </div>
    </footer>
  );
}