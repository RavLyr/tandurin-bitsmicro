"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";

/**
 * /chat — Consultation (Stitch screen-ui/code(6).html).
 * Prototype port: sidebar + thread + composer with empty state; SSE wiring lands in T-204.
 * ponytail: no markdown renderer / no conversation persistence yet;
 * upgrade path = react-markdown (T-204) + conversations table (T-203/T-403).
 */
const EXAMPLE_PROMPTS = STRINGS.chat.examplePrompts;

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");

  return (
    <>
      <AppHeader activePath="chat" />
      <main className="w-full pt-16">
        <div className="relative flex w-full min-h-[calc(100vh-64px)] flex-col md:flex-row">
          {/* Conversation list sidebar */}
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
                  placeholder={STRINGS.chat.searchPlaceholder}
                  className="w-full appearance-none rounded-none border-b border-outline-variant bg-transparent pb-2 pl-8 font-body text-base text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4 md:px-6">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-outline-variant p-6 text-center">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant" aria-hidden="true">
                  forum
                </span>
                <p className="font-body text-sm text-on-surface-variant">{STRINGS.chat.emptyConversations}</p>
              </div>
            </div>
          </aside>

          {/* Main chat area */}
          <main className="relative flex h-[calc(100vh-64px-56px)] w-full flex-col overflow-hidden bg-surface-container-lowest md:h-[calc(100vh-64px)]">
            <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-6 md:px-8">
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
                <div className="flex min-w-0 flex-col gap-2">
                  <h1 className="font-display m-0 truncate text-4xl font-bold text-on-surface">
                    {STRINGS.chat.title}
                  </h1>
                </div>
              </div>
              <button
                type="button"
                className="hidden flex-shrink-0 items-center gap-2 rounded border-2 border-on-surface bg-on-surface px-6 py-2 text-sm font-bold uppercase text-surface-container-lowest transition-colors hover:bg-surface hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary md:flex"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
                {STRINGS.chat.newChat}
              </button>
              <button
                type="button"
                aria-label={STRINGS.chat.newChatAria}
                className="rounded-full bg-on-surface p-2 text-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
              </button>
            </header>

            {/* Thread */}
            <div className="no-scrollbar flex flex-1 flex-col gap-8 overflow-y-auto px-5 py-8 scroll-smooth md:px-8">
              <div className="flex w-full flex-col items-center gap-6 pt-6 text-center">
                <h2 className="font-display text-3xl font-bold text-on-surface md:text-4xl">
                  {STRINGS.chat.welcomeTitle}
                </h2>
                <p className="max-w-md font-body text-base text-on-surface-variant">
                  {STRINGS.chat.welcomeBody}
                </p>
                <div className="no-scrollbar flex max-w-xl flex-wrap justify-center gap-2 overflow-x-auto">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="whitespace-normal rounded-full border border-outline px-4 py-2 font-label text-xs text-on-surface transition-colors hover:border-primary hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Composer */}
            <div className="sticky bottom-0 z-10 mb-14 border-t border-outline-variant bg-surface-container-lowest px-5 py-4 md:mb-0 md:px-8">
              <div className="relative flex items-end gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <button
                  type="button"
                  aria-label={STRINGS.chat.attachAria}
                  className="flex flex-shrink-0 rounded p-3 text-on-surface-variant transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    add_photo_alternate
                  </span>
                </button>
                <textarea
                  aria-label={STRINGS.chat.composerTextareaAria}
                  rows={1}
                  placeholder={STRINGS.chat.composerPlaceholder}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="max-h-[150px] min-h-[48px] flex-1 resize-none overflow-y-auto border-none bg-transparent p-3 font-body text-base text-on-surface focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={STRINGS.chat.sendAria}
                  className="flex flex-shrink-0 items-center justify-center rounded border border-on-surface bg-on-surface p-3 text-surface-container-lowest transition-colors hover:bg-surface-variant hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    send
                  </span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </main>
      <BottomNav activePath="chat" />
    </>
  );
}