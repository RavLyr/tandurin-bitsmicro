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
 * DELETE /api/conversations/[id] — remove a conversation and its messages
 * (F-08 AC-6). Cascade is enforced by the DB: `messages.conversation_id`
 * references `conversations(id) on delete cascade` (001_init.sql line 50).
 * `tasks.conversation_id` is a NON-cascading FK (line 63), so tasks created
 * from this conversation survive the delete (F-08 AC-7).
 * Scoped to the authenticated user; any other/missing id → 404 (no leak).
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
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: STRINGS.riwayat.deleteFailed }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: STRINGS.chat_errors.notFound }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: deleted[0].id });
}