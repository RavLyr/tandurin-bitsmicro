"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatThread, cleanAssistantContent, type ChatMessage, type MessageMetadata } from "@/components/chat/chat-thread";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";

interface ConversationOverview {
  id: string;
  title: string;
  updated_at: string;
  last_message: string | null;
  land_name: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatSidebarDate(iso: string) {
  const then = new Date(iso);
  const now = new Date();
  const sameDay =
    then.getUTCDate() === now.getUTCDate() &&
    then.getUTCMonth() === now.getUTCMonth() &&
    then.getUTCFullYear() === now.getUTCFullYear();
  if (sameDay) return STRINGS.chat.today;
  return dateFormatter.format(then);
}

/**
 * /chat — consultation with the Agronomist agent (T-204, F-02).
 * Sidebar lists conversations; the thread streams SSE tokens from POST
 * /api/chat, appends them to the assistant bubble, and renders metadata
 * cards. `/chat?conversation_id=X` preloads the persisted thread.
 */
export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("conversation_id");

  const [conversations, setConversations] = useState<ConversationOverview[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(requestedId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMetadata, setStreamingMetadata] = useState<MessageMetadata | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeLandName, setActiveLandName] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const bootRef = useRef(false);

  const loadConversations = useCallback(async () => {
    try {
      const url = `/api/conversations${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = (await response.json()) as { conversations: ConversationOverview[] };
        setConversations(json.conversations ?? []);
      } else {
        setConversations([]);
      }
    } catch {
      setConversations([]);
    }
  }, [search]);

  const preloadThread = useCallback(async (id: string) => {
    const client = createClient();
    const { data } = await client
      .from("messages")
      .select("id, conversation_id, role, content, metadata, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages(
      ((data ?? []) as ChatMessage[]).map((m) => ({
        ...m,
        metadata: (m.metadata as MessageMetadata | null) ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    if (requestedId) {
      setConversationId(requestedId);
      void preloadThread(requestedId);
    }
    void loadConversations();
  }, [requestedId, preloadThread, loadConversations]);

  // Active land chip (F-02 header "Lahan: <name>").
  useEffect(() => {
    void fetch("/api/lands")
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { data?: Array<{ name: string; is_active: boolean }> } | null) => {
        const active = json?.data?.find((land) => land.is_active);
        setActiveLandName(active?.name ?? null);
      })
      .catch(() => setActiveLandName(null));
  }, []);

  const selectConversation = (id: string) => {
    setConversationId(id);
    setMessages([]);
    setSidebarOpen(false);
    void preloadThread(id);
    router.replace(`/chat?conversation_id=${id}`);
  };

  const startNew = () => {
    setConversationId(null);
    setMessages([]);
    setStreamingText("");
    router.replace("/chat");
  };

  const lastUserMessageRef = useRef<string | null>(null);
  const metadataRef = useRef<MessageMetadata | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      lastUserMessageRef.current = text;
      const body: { message: string; conversation_id?: string } = { message: text };
      if (conversationId) body.conversation_id = conversationId;

      const localId = `local-user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: localId,
          conversation_id: conversationId ?? "",
          role: "user",
          content: text,
          metadata: null,
          created_at: new Date().toISOString(),
        },
      ]);

      setStreamingText("");
      setStreamingMetadata(null);
      metadataRef.current = null;
      setHasError(false);
      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) {
          const err = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? response.statusText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let event: { type?: string; text?: string; data?: unknown };
            try {
              event = JSON.parse(line.slice(6)) as { type?: string; text?: string; data?: unknown };
            } catch {
              continue;
            }
            if (event.type === "token") {
              accumulated += event.text ?? "";
              setStreamingText(accumulated);
            } else if (event.type === "metadata") {
              metadataRef.current = (event.data as MessageMetadata | null) ?? null;
              setStreamingMetadata(metadataRef.current);
            } else if (event.type === "error") {
              throw new Error(STRINGS.chat_errors.aiUnavailable);
            }
          }
        }

        // Keep the streamed assistant reply in the thread locally; refresh
        // the sidebar so the new/updated conversation appears on top.
        const assistantId = `local-ai-${Date.now()}`;
        setMessages((prev) => {
          if (prev.some((m) => m.id === assistantId)) return prev;
          return [
            ...prev,
            {
              id: assistantId,
              conversation_id: conversationId ?? "",
              role: "assistant",
              content: accumulated.trim() || STRINGS.chat_errors.aiUnavailable,
              metadata: metadataRef.current,
              created_at: new Date().toISOString(),
            },
          ];
        });
        void loadConversations();
      } catch {
        setHasError(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `local-err-${Date.now()}`,
            conversation_id: conversationId ?? "",
            role: "assistant",
            content: STRINGS.chat_errors.aiUnavailable,
            metadata: null,
            created_at: new Date().toISOString(),
          },
        ]);
        void loadConversations();
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        setStreamingMetadata(null);
        metadataRef.current = null;
      }
    },
    [conversationId, loadConversations]
  );
  const retryLast = () => {
    if (lastUserMessageRef.current && !isStreaming) {
      void sendMessage(lastUserMessageRef.current);
    }
  };

  return (
    <>
      <AppHeader activePath="chat" />
      <main className="w-full pt-16">
        <div className="relative flex w-full min-h-[calc(100vh-64px)] flex-col md:flex-row">
          <aside
            className={`absolute z-20 flex h-[calc(100vh-64px-56px)] w-full flex-shrink-0 flex-col overflow-hidden border-r border-outline-variant bg-surface transition-transform duration-300 md:static md:h-[calc(100vh-64px)] md:w-[350px] md:translate-x-0 lg:w-[400px] ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="sticky top-0 z-10 flex flex-col gap-6 border-b border-outline-variant bg-surface/90 p-5 backdrop-blur md:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-headline m-0 text-3xl font-semibold text-on-surface">
                  {STRINGS.chat.sidebarTitle}
                </h2>
                <button
                  type="button"
                  aria-label={STRINGS.chat.sidebarCloseAria}
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full p-2 text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
              <div className="relative w-full">
                <span
                  className="material-symbols-outlined absolute bottom-2 left-0 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  aria-label={STRINGS.chat.searchAria}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={STRINGS.chat.searchPlaceholder}
                  className="w-full appearance-none rounded-none border-b border-outline-variant bg-transparent pb-2 pl-8 font-body text-base text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4 md:px-6">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-outline-variant p-6 text-center">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant" aria-hidden="true">
                    forum
                  </span>
                  <p className="font-body text-sm text-on-surface-variant">{STRINGS.chat.emptyConversations}</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectConversation(conv.id)}
                    className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      conv.id === conversationId
                        ? "border-primary bg-primary-soft"
                        : "border-outline-variant bg-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-headline text-sm font-semibold text-on-surface">
                        {conv.title}
                      </span>
                      <span className="shrink-0 font-label text-xs text-on-surface-variant">
                        {formatSidebarDate(conv.updated_at)}
                      </span>
                    </div>
                    {conv.last_message ? (
                      <p className="truncate font-body text-sm text-on-surface-variant">
                        {cleanAssistantContent(conv.last_message)}
                      </p>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="relative flex h-[calc(100vh-64px-56px)] w-full flex-col overflow-hidden bg-surface-container-lowest md:h-[calc(100vh-64px)]">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant px-5 py-4 md:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  aria-label={STRINGS.chat.sidebarOpenAria}
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-full p-2 -ml-2 text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    menu_open
                  </span>
                </button>
                <div className="flex min-w-0 flex-col gap-1">
                  <h1 className="font-display m-0 truncate text-2xl font-bold text-on-surface md:text-3xl">
                    {STRINGS.chat.title}
                  </h1>
                  {activeLandName ? (
                    <span className="truncate font-label text-xs text-on-surface-variant">
                      {STRINGS.chat.landChip(activeLandName)}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={startNew}
                className="flex flex-shrink-0 items-center gap-2 rounded border-2 border-on-surface bg-on-surface p-2 px-4 text-sm font-bold uppercase text-surface-container-lowest transition-colors hover:bg-surface hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
                <span className="hidden md:inline">{STRINGS.chat.newChat}</span>
                <span className="sr-only md:hidden">{STRINGS.chat.newChatAria}</span>
              </button>
            </header>

            <ChatThread
              messages={messages}
              streamingText={streamingText}
              streamingMetadata={streamingMetadata}
              isStreaming={isStreaming}
              hasError={hasError}
              onRetry={retryLast}
              onExample={(prompt) => void sendMessage(prompt)}
            />

            <ChatComposer disabled={isStreaming} onSend={(text) => void sendMessage(text)} />
          </main>
        </div>
      </main>
      <BottomNav activePath="chat" />
    </>
  );
}