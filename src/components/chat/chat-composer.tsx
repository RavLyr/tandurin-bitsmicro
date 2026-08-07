"use client";

import { useRef, useState } from "react";
import { STRINGS } from "@/lib/i18n";

/**
 * Chat composer (F-02 §4.3): textarea (auto-grow), attach button (image
 * preview), and a send button disabled while streaming. Enter sends, Shift+Enter
 * adds a newline.
 */
export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    setPreview(null);
  };

  return (
    <div className="sticky bottom-0 z-10 mb-14 border-t border-outline-variant bg-surface-container-lowest px-5 py-4 md:mb-0 md:px-8">
      <div className="relative flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        {preview ? (
          <div className="relative w-fit">
            {/* ponytail: client-side preview only; upload wiring lands with T-401 (F-04). */}
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URI thumbnail; next/image cannot serve runtime data URLs. */}
            <img
              src={preview}
              alt={STRINGS.chat.attachPreviewAlt}
              className="h-24 w-24 rounded-md object-cover"
            />
            <button
              type="button"
              aria-label={STRINGS.chat.attachRemoveAria}
              onClick={() => {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-on-surface text-xs text-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setPreview(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
          <button
            type="button"
            aria-label={STRINGS.chat.attachAria}
            onClick={() => fileRef.current?.click()}
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