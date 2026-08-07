import { STRINGS } from "@/lib/i18n";

export function HowItWorks() {
  const { howItWorks } = STRINGS.landing;
  return (
    <section
      id="cara-kerja"
      aria-labelledby="how-title"
      className="scroll-mt-20 bg-surface-container-low py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-margin-mobile lg:px-8">
        <p className="font-label-sm text-[10px] uppercase tracking-[0.22em] text-primary">
          {howItWorks.eyebrow}
        </p>
        <h2
          id="how-title"
          className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        >
          {howItWorks.title}
        </h2>
        <p className="mt-4 max-w-2xl text-body-md text-on-surface-variant">
          {howItWorks.body}
        </p>

        <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {howItWorks.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-lg border border-outline-variant bg-surface p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-button text-sm text-on-primary">
                {index + 1}
              </span>
              <h3 className="mt-4 font-headline text-lg font-semibold text-on-surface">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}