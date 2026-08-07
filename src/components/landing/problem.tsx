import { STRINGS } from "@/lib/i18n";

export function Problem() {
  const { problem } = STRINGS.landing;
  return (
    <section
      aria-labelledby="problem-title"
      className="bg-bg py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-margin-mobile lg:px-8">
        <p className="font-label-sm text-[10px] uppercase tracking-[0.22em] text-primary">
          {problem.eyebrow}
        </p>
        <h2
          id="problem-title"
          className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        >
          {problem.title}
        </h2>
        <p className="mt-4 max-w-2xl text-body-md text-on-surface-variant">
          {problem.body}
        </p>

        <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problem.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-outline-variant bg-surface p-6 shadow-sm"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-display text-4xl font-bold text-primary">
                  {stat.value}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-on-surface-variant">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}