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
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload — store a diagnosis / avatar image (T-401, F-04).
 * Multipart field `image`; validated type + size, uploaded to the private
 * `plant-images` bucket at `{user_id}/{timestamp}-{slug}.jpg`. Returns the
 * storage path (no public URL — private bucket, F-04 §4).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
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
    return NextResponse.json({ error: STRINGS.upload.formatUnsupported }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: STRINGS.upload.sizeTooLarge }, { status: 400 });
  }

  const slugBase = (file.name.replace(/\.[^.]+$/, "") || "image")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${user.id}/${Date.now()}-${slugBase || "image"}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const service = createServiceClient();
  const { error } = await service.storage
    .from("plant-images")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[api/upload] storage error:", error);
    return NextResponse.json({ error: STRINGS.upload.uploadFailed }, { status: 500 });
  }

  return NextResponse.json({ path, mime_type: file.type });
}