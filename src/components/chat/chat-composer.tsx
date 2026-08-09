"use client";

import { useState } from "react";
import { STRINGS } from "@/lib/i18n";

/**
 * Chat composer (F-02 §4.3): textarea (auto-grow) and a send button disabled
 * while streaming. Enter sends, Shift+Enter newline.
 */
export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="sticky bottom-0 z-10 mb-14 border-t border-outline-variant bg-surface-container-lowest px-5 py-4 md:mb-0 md:px-8">
      <div className="relative flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <div className="flex items-end gap-2">
          <textarea
            aria-label={STRINGS.chat.composerTextareaAria}
            rows={1}
            placeholder={STRINGS.chat.composerPlaceholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            className="max-h-[150px] min-h-[48px] flex-1 resize-none overflow-y-auto border-none bg-transparent p-3 font-body text-base text-on-surface focus:outline-none"
          />
          <button
            type="button"
            aria-label={STRINGS.chat.sendAria}
            disabled={disabled || !value.trim()}
            onClick={submit}
            className="flex flex-shrink-0 items-center justify-center rounded border border-on-surface bg-on-surface p-3 text-surface-container-lowest transition-colors hover:bg-surface-variant hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:hover:bg-on-surface disabled:hover:text-surface-container-lowest"
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
    </div>
  );
}
