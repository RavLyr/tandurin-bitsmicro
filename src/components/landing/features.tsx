import { STRINGS } from "@/lib/i18n";

export function Features() {
  const { features } = STRINGS.landing;
  return (
    <section
      id="fitur"
      aria-labelledby="features-title"
      className="scroll-mt-20 bg-bg py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-margin-mobile lg:px-8">
        <p className="font-label-sm text-[10px] uppercase tracking-[0.22em] text-primary">
          {features.eyebrow}
        </p>
        <h2
          id="features-title"
          className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        >
          {features.title}
        </h2>
        <p className="mt-4 max-w-2xl text-body-md text-on-surface-variant">
          {features.body}
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((item) => (
            <li
              key={item.title}
              className="group rounded-lg border border-outline-variant bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-container text-tertiary transition-colors group-hover:bg-primary-fixed">
                <span
                  className="material-symbols-outlined text-2xl"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              </span>
              <h3 className="mt-4 font-headline text-lg font-semibold text-on-surface">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}