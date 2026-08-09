import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";
import { projectPatchSchema, zodErrors } from "../route";

/**
 * Service-role client for project writes (server-only env vars).
 * Never import this into client components (AGENTS.md hard rule).
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PROJECT_SELECT =
  "id, user_id, land_id, name, description, status, created_at, updated_at";

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
 * PATCH /api/projects/[id] — partial update with the same validation as POST.
 * status/user_id can never be set from the body (schema excludes user_id).
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
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 422 });
  }

  const parsed = projectPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: zodErrors(parsed.error) }, { status: 422 });
  }
  const data = parsed.data;

  const service = createServiceClient();
  const { data: existing } = await service
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const { data: updated, error } = await service
    .from("projects")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: STRINGS.projects.failed }, { status: 500 });
  }
  return NextResponse.json({ project: updated });
}

/**
 * DELETE /api/projects/[id] — soft-block when the project still has tasks
 * (409). Deleting a project cascades its recurring templates + logs
 * (FK on delete cascade in 003_projects.sql).
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
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const { data: blocked } = await service
    .from("tasks")
    .select("id")
    .eq("project_id", id)
    .limit(1);
  if (blocked && blocked.length > 0) {
    return NextResponse.json({ error: STRINGS.projects.deleteBlocked }, { status: 409 });
  }

  const { error: deleteError } = await service
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (deleteError) {
    return NextResponse.json({ error: STRINGS.projects.failed }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted_id: id } });
}