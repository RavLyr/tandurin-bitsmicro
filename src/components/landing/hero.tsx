import { Logo } from "@/components/layout/logo";
import { STRINGS } from "@/lib/i18n";
import { CtaLink } from "./cta-link";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-gradient-to-b from-surface-container-low via-bg to-bg"
    >
      <SproutDecoration />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-margin-mobile py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-24">
        <div className="relative z-10">
          <p className="font-label-sm text-[10px] uppercase tracking-[0.22em] text-primary">
            {STRINGS.landing.hero.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-display-lg-mobile font-bold tracking-tight text-on-surface md:text-display-lg"
          >
            {STRINGS.landing.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-body-md text-on-surface-variant">
            {STRINGS.landing.hero.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaLink
              href="/register"
              size="lg"
              aria-label={STRINGS.landing.hero.ctaPrimaryAria}
            >
              {STRINGS.landing.hero.ctaPrimary}
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                arrow_forward
              </span>
            </CtaLink>
            <a
              href="#cara-kerja"
              className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 font-button text-sm uppercase tracking-wider text-on-surface transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STRINGS.landing.hero.ctaSecondary}
            </a>
          </div>
          <p className="mt-6 font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
            {STRINGS.landing.hero.trust}
          </p>
        </div>

        <ChatMock />
      </div>
    </section>
  );
}

function SproutDecoration() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 text-primary-fixed opacity-40"
      fill="currentColor"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function ChatMock() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="absolute -inset-5 rounded-[2rem] bg-primary-fixed/25 blur-2xl" />
      <div className="relative flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface p-5 shadow-md">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 rounded-md" />
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
              {STRINGS.landing.mock.header}
            </span>
          </div>
          <span className="rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-[9px] uppercase tracking-widest text-on-surface-variant">
            {STRINGS.landing.mock.landChip}
          </span>
        </div>

        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-md rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-on-primary">
            {STRINGS.landing.mock.userBubble}
          </p>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[88%] rounded-md rounded-tl-sm border border-outline-variant bg-surface-container-low p-4">
            <p className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
              {STRINGS.landing.mock.assistantLabel}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-headline text-base font-semibold text-on-surface">
                {STRINGS.landing.mock.crop}
              </span>
              <span className="rounded-full bg-primary-fixed-dim px-2.5 py-0.5 font-label-sm text-[10px] font-bold uppercase tracking-wide text-on-primary-fixed">
                {STRINGS.landing.mock.match}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              {STRINGS.landing.mock.reason}
            </p>
            <p className="mt-3 text-sm font-medium text-on-surface">
              {STRINGS.landing.mock.confirmQuestion}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-button text-xs uppercase tracking-wider text-on-primary">
              {STRINGS.landing.mock.confirm}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}