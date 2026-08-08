"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cleanAssistantContent } from "@/components/chat/chat-thread";
import { LandGate } from "@/components/land-gate";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";

interface ConversationOverview {
  id: string;
  title: string;
  land_id: string | null;
  land_name: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string | null;
  last_role: "user" | "assistant" | null;
}

/** Message.role is enforced by a CHECK constraint (001_init.sql). */
type MessageRole = "user" | "assistant";

interface MessageMetadata {
  type?: "recommendation" | "diagnosis";
  image_path?: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

let browserClient: ReturnType<typeof createClient> | null = null;
function getBrowserClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

/** Thread image from photo diagnosis (F-04): private bucket, client-signed URL. */
function ThreadImage({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBrowserClient()
      .storage.from("plant-images")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setSrc(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic signed storage URL
    <img src={src} alt={alt} className="mt-3 max-h-64 w-full rounded-md object-cover" />
  ) : (
    <Skeleton className="mt-3 h-32 w-full" />
  );
}

function MessageBadges({ metadata }: { metadata: MessageMetadata | null }) {
  if (!metadata) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {metadata.type === "recommendation" ? (
        <Badge variant="primary">{STRINGS.riwayat.badgeRecommendation}</Badge>
      ) : null}
      {metadata.type === "diagnosis" ? (
        <Badge variant="warning">{STRINGS.riwayat.badgeDiagnosis}</Badge>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg ${
          isAssistant
            ? "border border-outline-variant bg-surface p-3"
            : "bg-primary px-4 py-2.5 text-on-primary"
        }`}
      >
        {isAssistant ? (
          <>
            <MessageBadges metadata={message.metadata} />
            <Markdown content={cleanAssistantContent(message.content)} />
          </>
        ) : (
          <p className="font-body text-sm text-on-primary">{message.content}</p>
        )}
        {message.metadata?.image_path ? (
          <ThreadImage path={message.metadata.image_path} alt={STRINGS.riwayat.imageAlt} />
        ) : null}
      </div>
    </div>
  );
}

function ThreadView({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

/**
 * /riwayat — Consultation history (F-08, DESIGN §4.4).
 * List via GET /api/conversations (metadata + count + last preview only);
 * clicking a card expands the full thread fetched with the anon client + RLS
 * (F-08 §5 read path). Delete is optimistic through /api/conversations/[id].
 */
export default function RiwayatPage() {
  const [conversations, setConversations] = useState<ConversationOverview[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPage = useCallback(async (offset: number) => {
    const response = await fetch(`/api/conversations?limit=${PAGE_SIZE}&offset=${offset}`);
    if (!response.ok) {
      throw new Error("conversations request failed");
    }
    return (await response.json()) as {
      conversations: ConversationOverview[];
      has_more: boolean;
    };
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchPage(0);
      setConversations(page.conversations);
      setHasMore(page.has_more);
    } catch {
      toast(STRINGS.riwayat.loadFailed, "danger");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    try {
      const page = await fetchPage(conversations.length);
      setConversations((current) => [...current, ...page.conversations]);
      setHasMore(page.has_more);
    } catch {
      toast(STRINGS.riwayat.loadFailed, "danger");
    }
  }, [fetchPage, conversations.length]);

  const openThread = useCallback(
    async (id: string) => {
      setExpandedId(id);
      if (threads[id]) return;
      setLoadingThreadId(id);
      const { data, error } = await getBrowserClient()
        .from("messages")
        .select("id, conversation_id, role, content, metadata, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) {
        toast(STRINGS.riwayat.threadFailed, "danger");
      } else {
        setThreads((current) => ({ ...current, [id]: (data ?? []) as ChatMessage[] }));
      }
      setLoadingThreadId((current) => (current === id ? null : current));
    },
    [threads]
  );

  const toggleOpen = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    void openThread(id);
  };

  const handleDelete = useCallback(async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      const response = await fetch(`/api/conversations/${confirmId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error("conversation delete failed");
      }
      setConversations((current) => current.filter((c) => c.id !== confirmId));
      setThreads((current) => {
        const next = { ...current };
        delete next[confirmId];
        return next;
      });
      setExpandedId((current) => (current === confirmId ? null : current));
    } catch {
      toast(STRINGS.riwayat.deleteFailed, "danger");
    } finally {
      setDeletingId(null);
    }
  }, [confirmId]);

  const query = useMemo(() => search.trim().toLowerCase(), [search]);

  const filtered = useMemo(() => {
    if (!query) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(query));
  }, [conversations, query]);

  const searching = query.length > 0;

  return (
    <>
      <AppHeader activePath="riwayat" />
      <main className="w-full pt-16">
        <LandGate>
          <div className="flex w-full flex-col px-margin-mobile py-8 md:px-margin-desktop md:py-16">
          <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="flex flex-col gap-4">
              <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-on-surface md:text-5xl">
                {STRINGS.riwayat.title}
              </h1>
              <p className="max-w-2xl font-body text-base text-on-surface-variant md:text-lg">
                {STRINGS.riwayat.subtitle}
              </p>
            </div>
            <div className="relative w-full flex-shrink-0 md:w-[320px]">
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-on-surface-variant"
                aria-hidden="true"
              >
                search
              </span>
              <input
                aria-label={STRINGS.riwayat.searchAria}
                type="text"
                placeholder={STRINGS.riwayat.searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-full border-none bg-surface-container-high py-3 pl-12 pr-4 font-body text-on-surface outline-none transition-shadow placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-6 rounded-xl bg-surface-container-highest p-10 text-center">
              <span
                className="material-symbols-outlined text-3xl text-on-surface-variant"
                aria-hidden="true"
              >
                history
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="font-headline text-xl font-semibold text-on-surface">
                  {STRINGS.riwayat.emptyTitle}
                </h2>
                <p className="font-body text-sm text-on-surface-variant">
                  {STRINGS.riwayat.emptyBody}
                </p>
              </div>
              <Link
                href="/chat"
                className="flex items-center gap-2 rounded bg-primary px-6 py-3 font-button uppercase text-on-primary transition-all duration-300 hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {STRINGS.riwayat.cta}
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant" aria-hidden="true">
                search
              </span>
              <p className="font-body text-sm text-on-surface-variant">{STRINGS.riwayat.emptySearch}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {filtered.map((conv) => {
                  const isOpen = expandedId === conv.id;
                  const thread = threads[conv.id];
                  const threadLoading = loadingThreadId === conv.id;
                  const deleting = deletingId === conv.id;
                  return (
                    <article
                      key={conv.id}
                      className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start">
                        <button
                          type="button"
                          onClick={() => toggleOpen(conv.id)}
                          aria-expanded={isOpen}
                          aria-label={STRINGS.riwayat.openAria}
                          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 px-5 py-4 text-left focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <h3 className="truncate font-headline text-lg font-semibold text-on-surface">
                            {conv.title.length > 60 ? conv.title.slice(0, 60) : conv.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-body text-xs text-on-surface-variant">
                              {formatDate(conv.updated_at)}
                            </span>
                            {conv.land_name ? (
                              <Badge variant="neutral">{STRINGS.riwayat.landBadge(conv.land_name)}</Badge>
                            ) : null}
                            <span className="font-body text-xs text-on-surface-variant">
                              {STRINGS.riwayat.messageCount(conv.message_count)}
                            </span>
                          </div>
                          {conv.last_message ? (
                            <p className="line-clamp-2 font-body text-sm text-on-surface-variant">
                              {cleanAssistantContent(conv.last_message)}
                            </p>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(conv.id)}
                          aria-label={STRINGS.riwayat.deleteAria}
                          disabled={deleting || deletingId !== null}
                          className="m-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        >
                          {deleting ? (
                            <span
                              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">
                              delete
                            </span>
                          )}
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="border-t border-outline-variant bg-surface-container-lowest/50 px-5 py-4">
                          {threadLoading ? (
                            <div className="flex flex-col gap-3" aria-busy="true">
                              <Skeleton className="h-4 w-3/4 rounded" />
                              <Skeleton className="h-4 w-2/3 rounded" />
                              <Skeleton className="ml-auto h-8 w-1/2 rounded" />
                            </div>
                          ) : thread && thread.length > 0 ? (
                            <ThreadView messages={thread} />
                          ) : null}
                        </div>
                      ) : null}

                      <div className="border-t border-outline-variant px-5 py-3">
                        <Link
                          href={`/chat?conversation_id=${conv.id}`}
                          className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:text-primary-container focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                        >
                          {STRINGS.riwayat.continue}
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {!searching && hasMore ? (
                <div className="mt-14 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="font-button uppercase text-on-surface underline underline-offset-4 transition-colors hover:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {STRINGS.riwayat.loadMore}
                  </button>
                </div>
              ) : null}
            </>
          )}
          </div>
        </LandGate>
      </main>

      <ConfirmDialog
        open={confirmId !== null}
        title={STRINGS.riwayat.deleteConfirm}
        description={STRINGS.riwayat.deleteConfirmBody}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmId(null)}
      />
      <BottomNav activePath="riwayat" />
    </>
  );
}