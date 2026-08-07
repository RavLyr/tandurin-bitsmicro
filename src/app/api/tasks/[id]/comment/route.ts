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
 * POST /api/tasks/[id]/comment — add a comment to a task (T-303, F-06).
 * Insert happens via the server client so RLS "insert own" applies using the
 * session user (task ownership is scoped by `task_comments.user_id`).
 */
export async function POST(
  request: NextRequest,
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

  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: STRINGS.kanban.commentEmpty }, { status: 400 });
  }

  // Verify the task belongs to the user before commenting (no cross-user leak).
  const service = createServiceClient();
  const { data: task, error: taskError } = await service
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return NextResponse.json({ error: STRINGS.kanban.taskDeleted }, { status: 404 });
  }

  const { data: comment, error } = await supabase
    .from("task_comments")
    .insert({ task_id: id, user_id: user.id, content })
    .select("id, task_id, user_id, content, created_at")
    .single();

  if (error || !comment) {
    return NextResponse.json({ error: STRINGS.kanban.commentFailed }, { status: 500 });
  }

  return NextResponse.json({ comment });
}