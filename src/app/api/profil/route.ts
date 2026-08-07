import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client for /api/profil writes (server-only env vars).
 * Never import this into client components (AGENTS.md hard rule).
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** PATCH body schema (T-102 step 2). Email is never accepted here. */
const patchSchema = z
  .object({
    display_name: z.string().trim().min(3).max(60).optional(),
    avatar_url: z.string().trim().max(500).optional().nullable(),
    notification_email_preference: z.boolean().optional(),
    reminder_hour: z.number().int().min(0).max(23).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "no-changes",
  });

/**
 * GET /api/profil — current profile + email. 401 without a session.
 */
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.profil_errors.unauthorized }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profile, error } = await service
    .from("profiles")
    .select("id, display_name, avatar_url, notification_email_preference, reminder_hour, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: STRINGS.profil_errors.notFound }, { status: 500 });
  }

  return NextResponse.json({ ...(profile ?? {}), email: user.email ?? null });
}

/**
 * PATCH /api/profil — partial update via service role.
 * 400 with Indonesian message on validation violation; upserts the row,
 * creating it from session defaults when the trigger row is missing.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.profil_errors.unauthorized }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: STRINGS.profil_errors.noChanges }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue?.message === "no-changes"
        ? STRINGS.profil_errors.noChanges
        : issue?.path[0] === "reminder_hour"
          ? STRINGS.profil_errors.reminderHour
          : issue?.path[0] === "display_name"
            ? STRINGS.profil_errors.displayName
            : STRINGS.profil_errors.noChanges;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const patch = {
    ...parsed.data,
    display_name: parsed.data.display_name ?? user.email ?? "Tanduri User",
  };

  const { data: updated, error } = await service
    .from("profiles")
    .upsert({ id: user.id, ...patch }, { onConflict: "id" })
    .select("id, display_name, avatar_url, notification_email_preference, reminder_hour, created_at")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: STRINGS.profil_errors.notFound }, { status: 500 });
  }

  return NextResponse.json({ ...updated, email: user.email ?? null, created: !existing });
}
