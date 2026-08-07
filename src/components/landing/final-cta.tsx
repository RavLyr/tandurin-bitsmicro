import { STRINGS } from "@/lib/i18n";
import { CtaLink } from "./cta-link";

export function FinalCta() {
  const { finalCta } = STRINGS.landing;
  return (
    <section
      aria-labelledby="final-cta-title"
      className="bg-surface-container-low py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-margin-mobile text-center lg:px-8">
        <h2
          id="final-cta-title"
          className="font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        >
          {finalCta.title}
        </h2>
        <p className="mt-4 max-w-xl text-body-md text-on-surface-variant">
          {finalCta.body}
        </p>
        <CtaLink href="/register" size="lg" className="mt-8">
          {finalCta.cta}
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            arrow_forward
          </span>
        </CtaLink>
      </div>
    </section>
  );
}