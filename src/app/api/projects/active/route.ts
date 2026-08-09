import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client for the project switcher (server-only env vars).
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

/**
 * GET /api/projects/active — return the user's most recently active project
 * (the one with the newest updated_at). Returns `{ project: null }` when the
 * user has no projects yet.
 */
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: project, error } = await service
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: STRINGS.projects.loadFailed }, { status: 500 });
  }

  return NextResponse.json({ project });
}

/**
 * POST /api/projects/active — mark a project as the active one by bumping
 * its `updated_at` to now (the switcher's "most recently active" heuristic).
 * 404 when the project does not belong to the user.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 422 });
  }

  const parsed = z
    .object({ project_id: z.string().uuid({ message: STRINGS.projects.invalidValue }) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 422 });
  }
  const { project_id } = parsed.data;

  const service = createServiceClient();
  const { data: existing } = await service
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const { data: updated, error } = await service
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", project_id)
    .eq("user_id", user.id)
    .select(PROJECT_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: STRINGS.projects.activeFailed }, { status: 500 });
  }
  return NextResponse.json({ project: updated });
}