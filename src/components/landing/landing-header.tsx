import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { STRINGS } from "@/lib/i18n";
import { CtaLink } from "./cta-link";

export function LandingHeader({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-margin-mobile lg:px-8">
        <Link
          href="/"
          aria-label={STRINGS.brand.logoAria}
          className="flex shrink-0 items-center gap-2.5 rounded focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Logo className="h-8 w-8 rounded-lg" />
          <span className="flex flex-col items-start leading-none">
            <span className="font-display text-lg font-bold text-on-surface">
              {STRINGS.brand.name}
            </span>
            <span className="hidden font-label-sm text-[9px] uppercase tracking-[0.18em] text-on-surface-variant sm:block">
              {STRINGS.brand.tagline}
            </span>
          </span>
        </Link>

        <nav
          aria-label={STRINGS.landing.header.navAria}
          className="hidden items-center gap-8 md:flex"
        >
          {STRINGS.landing.header.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {authed ? (
            <CtaLink
              href="/dashboard"
              size="sm"
              aria-label={STRINGS.landing.header.openDashboardAria}
            >
              {STRINGS.landing.header.openDashboard}
            </CtaLink>
          ) : (
            <>
              <CtaLink
                href="/login"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                {STRINGS.landing.header.signIn}
              </CtaLink>
              <CtaLink href="/register" size="sm">
                {STRINGS.landing.header.signUp}
              </CtaLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}