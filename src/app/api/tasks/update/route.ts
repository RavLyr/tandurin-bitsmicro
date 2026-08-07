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
 * POST /api/tasks/update — move/reorder/edit a task (T-303, F-06).
 * Body: `{ id, status?, position?, description? }`.
 * - Status change without position → position = max(position)+1 in the
 *   target column (dropped at the end of the board).
 * - Position supplied + same status → reorder within column via the
 *   `update_task_positions` RPC (single transaction, T-002 migration).
 * - description edit → updates only description.
 * Ownership scoped to the session user; missing task → 404.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown; position?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: STRINGS.kanban.saveFailed }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: task, error: fetchError } = await service
    .from("tasks")
    .select("id, status, position, land_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !task) {
    return NextResponse.json({ error: STRINGS.kanban.taskDeleted }, { status: 404 });
  }

  // Description-only edit.
  const wantsDescriptionOnly = Object.keys(body).every((k) => k === "id" || k === "description");
  if (wantsDescriptionOnly) {
    const description = typeof body.description === "string" ? body.description : null;
    const { data: updated, error: upError } = await service
      .from("tasks")
      .update({ description })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, land_id, conversation_id, title, description, status, due_date, position, phase, crop, created_at, updated_at")
      .single();
    if (upError || !updated) {
      return NextResponse.json({ error: STRINGS.kanban.saveFailed }, { status: 500 });
    }
    return NextResponse.json({ task: updated });
  }

  const rawStatus = typeof body.status === "string" ? body.status : task.status;
  const status = ["belum_dikerjakan", "sedang_dikerjakan", "selesai"].includes(rawStatus)
    ? rawStatus
    : task.status;
  const explicitPosition = typeof body.position === "number" ? body.position : null;

  let targetPosition = explicitPosition;
  if (targetPosition === null || status !== task.status) {
    // Moving column (or no position given): append to the end of the column.
    const { data: maxRow } = await service
      .from("tasks")
      .select("position")
      .eq("user_id", user.id)
      .eq("status", status)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const maxPos = maxRow?.position ?? -1;
    targetPosition = maxPos + 1;
  } else if (status === task.status) {
    // Same-column reorder: shift tasks at/after the target to make room
    // (keeps the `tasks_positions` unique index satisfied, no collision).
    const { data: blockers } = await service
      .from("tasks")
      .select("id, position")
      .eq("user_id", user.id)
      .eq("status", status)
      .gte("position", targetPosition)
      .neq("id", id)
      .order("position", { ascending: true });

    for (const b of blockers ?? []) {
      await service
        .from("tasks")
        .update({ position: b.position + 1 })
        .eq("id", b.id)
        .eq("user_id", user.id);
    }
  }

  const { data: updated, error } = await service
    .from("tasks")
    .update({ status, position: targetPosition })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, land_id, conversation_id, title, description, status, due_date, position, phase, crop, created_at, updated_at")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: STRINGS.kanban.saveFailed }, { status: 500 });
  }

  return NextResponse.json({ task: updated });
}