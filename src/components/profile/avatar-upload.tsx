"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { STRINGS } from "@/lib/i18n";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024;

function avatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//.test(avatarUrl)) return avatarUrl;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
}

export interface AvatarUploadProps {
  avatarUrl: string | null;
  onUploaded: (path: string) => void;
}

/**
 * Profile avatar picker (T-404, F-10 AC-09..11): 96px circle + "Ubah Foto".
 * Client validates jpeg/png/webp ≤ 2 MB, previews before save, uploads via
 * /api/upload/avatar. Old avatar stays on rejection or upload failure.
 * ponytail: no client-side cropping/resizing (F-10 §6); upgrade path =
 * image editor before upload.
 */
export function AvatarUpload({ avatarUrl, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const shown = preview ?? avatarSrc(avatarUrl);

  const handlePick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      toast(STRINGS.profil.avatarFormatUnsupported, "danger");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast(STRINGS.profil.avatarTooLarge, "danger");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPending(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", pending);
      const response = await fetch("/api/upload/avatar", { method: "POST", body: form });
      const json = (await response.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!response.ok || !json.path) {
        handleCancel();
        toast(json?.error ?? STRINGS.profil.avatarUploadFailed, "danger");
        return;
      }
      setPending(null);
      setPreview(null);
      onUploaded(json.path);
    } catch {
      handleCancel();
      toast(STRINGS.profil.avatarUploadFailed, "danger");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPending(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={STRINGS.profil.avatarChangeAria}
        className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic storage URL
          <img src={shown} alt={STRINGS.profil.avatarChangeAria} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-surface-container-highest text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl" aria-hidden="true">
              person
            </span>
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="material-symbols-outlined text-white" aria-hidden="true">
            photo_camera
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label={STRINGS.profil.avatarChangeAria}
        onChange={(event) => handlePick(event.target.files?.[0])}
      />

      {pending ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={uploading}
            className="rounded bg-primary px-4 py-2 font-label text-xs uppercase text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {uploading ? STRINGS.common.loading : STRINGS.profil.avatarSave}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            className="rounded border border-outline px-4 py-2 font-label text-xs uppercase text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STRINGS.common.cancel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border border-outline px-4 py-2 font-label text-xs uppercase text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STRINGS.profil.changePhoto}
        </button>
      )}
    </div>
  );
}