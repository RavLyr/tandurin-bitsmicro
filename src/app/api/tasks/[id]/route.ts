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
 * DELETE /api/tasks/[id] — remove a task (T-303, F-06). `task_comments` and
 * `notification_logs` cascade on delete (001_init.sql lines 80, 90). Scoped to
 * the authenticated user; missing/cross-user id → 404 (no leak).
 */
export async function DELETE(
  _request: NextRequest,
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
  const { data: deleted, error } = await service
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: STRINGS.kanban.deleteFailed }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: STRINGS.kanban.taskDeleted }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: deleted[0].id });
}