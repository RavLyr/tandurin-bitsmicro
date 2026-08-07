import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { runAgronomist } from "@/lib/agents/agronomist";
import { runTaskPlanner } from "@/lib/agents/task-planner";
import { generate_tasks_executor, type GeneratedTask } from "@/lib/agents/tools/task-generator";
import { STRINGS } from "@/lib/i18n";

/**
 * POST /api/chat — SSE `text/event-stream` chat with the Agronomist agent
 * (T-203, F-02). Session-gated; persists conversation + messages via the
 * service role on completion. On a short affirmative reply to a previously
 * persisted `recommendation` message (T-301 step 3), the route marks the plan
 * confirmed, persists an interim message, and generates the task schedule
 * (T-302).
 */

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const HISTORY_LIMIT = 20;

interface LandConditions {
  location?: string;
  latitude?: number;
  longitude?: number;
  area_m2?: number;
}

/**
 * YAGNI (F-03 §3): only keep the fields the client renders. Everything else
 * in the emitted <land_conditions> JSON stays in the model's own context.
 */
function sanitizeLandConditions(raw: Record<string, unknown>): LandConditions | null {
  const pick: LandConditions = {};
  if (typeof raw.location === "string") pick.location = raw.location;
  if (typeof raw.latitude === "number") pick.latitude = raw.latitude;
  if (typeof raw.longitude === "number") pick.longitude = raw.longitude;
  if (typeof raw.area_m2 === "number") pick.area_m2 = raw.area_m2;
  return Object.keys(pick).length > 0 ? pick : null;
}

/** Find the first fenced ```json { ... } ``` block in the accumulated stream. */
function extractLandConditions(accumulated: string): LandConditions | null {
  const match = /```json\s*(\{[\s\S]*?\})\s*```/.exec(accumulated);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (typeof parsed !== "object" || parsed === null) return null;
    return sanitizeLandConditions(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Short affirmative reply ("sesuai", "ya", "oke", "lanjutkan", "setuju", ...). */
const AFFIRMATIVE_WORDS = ["sesuai", "ya", "oke", "ok", "setuju", "lanjutkan", "lanjut", "sip", "mantap"];
function isAffirmative(message: string): boolean {
  const normalized = message.toLowerCase().replace(/[.!?,]/g, "");
  return AFFIRMATIVE_WORDS.some((w) => normalized === w || normalized.startsWith(`${w} `) || normalized.endsWith(` ${w}`) || normalized.includes(` ${w} `));
}

const TASK_PHASES: GeneratedTask["phase"][] = [
  "olah_lahan",
  "semai",
  "tanam",
  "penyiraman",
  "pemupukan",
  "perawatan",
  "panen",
];

/** Today's date key (YYYY-MM-DD) in Asia/Jakarta. */
function jakartaTodayKey(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function clampDueDate(due: string): string {
  const today = jakartaTodayKey();
  return due < today ? today : due;
}

/** Safety net: build a schedule deterministically when the planner call fails. */
function fallbackSchedule(crop: string): GeneratedTask[] {
  const plan = {
    crops: [crop],
    planting_window: "mulai hari ini",
    experience: "beginner",
  };
  try {
    return generate_tasks_executor({ confirmed_plan: plan });
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  let body: {
    conversation_id?: string | null;
    land_id?: string | null;
    message?: unknown;
    history?: unknown;
    image_path?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: STRINGS.chat_errors.emptyMessage }, { status: 400 });
  }

  const service = createServiceClient();

  // Resolve or create the conversation.
  let conversationId = body.conversation_id ?? null;
  if (conversationId) {
    const { data: conv, error } = await service
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !conv) {
      return NextResponse.json({ error: STRINGS.chat_errors.notFound }, { status: 404 });
    }
  } else {
    const land_id = body.land_id ?? null;
    const { data: conv, error } = await service
      .from("conversations")
      .insert({ user_id: user.id, land_id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (error || !conv) {
      return NextResponse.json({ error: STRINGS.chat_errors.aiUnavailable }, { status: 500 });
    }
    conversationId = conv.id;
  }

  // Load last 20 messages → history for the agent.
  const { data: pastMessages } = await service
    .from("messages")
    .select("id, role, content, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  const history: { role: "user" | "assistant"; content: string }[] = (pastMessages ?? []).map(
    (m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })
  );

  // Last assistant message + its metadata → confirmation detection (T-301 step 3).
  const lastAssistant = [...(pastMessages ?? [])].reverse().find((m) => m.role === "assistant");
  const prevMetadata =
    lastAssistant && typeof lastAssistant.metadata === "object" && lastAssistant.metadata !== null
      ? (lastAssistant.metadata as Record<string, unknown>)
      : null;
  const awaitingConfirmation = prevMetadata?.type === "recommendation";

  // T-401 (F-04): resolve image context — explicit upload this message, or the
  // most recent stored image_path in this conversation (no re-upload needed).
  const ownImagePath =
    typeof body.image_path === "string" && body.image_path ? body.image_path : null;
  const lastImagePath =
    (prevMetadata && typeof prevMetadata.image_path === "string" ? prevMetadata.image_path : null) ??
    null;
  const imagePath = ownImagePath ?? lastImagePath;

  let image: { mimeType: string; data: string } | null = null;
  if (imagePath) {
    try {
      const { data: blob, error: dlError } = await service.storage
        .from("plant-images")
        .download(imagePath);
      if (dlError) {
        console.error("[api/chat] image download error:", dlError.message);
      } else if (blob) {
        image = {
          mimeType: blob.type || "image/jpeg",
          data: Buffer.from(await blob.arrayBuffer()).toString("base64"),
        };
      }
    } catch (err) {
      console.error("[api/chat] image fetch throw:", err);
    }
  }

  // Resolve context land summary.
  const landId = body.land_id ?? null;
  const context: { landSummary?: string } = {};
  if (landId) {
    const { data: land, error } = await service
      .from("lands")
      .select("name, location, area_m2, media, water, sunlight, budget_idr, experience")
      .eq("id", landId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && land) {
      context.landSummary = [
        land.name && `Nama lahan: ${land.name}`,
        land.location && `Lokasi: ${land.location}`,
        land.area_m2 != null && `Luas: ${land.area_m2} m²`,
        land.media && `Media: ${land.media}`,
        land.water && `Air: ${land.water}`,
        land.sunlight && `Cahaya: ${land.sunlight}`,
        land.budget_idr != null && `Budget: Rp ${Number(land.budget_idr).toLocaleString("id-ID")}`,
        land.experience && `Pengalaman: ${land.experience}`,
      ]
        .filter(Boolean)
        .join("\n- ");
    }
  } else {
    const { data: active } = await service
      .from("lands")
      .select("name, location, area_m2, media, water, sunlight, budget_idr, experience")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (active) {
      context.landSummary = [
        active.name && `Nama lahan: ${active.name}`,
        active.location && `Lokasi: ${active.location}`,
        active.area_m2 != null && `Luas: ${active.area_m2} m²`,
        active.media && `Media: ${active.media}`,
        active.water && `Air: ${active.water}`,
        active.sunlight && `Cahaya: ${active.sunlight}`,
        active.budget_idr != null &&
          `Budget: Rp ${Number(active.budget_idr).toLocaleString("id-ID")}`,
        active.experience && `Pengalaman: ${active.experience}`,
      ]
        .filter(Boolean)
        .join("\n- ");
    }
  }

  // Persist the user message; SSE stream follows.
  const { data: userMsg } = await service
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      metadata: imagePath ? { image_path: imagePath } : {},
    })
    .select("id")
    .single();

  if (!userMsg) {
    return NextResponse.json({ error: STRINGS.chat_errors.aiUnavailable }, { status: 500 });
  }
  void userMsg;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const metadata: { toolCalls: unknown[]; land_conditions?: LandConditions } = {
        toolCalls: [],
      };
      let accumulatedText = "";

      try {
        if (isAffirmative(message) && awaitingConfirmation && lastAssistant) {
          // T-301 step 3: mark the recommendation as confirmed.
          await service
            .from("messages")
            .update({
              metadata: { ...(prevMetadata ?? {}), plan_confirmed: true },
            })
            .eq("id", lastAssistant.id);

          send({ type: "token", text: STRINGS.chat.taskPlanConfirmed });
          await service.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: STRINGS.chat.taskPlanConfirmed,
            metadata: { plan_confirmed: true },
          });

          // T-302: idempotency check — tasks already generated for this conversation?
          const { data: existingTasks } = await service
            .from("tasks")
            .select("id")
            .eq("conversation_id", conversationId)
            .limit(1);

          let tasks: GeneratedTask[] = [];
          if (!existingTasks || existingTasks.length === 0) {
            try {
              const planResult = await runTaskPlanner({
                prompt: message,
                history,
                context,
                supabase: service,
              });
              tasks = (planResult.tasks ?? []).filter(
                (t) =>
                  typeof t.title === "string" &&
                  typeof t.due_date === "string" &&
                  typeof t.phase === "string" &&
                  TASK_PHASES.includes(t.phase)
              );
            } catch (err) {
              console.error("[api/chat] task planner error:", err);
            }

            if (tasks.length < 5) {
              // Partial failure / no output → deterministic fallback (≥5 tasks).
              const crop = (context.landSummary?.match(/Nama lahan: ([^\n]+)/)?.[1] ??
                "Tanaman") as string;
              tasks = fallbackSchedule(crop);
            }

            tasks = tasks.map((t) => ({
              ...t,
              due_date: clampDueDate(t.due_date),
              position: t.position ?? 0,
            }));

            const rows = tasks.map((t, index) => ({
              user_id: user.id,
              land_id: body.land_id ?? null,
              conversation_id: conversationId,
              title: t.title,
              description: t.description ?? "",
              phase: t.phase,
              due_date: t.due_date,
              position: t.position ?? index,
              crop: null,
            }));

            try {
              const { error: insertError } = await service.from("tasks").insert(rows);
              if (insertError) {
                console.error("[api/chat] tasks insert error:", insertError);
              }
            } catch (err) {
              console.error("[api/chat] tasks insert throw:", err);
            }
          } else {
            const { data: persisted } = await service
              .from("tasks")
              .select("title, due_date, phase")
              .eq("conversation_id", conversationId)
              .order("position", { ascending: true });
            tasks = (persisted ?? []).map((t) => ({
              title: t.title,
              description: "",
              due_date: t.due_date,
              phase: t.phase,
              position: 0,
            }));
          }

          const summary =
            tasks.length > 0
              ? `${tasks
                  .map(
                    (t, i) =>
                      `${i + 1}. **${t.title}** — ${new Intl.DateTimeFormat("id-ID", {
                        timeZone: "Asia/Jakarta",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(`${t.due_date}T00:00:00Z`))}`
                  )
                  .join("\n")}\n\n${STRINGS.chat.taskSummaryCta}`
              : STRINGS.chat_errors.aiUnavailable;

          send({ type: "token", text: summary });
          const summaryMetadata = {
            type: "task-summary",
            tasks: tasks.map((t) => ({
              title: t.title,
              due_date: t.due_date,
              phase: t.phase,
            })),
          };
          send({ type: "metadata", data: summaryMetadata });
          await service.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: summary,
            metadata: summaryMetadata,
          });
          await service
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

          send({ type: "done" });
          return;
        }

        const result = await runAgronomist({
          prompt: message,
          history,
          context,
          supabase: service,
          image,
          diagnose: image !== null,
          onToken: (text) => {
            accumulatedText += text;
            send({ type: "token", text });
            // Emit land_conditions as soon as the fenced JSON block completes,
            // while the rest of the recommendation keeps streaming (F-03 AC-1).
            if (metadata.land_conditions === undefined) {
              const landConditions = extractLandConditions(accumulatedText);
              if (landConditions) {
                metadata.land_conditions = landConditions;
                send({ type: "metadata", data: { land_conditions: landConditions } });
              }
            }
          },
        });

        metadata.toolCalls = result.functionCalls;
        send({ type: "metadata", data: metadata });

        const content = result.text.trim() || STRINGS.chat_errors.aiUnavailable;
        const isRecommendation = /Apakah rencana ini sesuai\?/.test(content);
        const hasMetadata =
          metadata.toolCalls.length > 0 ||
          metadata.land_conditions !== undefined ||
          isRecommendation ||
          image !== null;
        const typeMeta = isRecommendation
          ? { type: "recommendation" }
          : image !== null
            ? {
                type: "diagnosis",
                image_path: imagePath,
                mime_type: image?.mimeType ?? "image/jpeg",
              }
            : {};
        await service.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content,
          metadata: hasMetadata
            ? { ...metadata, ...typeMeta }
            : {},
        });
        await service
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);

        send({ type: "done" });
      } catch (err) {
        console.error("[api/chat] stream error:", err);
        // Fallback assistant message persisted (F-02 AC-6).
        await service.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: STRINGS.chat_errors.aiUnavailable,
          metadata: {},
        });
        send({ type: "error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}