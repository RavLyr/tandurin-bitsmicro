import ReactMarkdown from "react-markdown";

const HEADING_CLASSES: Record<string, string> = {
  h1: "mt-4 mb-2 font-headline text-xl font-bold text-on-surface first:mt-0",
  h2: "mt-4 mb-2 font-headline text-lg font-semibold text-on-surface first:mt-0",
  h3: "mt-3 mb-1.5 font-headline text-base font-semibold text-on-surface first:mt-0",
};

/**
 * Markdown renderer for assistant chat replies (F-02): headings, lists, bold,
 * links, inline + block code. Link targets open in a new tab.
 * ponytail: no table/quote/image extensions; upgrade path = add components map
 * entries if Airtable/feature spec adds rich reply blocks (F-03 cards).
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="font-body text-sm leading-relaxed text-on-surface">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className={HEADING_CLASSES.h1}>{children}</h1>,
          h2: ({ children }) => <h2 className={HEADING_CLASSES.h2}>{children}</h2>,
          h3: ({ children }) => <h3 className={HEADING_CLASSES.h3}>{children}</h3>,
          p: ({ children }) => <p className="my-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-on-surface">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-1 underline-offset-2 hover:text-primary-container"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface-container px-1 py-0.5 font-label text-xs text-on-surface">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-surface-container p-3 font-label text-xs text-on-surface">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
