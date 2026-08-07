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
 * GET /api/tasks?land_id=&status= — task list for the Kanban board (T-303).
 * Reads go through the service role; ownership scoped to the session user.
 * Ordered by (status, position) so each column renders in drop order.
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
  const landId = params.get("land_id");
  const status = params.get("status");

  let query = createServiceClient()
    .from("tasks")
    .select("id, land_id, conversation_id, title, description, status, due_date, position, phase, crop, created_at, updated_at")
    .eq("user_id", user.id);

  if (landId) query = query.eq("land_id", landId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: STRINGS.kanban.saveFailed }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}