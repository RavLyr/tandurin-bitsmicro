import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client (server-only env vars). Storage writes go through the
 * authenticated server client so owner-id path placement is enforced.
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024;

/**
 * POST /api/upload/avatar — store a profile avatar (T-404, F-10).
 * Multipart field `image`; validated type + size (jpeg/png/webp ≤ 2 MB),
 * uploaded to the public `avatars` bucket at `{user_id}/avatar.{ext}`.
 * One path per user: re-upload overwrites the same object (no orphans).
 * Returns the storage path (bucket is public-read, F-10 §5).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.profil_errors.unauthorized }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: STRINGS.upload.invalidBody }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: STRINGS.upload.invalidBody }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: STRINGS.profil.avatarFormatUnsupported }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: STRINGS.profil.avatarTooLarge }, { status: 400 });
  }

  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${user.id}/avatar.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const service = createServiceClient();
  const { error } = await service.storage
    .from("avatars")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[api/upload/avatar] storage error:", error);
    return NextResponse.json({ error: STRINGS.profil.avatarUploadFailed }, { status: 500 });
  }

  return NextResponse.json({ path, mime_type: file.type });
}