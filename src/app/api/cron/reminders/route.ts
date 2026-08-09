import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

/**
 * Service-role client (server-only env vars). notification_logs has RLS on
 * with no policies — only the service role can read/write it.
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Jakarta date floor as YYYY-MM-DD. Asia/Jakarta is fixed UTC+7 (no DST). */
function jakartaDate(offsetDays: number): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * POST /api/cron/reminders — daily email reminder sweep (F-09).
 * Vercel Cron hits this endpoint daily 07:00 Asia/Jakarta with the
 * `x-cron-secret` header. Idempotent: dedups on notification_logs per
 * (user, task, 'email_reminder', today). Failed sends are logged as
 * `email_failed` and never abort the run. Never mutates tasks/profiles.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ sent: 0, skipped: 0 }, { status: 401 });
  }

  const service = createServiceClient();
  const today = jakartaDate(0);
  const tomorrow = jakartaDate(1);

  // Selection: active opted-in profiles, unfinished tasks due tomorrow or overdue.
  const { data: rows, error } = await service
    .from("tasks")
    .select("id, title, due_date, user_id, profiles(display_name, notification_email_preference)")
    .neq("status", "selesai")
    .or(`due_date.eq.${tomorrow},due_date.lt.${today}`)
    .eq("profiles.notification_email_preference", true);

  if (error) {
    console.error("[api/cron/reminders] selection error:", error);
    return NextResponse.json({ sent: 0, skipped: 0 }, { status: 500 });
  }

  const tasks = (rows ?? []).map((row) => {
    // PostgREST returns an object for many-to-one embeds; handle array-or-object.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      title: row.title,
      user_id: row.user_id,
      due_date: row.due_date,
      display_name: profile?.display_name ?? "Pekebun",
    };
  });

  // Dedup: any row already logged as sent today for (user, task) is skipped.
  const { data: sentToday } = await service
    .from("notification_logs")
    .select("user_id, task_id")
    .eq("type", "email_reminder")
    .eq("sent_at", today);
  const sentKeys = new Set(
    (sentToday ?? []).map((row) => `${row.user_id}:${row.task_id}`)
  );

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  let sent = 0;
  let skipped = 0;

  // Email per unique user via admin getUserById (spec F-09 §3.5).
  const emailByUser = new Map<string, string | undefined>();
  for (const user_id of new Set(tasks.map((t) => t.user_id))) {
    const {
      data: { user },
    } = await service.auth.admin.getUserById(user_id);
    emailByUser.set(user_id, user?.email ?? undefined);
  }

  for (const task of tasks) {
    if (sentKeys.has(`${task.user_id}:${task.id}`)) {
      skipped++;
      continue;
    }

    const email = emailByUser.get(task.user_id);
    if (!email) {
      skipped++;
      continue;
    }

    const dueMs = Date.parse(`${task.due_date}T00:00:00Z`);
    const todayMs = Date.parse(`${today}T00:00:00Z`);
    const daysOverdue = Math.max(Math.round((todayMs - dueMs) / 86_400_000), 0);
    const dueText =
      task.due_date === tomorrow
        ? `Jatuh tempo besok (${formatJakartaDate(task.due_date)})`
        : `Sudah terlambat ${daysOverdue} hari`;

    const html = [
      `<p>Halo, ${task.display_name}!</p>`,
      `<p><strong>${task.title}</strong> — ${dueText}.</p>`,
      `<p>Jangan sampai terlewat ya. Lihat dashboard dan selesaikan pekerjaanmu:</p>`,
      `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Buka Dashboard Tanduri</a></p>`,
      `<p>Salam,<br/>Tim Tanduri</p>`,
    ].join("\n");

    let ok = true;
    if (!resend) {
      // ponytail: missing RESEND_API_KEY → fails send so email_failed is logged and the
      // pipeline proves out; upgrade path = fail the run earlier once config is guaranteed.
      console.error("[api/cron/reminders] RESEND_API_KEY not set; logging email_failed");
      ok = false;
    } else {
      try {
      const { error: sendError } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: `🌱 Pengingat Tanduri: ${task.title}`,
        html,
      });
        if (sendError) {
          console.error(`[api/cron/reminders] send failed (task ${task.id}):`, sendError);
          ok = false;
        }
      } catch (err) {
        console.error(`[api/cron/reminders] send threw (task ${task.id}):`, err);
        ok = false;
      }
    }

    const { error: logError } = await service.from("notification_logs").insert({
      user_id: task.user_id,
      task_id: task.id,
      type: ok ? "email_reminder" : "email_failed",
      sent_at: today,
    });
    if (logError) {
      // Unique (user_id, task_id, type, sent_at) conflict from an overlapping run.
      if (logError.code === "23505") skipped++;
      else console.error(`[api/cron/reminders] log insert failed (task ${task.id}):`, logError);
      continue;
    }
    if (ok) sent++;
  }

  const recurring = await sendRecurringReminders(service, resend, today);
  sent += recurring.sent;
  skipped += recurring.skipped;

  return NextResponse.json({ sent, skipped });
}

/** Jakarta date of an ISO timestamptz (UTC+7, no DST). */
function jakartaDateOf(iso: string): string {
  return new Date(Date.parse(iso) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addJakartaDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Recurring-task reminder sweep (T-20, F-09 extension). For each active
 * template: next due = last completed scheduled_date + interval_days
 * (or the template's creation date when never completed). Send when
 * next_due <= today and nothing was logged today. Idempotent via the
 * partial unique (user_id, template_id, type='recurring_reminder', sent_at).
 */
async function sendRecurringReminders(
  service: ReturnType<typeof createServiceClient>,
  resend: Resend | null,
  today: string
): Promise<{ sent: number; skipped: number }> {
  const { data: templates, error } = await service
    .from("recurring_task_templates")
    .select(
      "id, user_id, project_id, title, description, interval_days, created_at, projects(name), profiles(display_name, notification_email_preference)"
    )
    .eq("is_active", true)
    .eq("profiles.recurring_reminder_enabled", true);

  if (error) {
    console.error("[api/cron/reminders] recurring selection error:", error);
    return { sent: 0, skipped: 0 };
  }

  const rows = templates ?? [];
  if (rows.length === 0) return { sent: 0, skipped: 0 };

  const templateIds = rows.map((row) => row.id);

  const { data: logs } = await service
    .from("recurring_task_logs")
    .select("template_id, scheduled_date")
    .in("template_id", templateIds);
  const lastByTemplate = new Map<string, string>();
  for (const log of logs ?? []) {
    const current = lastByTemplate.get(log.template_id);
    if (!current || log.scheduled_date > current) {
      lastByTemplate.set(log.template_id, log.scheduled_date);
    }
  }

  // Dedup: recurring_reminder already sent today for (user, template).
  const { data: sentToday } = await service
    .from("notification_logs")
    .select("user_id, template_id")
    .eq("type", "recurring_reminder")
    .eq("sent_at", today);
  const sentKeys = new Set(
    (sentToday ?? []).map((row) => `${row.user_id}:${row.template_id}`)
  );

  const emailByUser = new Map<string, string | undefined>();
  for (const user_id of new Set(rows.map((row) => row.user_id))) {
    const {
      data: { user },
    } = await service.auth.admin.getUserById(user_id);
    emailByUser.set(user_id, user?.email ?? undefined);
  }

  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    const lastDate = lastByTemplate.get(row.id);
    const nextDue = lastDate ? addJakartaDays(lastDate, row.interval_days) : jakartaDateOf(row.created_at);
    if (nextDue > today) {
      skipped++;
      continue;
    }
    if (sentKeys.has(`${row.user_id}:${row.id}`)) {
      skipped++;
      continue;
    }

    const email = emailByUser.get(row.user_id);
    if (!email) {
      skipped++;
      continue;
    }

    const projectName = project?.name ?? "proyekmu";
    const description = row.description?.trim()
      ? `<p>Jangan lupa: ${row.description}</p>`
      : "";

    const html = [
      `<p>Halo, ${profile?.display_name ?? "Pekebun"}!</p>`,
      `<p>🌱 Saatnya <strong>${row.title}</strong> untuk proyek <strong>${projectName}</strong>!</p>`,
      description,
      `<p>Buka dashboard dan tandai tugasnya selesai:</p>`,
      `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Buka Dashboard Tanduri</a></p>`,
      `<p>Salam,<br/>Tim Tanduri</p>`,
    ].join("\n");

    let ok = true;
    if (!resend) {
      console.error("[api/cron/reminders] RESEND_API_KEY not set; logging email_failed");
      ok = false;
    } else {
      try {
        const { error: sendError } = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: `🌱 Pengingat Tanduri: ${row.title}`,
          html,
        });
        if (sendError) {
          console.error(`[api/cron/reminders] send failed (template ${row.id}):`, sendError);
          ok = false;
        }
      } catch (err) {
        console.error(`[api/cron/reminders] send threw (template ${row.id}):`, err);
        ok = false;
      }
    }

    const { error: logError } = await service.from("notification_logs").insert({
      user_id: row.user_id,
      template_id: row.id,
      project_id: row.project_id,
      type: ok ? "recurring_reminder" : "email_failed",
      sent_at: today,
    });
    if (logError) {
      // Partial unique (user_id, template_id, type, sent_at) conflict.
      if (logError.code === "23505") skipped++;
      else console.error(`[api/cron/reminders] recurring log insert failed (template ${row.id}):`, logError);
      continue;
    }
    if (ok) sent++;
  }

  return { sent, skipped };
}

function formatJakartaDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const name = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][m - 1];
  return `${d} ${name} ${y}`;
}