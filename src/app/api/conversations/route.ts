import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client for /api/conversations reads (server-only env vars).
 * Never import into client components (AGENTS.md hard rule).
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PAGE_SIZE = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/conversations — session-scoped consultation history (F-08).
 * Lists the user's conversations ordered by `updated_at desc`, each with the
 * linked land name, message count, and last message preview (embedded
 * aggregates: `messages(count)` + a 1-row `last_message` embed). Full threads
 * are never fetched here — the /riwayat page loads them per conversation.
 * `q` is an optional ILIKE prefilter on title; the /riwayat UI additionally
 * filters the client side. Paginated via `limit`/`offset`.
 *
 * ponytail: PostgREST embedded aggregates instead of a SQL LATERAL join
 * (no migration/RPC allowed in this task). Upgrade path = dedicated RPC via
 * `create or replace function` once a migration task is available.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") ?? `${PAGE_SIZE}`, 10) || PAGE_SIZE, 1), MAX_LIMIT);
  const offset = Math.max(Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  let query = createServiceClient()
    .from("conversations")
    .select(
      "id, title, land_id, created_at, updated_at, lands(name), messages(count), last_message:messages(content, role, created_at)"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .order("created_at", { foreignTable: "last_message", ascending: false })
    .limit(1, { foreignTable: "last_message" })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: STRINGS.riwayat.loadFailed }, { status: 500 });
  }

  const conversations = (data ?? []).map((row) => {
    // supabase-js types embedded relations as arrays without a Database type;
    // PostgREST returns an object for many-to-one — accept both at runtime.
    const land = Array.isArray(row.lands) ? row.lands[0] : row.lands;
    return {
      id: row.id,
      title: row.title,
      land_id: row.land_id,
      land_name: land?.name ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      message_count: row.messages?.[0]?.count ?? 0,
      last_message: row.last_message?.[0]?.content ?? null,
      last_role: row.last_message?.[0]?.role ?? null,
    };
  });

  return NextResponse.json({ conversations, has_more: conversations.length === limit });
}