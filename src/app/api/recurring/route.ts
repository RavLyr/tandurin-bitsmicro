import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
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

/**
 * GET /api/recurring?project_id= — recurring task templates (T-015) with
 * the latest completion log per template. Reads go through the service role;
 * ownership scoped to the session user. Templates are soft-deletable, so
 * only `is_active = true` rows are returned.
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

  let query = createServiceClient()
    .from("recurring_task_templates")
    .select(
      "id, project_id, title, description, category, interval_days, time_of_day, is_active, created_at, updated_at, projects(name), logs:recurring_task_logs(scheduled_date, completed_at)"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("scheduled_date", { foreignTable: "logs", ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: STRINGS.recurring.loadFailed }, { status: 500 });
  }

  const templates = (data ?? []).map((row) => {
    const logs = Array.isArray(row.logs) ? row.logs : [];
    return {
      id: row.id,
      project_id: row.project_id,
      project_name: row.projects?.[0]?.name ?? null,
      title: row.title,
      description: row.description,
      category: row.category,
      interval_days: row.interval_days,
      time_of_day: row.time_of_day,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_log: logs.length > 0 ? logs[0] : null,
    };
  });

  return NextResponse.json({ templates });
}