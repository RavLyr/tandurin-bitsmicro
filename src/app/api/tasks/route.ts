import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";
import { z } from "zod";

const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  description: z.string().trim().max(1000).optional().default(""),
  phase: z.enum(["olah_lahan", "semai", "tanam", "penyiraman", "pemupukan", "perawatan", "panen"]).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD").optional(),
  project_id: z.string().uuid().optional(),
  land_id: z.string().uuid().optional(),
});

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

/**
 * GET /api/tasks?project_id=&unorganized=&status= — task list for the Kanban
 * board (T-303). Reads go through the service role; ownership scoped to the
 * session user. Ordered by (status, position) so each column renders in drop
 * order. `project_id` filters to one project; `unorganized=true` returns only
 * tasks not yet linked to a project (project_id IS NULL).
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const projectId = params.get("project_id");
  const unorganized = params.get("unorganized") === "true";
  const status = params.get("status");

  let query = createServiceClient()
    .from("tasks")
    .select("id, land_id, project_id, conversation_id, title, description, status, due_date, position, phase, crop, created_at, updated_at, projects(name)")
    .eq("user_id", user.id);

  if (projectId) query = query.eq("project_id", projectId);
  if (unorganized) query = query.is("project_id", null);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: STRINGS.kanban.saveFailed }, { status: 500 });
  }

  const tasks = (data ?? []).map((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    return { ...row, project_name: project?.name ?? null };
  });

  return NextResponse.json({ tasks });
}

/**
 * POST /api/tasks — create a one-time task manually from the dashboard.
 * Ownership is scoped to the session user; the land (when supplied) must
 * belong to the user. Position is computed as max(position)+1 in the target
 * column so the new card lands at the bottom.
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

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? STRINGS.projects.invalidBody }, { status: 422 });
  }
  const data = parsed.data;

  const service = createServiceClient();

  // Validate ownership of the supplied land.
  if (data.land_id) {
    const { data: land } = await service
      .from("lands")
      .select("id")
      .eq("id", data.land_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!land) {
      return NextResponse.json({ error: STRINGS.projects.landNotFound }, { status: 404 });
    }
  }

  // Validate ownership of the supplied project.
  if (data.project_id) {
    const { data: project } = await service
      .from("projects")
      .select("id, land_id")
      .eq("id", data.project_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
    }
    if (!data.land_id) data.land_id = project.land_id;
  }

  // Next free position in the target column.
  const { data: maxRow } = await service
    .from("tasks")
    .select("position")
    .eq("user_id", user.id)
    .eq("land_id", data.land_id)
    .eq("status", "belum_dikerjakan")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (maxRow?.position ?? -1) + 1;

  const { data: created, error } = await service
    .from("tasks")
    .insert({
      user_id: user.id,
      land_id: data.land_id ?? null,
      project_id: data.project_id ?? null,
      title: data.title,
      description: data.description ?? "",
      phase: data.phase ?? "olah_lahan",
      due_date: data.due_date ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      position,
      status: "belum_dikerjakan",
    })
    .select("id, land_id, project_id, title, description, status, due_date, position, phase, created_at")
    .single();

  if (error || !created) {
    console.error("[api/tasks] insert error:", JSON.stringify(error));
    return NextResponse.json({ error: STRINGS.projects.failed }, { status: 500 });
  }
  return NextResponse.json({ task: created }, { status: 201 });
}