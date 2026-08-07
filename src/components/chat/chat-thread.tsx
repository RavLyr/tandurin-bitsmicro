"use client";

import { useEffect, useRef } from "react";
import { STRINGS } from "@/lib/i18n";
import { MessageBubble } from "./message-bubble";

export type MessageRole = "user" | "assistant";

export interface LandConditions {
  location?: string;
  latitude?: number;
  longitude?: number;
  area_m2?: number;
}

export interface CropRecommendation {
  crop: string;
  match_percent: number;
  reason: string;
}

export interface DiagnosisItem {
  label: string;
  severity: "tinggi" | "sedang" | "rendah";
  actions: string[];
}

export interface TaskPlanItem {
  title: string;
  due_date: string;
  phase: string;
  crop?: string | null;
}

export interface MessageMetadata {
  type?: "recommendation" | "diagnosis" | "task-summary";
  land_conditions?: LandConditions | null;
  toolCalls?: Array<{ name?: string }> | null;
  recommendations?: CropRecommendation[] | null;
  diagnostics?: DiagnosisItem[] | null;
  tasks?: TaskPlanItem[] | null;
  image_path?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata | null;
  created_at: string;
}

const FENCED_JSON_RE = /```(?:json)?[\s\S]*?```/g;
const DECISION_LEAK_RE = /^.*Decision:\s*(?:Call|make)\s+[a-z_]+:[^\n]*$/gim;

/**
 * Strips model-internal plumbing from assistant text meant for display:
 * fenced ```json blocks (land_conditions metadata) and planning prose
 * ("Decision: Call default_api:..."). The /api/chat stream should already
 * discard those; this is a safety net for legacy persisted content.
 */
export function cleanAssistantContent(content: string): string {
  return content
    .replace(FENCED_JSON_RE, "")
    .replace(DECISION_LEAK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Chat thread: renders persisted messages plus the SSE stream in progress
 * (F-02 §4.3). Consumes the /api/chat stream and appends tokens to the last
 * assistant bubble; metadata events render contextual cards; "Sedang menulis..."
 * indicator is shown while tokens are pending.
 */
export function ChatThread({
  messages,
  streamingText,
  streamingMetadata,
  isStreaming,
  hasError,
  onRetry,
  onExample,
}: {
  messages: ChatMessage[];
  streamingText: string;
  streamingMetadata: MessageMetadata | null;
  isStreaming: boolean;
  hasError: boolean;
  onRetry: () => void;
  onExample: (prompt: string) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingText]);

  return (
    <div className="no-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-8 scroll-smooth md:px-8">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          metadata={message.metadata}
        />
      ))}

      {isStreaming ? (
        <>
          {streamingText ? (
            <MessageBubble role="assistant" content={streamingText} metadata={streamingMetadata} />
          ) : null}
          <div
            className="flex w-full items-center justify-start"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5 rounded-lg rounded-tl-none border border-outline-variant bg-surface px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant opacity-50" aria-hidden="true" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant opacity-50 [animation-delay:150ms]" aria-hidden="true" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant opacity-50 [animation-delay:300ms]" aria-hidden="true" />
              <span className="sr-only">{STRINGS.chat.typing}</span>
            </div>
          </div>
        </>
      ) : null}

      {messages.length === 0 && !isStreaming ? (
        <div className="flex w-full flex-col items-center gap-6 pt-6 text-center">
          <h2 className="font-display text-3xl font-bold text-on-surface md:text-4xl">
            {STRINGS.chat.welcomeTitle}
          </h2>
          <p className="max-w-md font-body text-base text-on-surface-variant">
            {STRINGS.chat.welcomeBody}
          </p>
          <div className="flex w-full max-w-md flex-col items-stretch gap-2">
            {STRINGS.chat.examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onExample(prompt)}
                className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-left font-body text-sm text-on-surface transition-colors hover:border-primary hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasError ? (
        <div className="flex w-full items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary-soft px-4 py-2 text-xs font-bold uppercase text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              refresh
            </span>
            {STRINGS.chat.retry}
          </button>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}