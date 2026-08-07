import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";
import { landPatchSchema, zodErrors } from "../route";

/**
 * Service-role client for land writes (server-only env vars).
 * Never import this into client components (AGENTS.md hard rule).
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const LAND_SELECT =
  "id, user_id, name, location, latitude, longitude, area_m2, media, water, sunlight, budget_idr, experience, is_active, created_at, updated_at";

/** Read + parse route segment `[id]` (Next 15 async params). */
async function readId(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return params.id;
}

/** 404 for a missing/foreign id, 400 for a malformed uuid-shaped id. */
function parseUuid(id: string): string | null {
  const uuid = z.string().uuid().safeParse(id);
  return uuid.success ? uuid.data : null;
}

/**
 * PATCH /api/lands/[id] — partial update with the same validation as POST.
 * is_active/user_id can never be set from the body (schema excludes them).
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const rawId = await readId(context);
  const id = parseUuid(rawId);
  if (!id) {
    return NextResponse.json({ error: STRINGS.lands.notFound }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: STRINGS.lands.invalidBody }, { status: 422 });
  }

  const parsed = landPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: zodErrors(parsed.error) }, { status: 422 });
  }
  const data = parsed.data;

  const service = createServiceClient();
  const { data: existing } = await service
    .from("lands")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: STRINGS.lands.notFound }, { status: 404 });
  }

  const { data: updated, error } = await service
    .from("lands")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(LAND_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
  }
  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/lands/[id] — soft-block when the land still has tasks (409).
 * Deleting the active land promotes the oldest remaining (created_at)
 * to active; with zero remaining lands, no active land exists (F-07 §7.2).
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const rawId = await readId(context);
  const id = parseUuid(rawId);
  if (!id) {
    return NextResponse.json({ error: STRINGS.lands.notFound }, { status: 404 });
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("lands")
    .select("id, is_active")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: STRINGS.lands.notFound }, { status: 404 });
  }

  const { data: blocked } = await service
    .from("tasks")
    .select("id")
    .eq("land_id", id)
    .limit(1);
  if (blocked && blocked.length > 0) {
    return NextResponse.json({ error: STRINGS.lands.deleteBlocked }, { status: 409 });
  }

  const { error: deleteError } = await service
    .from("lands")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (deleteError) {
    return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
  }

  // ponytail: promote-oldest is a second statement, not one DB transaction
  // (no RPC for it); the partial unique index still guarantees ≤1 active,
  // and a failure here only leaves zero active — recoverable in the UI.
  if (existing.is_active) {
    const { data: oldest } = await service
      .from("lands")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (oldest) {
      const { error: promoteError } = await service
        .from("lands")
        .update({ is_active: true })
        .eq("id", oldest.id);
      if (promoteError) {
        return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ data: { deleted_id: id } });
}