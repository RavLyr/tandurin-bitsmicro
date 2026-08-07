import { STRINGS } from "@/lib/i18n";

export function Faq() {
  const { faq } = STRINGS.landing;
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 bg-bg py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-3xl px-margin-mobile lg:px-8">
        <p className="font-label-sm text-center text-[10px] uppercase tracking-[0.22em] text-primary">
          {faq.eyebrow}
        </p>
        <h2
          id="faq-title"
          className="mt-4 text-center font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        >
          {faq.title}
        </h2>

        <div className="mt-10 space-y-3">
          {faq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-outline-variant bg-surface shadow-sm open:border-primary"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-headline text-base font-semibold text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  className="material-symbols-outlined shrink-0 text-xl text-on-surface-variant transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-on-surface-variant">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}