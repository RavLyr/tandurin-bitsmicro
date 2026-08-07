import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

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

/**
 * PATCH /api/lands/active/[id] — switch the active land (F-07 AC-2).
 * Two-step sequence (clear all, set target) kept as close to a transaction
 * as the HTTP client allows; the partial unique index lands_single_active
 * rejects any interleaved concurrent write, surfaced as a friendly 409.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const params = await context.params;
  const uuid = z.string().uuid().safeParse(params.id);
  if (!uuid.success) {
    return NextResponse.json({ error: STRINGS.lands.notFound }, { status: 404 });
  }
  const id = uuid.data;

  const service = createServiceClient();
  const { data: target } = await service
    .from("lands")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: STRINGS.lands.notFound }, { status: 404 });
  }

  const { error: clearError } = await service
    .from("lands")
    .update({ is_active: false })
    .eq("user_id", user.id);
  if (clearError) {
    return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
  }

  const { data: activated, error } = await service
    .from("lands")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(LAND_SELECT)
    .single();

  if (error || !activated) {
    // 23505 = unique_violation on lands_single_active (concurrent switch):
    // the UI refetches and falls back to the server's active land.
    if (error?.code === "23505") {
      return NextResponse.json({ error: STRINGS.lands.activeFailed }, { status: 409 });
    }
    return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
  }

  return NextResponse.json({ data: activated });
}