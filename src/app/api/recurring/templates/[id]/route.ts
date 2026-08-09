import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client (server-only env vars). Never import into client code.
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const VALID_CATEGORIES = ["penyiraman", "pemupukan", "perawatan", "pestisida"] as const;
const VALID_TIMES = ["pagi", "siang", "sore", "malam"] as const;

/**
 * PATCH /api/recurring/templates/[id] — update template fields (title,
 * description, category, interval_days, time_of_day). Ownership enforced via
 * `user_id` match. Only `is_active` stays untouched here (use DELETE).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
  }

  const patch: {
    title?: string;
    description?: string | null;
    category?: string;
    interval_days?: number;
    time_of_day?: string | null;
  } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
    }
    patch.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
    }
    patch.description = body.description.trim() === "" ? null : body.description.trim();
  }
  if (body.category !== undefined) {
    if (
      typeof body.category !== "string" ||
      !(VALID_CATEGORIES as readonly string[]).includes(body.category)
    ) {
      return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
    }
    patch.category = body.category;
  }
  if (body.interval_days !== undefined) {
    if (typeof body.interval_days !== "number" || !Number.isInteger(body.interval_days) || body.interval_days <= 0) {
      return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
    }
    patch.interval_days = body.interval_days;
  }
  if (body.time_of_day !== undefined) {
    if (
      body.time_of_day !== null &&
      (typeof body.time_of_day !== "string" ||
        !(VALID_TIMES as readonly string[]).includes(body.time_of_day))
    ) {
      return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
    }
    patch.time_of_day = body.time_of_day as string | null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: owned, error: ownedError } = await service
    .from("recurring_task_templates")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownedError) {
    return NextResponse.json({ error: STRINGS.recurring.loadFailed }, { status: 500 });
  }
  if (!owned) {
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const { data: updated, error: updateError } = await service
    .from("recurring_task_templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, project_id, title, description, category, interval_days, time_of_day, is_active")
    .single();

  if (updateError) {
    return NextResponse.json({ error: STRINGS.recurring.loadFailed }, { status: 500 });
  }

  return NextResponse.json({ template: updated });
}

/**
 * DELETE /api/recurring/templates/[id] — soft-delete: flip `is_active` to
 * false so the template disappears from lists but history logs remain intact.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const { id } = await params;
  const service = createServiceClient();

  const { data: template, error: ownedError } = await service
    .from("recurring_task_templates")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownedError) {
    return NextResponse.json({ error: STRINGS.recurring.loadFailed }, { status: 500 });
  }
  if (!template) {
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const { error: deleteError } = await service
    .from("recurring_task_templates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: STRINGS.recurring.loadFailed }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}