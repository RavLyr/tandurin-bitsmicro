import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
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
 * POST /api/recurring/check — record a completion log for a recurring task
 * template (T-015). Body: { template_id, scheduled_date }. Ownership is
 * enforced by resolving the template against the session user before insert;
 * the unique (template_id, scheduled_date) constraint turns a re-check of the
 * same day into a no-op (iserted stays false).
 */
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  let body: { template_id?: string; scheduled_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
  }

  const templateId = typeof body.template_id === "string" ? body.template_id : "";
  const scheduledDate = typeof body.scheduled_date === "string" ? body.scheduled_date : "";

  if (!templateId || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 400 });
  }

  const service = createServiceClient();

  // Resolve ownership through the template itself.
  const { data: template, error: templateError } = await service
    .from("recurring_task_templates")
    .select("id")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError) {
    return NextResponse.json({ error: STRINGS.recurring.loadFailed }, { status: 500 });
  }
  if (!template) {
    return NextResponse.json({ error: STRINGS.projects.notFound }, { status: 404 });
  }

  const { data: log, error: logError } = await service
    .from("recurring_task_logs")
    .upsert(
      {
        template_id: templateId,
        user_id: user.id,
        scheduled_date: scheduledDate,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "template_id,scheduled_date", ignoreDuplicates: true }
    )
    .select("template_id, scheduled_date, completed_at")
    .single();

  if (logError) {
    return NextResponse.json({ error: STRINGS.recurring.checkFailed }, { status: 500 });
  }
  if (!log) {
    return NextResponse.json(
      { error: STRINGS.recurring.alreadyChecked },
      { status: 409 }
    );
  }

  return NextResponse.json({ log });
}