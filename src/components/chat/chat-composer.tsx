"use client";

import { useRef, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { toast } from "@/components/ui/use-toast";

/**
 * Chat composer (F-02 §4.3 + F-04): textarea (auto-grow), image attach
 * (client-side compress ≤1024px/≤5MB, preview, upload to /api/upload on send),
 * and a send button disabled while streaming. Enter sends, Shift+Enter newline.
 */
export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string, imagePath?: string) => void;
}) {
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadedPathRef = useRef<string | null>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || uploading) return;
    onSend(text, uploadedPathRef.current ?? undefined);
    setValue("");
    setPreview(null);
    uploadedPathRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    // F-04 §6: compress client-side via canvas (≤1024px long edge) before upload.
    const compressed = await new Promise<Blob>((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(
          (blob) => resolve(blob ?? file),
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });

    const resized = new File([compressed], "upload.jpg", { type: "image/jpeg" });
    if (resized.size > 5 * 1024 * 1024) {
      toast(STRINGS.upload.sizeTooLarge, "danger");
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(resized));
    try {
      const form = new FormData();
      form.append("image", resized);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok || !json.path) {
        setPreview(null);
        toast(json?.error ?? STRINGS.upload.uploadFailed, "danger");
        return;
      }
      uploadedPathRef.current = json.path;
    } catch {
      setPreview(null);
      toast(STRINGS.upload.uploadFailed, "danger");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
              void handleFile(file);
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
            disabled={disabled || !value.trim() || uploading}
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