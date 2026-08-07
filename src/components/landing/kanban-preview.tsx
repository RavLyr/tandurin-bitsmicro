import { STRINGS } from "@/lib/i18n";

const COLUMN_DOTS = ["bg-error", "bg-[#E3A334]", "bg-[#2E7D32]"];

export function KanbanPreview() {
  const { kanbanPreview } = STRINGS.landing;
  return (
    <section
      aria-labelledby="kanban-title"
      className="bg-surface-container-low py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-margin-mobile lg:px-8">
        <p className="font-label-sm text-[10px] uppercase tracking-[0.22em] text-primary">
          {kanbanPreview.eyebrow}
        </p>
        <h2
          id="kanban-title"
          className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
        >
          {kanbanPreview.title}
        </h2>
        <p className="mt-4 max-w-2xl text-body-md text-on-surface-variant">
          {kanbanPreview.body}
        </p>

        <div
          role="img"
          aria-label={STRINGS.landing.mock.aria}
          className="mt-10 grid gap-5 overflow-x-auto pb-2 sm:grid-cols-3 no-scrollbar"
        >
          {kanbanPreview.columns.map((column, colIndex) => (
            <div
              key={column.name}
              className="min-w-[240px] rounded-lg border border-outline-variant bg-surface p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 border-b-2 border-outline-variant pb-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${COLUMN_DOTS[colIndex]}`}
                />
                <h3 className="font-headline text-sm font-semibold text-on-surface">
                  {column.name}
                </h3>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {column.tasks.map((task) => {
                  const overdue = "overdue" in task ? task.overdue : undefined;
                  return (
                    <div
                      key={task.title}
                      className={`rounded-lg border border-outline-variant p-3 ${
                        overdue
                          ? "border-l-4 border-l-error bg-danger-soft"
                          : "bg-surface-container-lowest"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium text-on-surface ${
                          colIndex === 2 ? "line-through opacity-75" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      {overdue ? (
                        <span className="mt-1.5 inline-block rounded bg-error/15 px-1.5 py-0.5 font-label-sm text-[9px] font-bold uppercase tracking-wide text-on-error-container">
                          {overdue}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}