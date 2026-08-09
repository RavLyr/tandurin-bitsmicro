import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { runOrchestrator } from "@/lib/agents";
import type { ChatTurn } from "@/lib/agents";
import { STRINGS } from "@/lib/i18n";

/**
 * POST /api/chat — SSE `text/event-stream` chat (T-203, F-02). Session-gated.
 *
 * The route is intentionally thin after the ADK-orchestrator refactor: it
 * handles auth, conversation/message/data resolution, and SSE framing, then
 * delegates ALL intent+routing+feature behavior (land_conditions extraction,
 * confirmation → task planner flow, diagnosis, fallback schedule) to
 * `runOrchestrator()` in `@/lib/agents`.
 */

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const HISTORY_LIMIT = 20;

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
    project_crops?: unknown;
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

  // T-024: explicit crop list from the "Buat Proyek" button — lets the
  // orchestrator build the project deterministically, bypassing the LLM agent.
  const projectCrops =
    Array.isArray(body.project_crops) &&
    body.project_crops.every((c) => typeof c === "string") &&
    body.project_crops.length > 0
      ? (body.project_crops as string[])
      : null;

  const service = createServiceClient();

  // Resolve or create the conversation. `createdNew` tracks whether the
  // conversation was created by this request (used to clean up dead
  // conversations when the first AI turn fails).
  const requestedId = body.conversation_id ?? null;
  const createdNew = !requestedId;
  let conversationId: string;
  // T-024: active project the conversation is linked to (null = none).
  let projectId: string | null = null;

  // Resolve the effective land: explicit land_id, else the active land.
  // Tasks planned later inherit this land id so the board + land card counts
  // stay consistent (previously chat tasks had land_id = null).
  let landId = body.land_id ?? null;
  // Resolve the active land whenever the message doesn't carry one — needed
  // for follow-up messages in an existing conversation too (project creation
  // and task planning require a land). Mirrors the landSummary query below.
  if (!landId) {
    const { data: activeLand } = await service
      .from("lands")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (activeLand) landId = activeLand.id;
  }

  if (requestedId) {
    const { data: conv, error } = await service
      .from("conversations")
      .select("id, project_id")
      .eq("id", requestedId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !conv) {
      return NextResponse.json({ error: STRINGS.chat_errors.notFound }, { status: 404 });
    }
    conversationId = requestedId;
    projectId = conv.project_id ?? null;
  } else {
    const { data: conv, error } = await service
      .from("conversations")
      .insert({ user_id: user.id, land_id: landId, title: message.slice(0, 60) })
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

  const history: ChatTurn[] = (pastMessages ?? []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

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

// Resolve context land summary (the effective land id resolved above).
  const context: { landSummary?: string } = {};
  const landBase = service
    .from("lands")
    .select("name, location, area_m2, media, water, sunlight, budget_idr, experience")
    .eq("user_id", user.id);
  const { data: land, error } = await (landId
    ? landBase.eq("id", landId)
    : landBase.eq("is_active", true)
  ).maybeSingle();
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

      // Tell the client the conversation_id of this stream (T-301: prevents
      // follow-ups from silently creating brand-new conversations).
      send({ type: "conversation", id: conversationId });

      try {
        // Delegate all intent routing + feature behavior to the orchestrator.
        const { messages } = await runOrchestrator({
          message,
          history,
          context,
          supabase: service,
          userId: user.id,
          landId,
          conversationId,
          projectId,
          image,
          imagePath,
          awaitingConfirmation,
          lastAssistant:
            lastAssistant && typeof lastAssistant.id === "string"
              ? { id: lastAssistant.id, metadata: prevMetadata }
              : null,
          projectCrops: projectCrops ?? undefined,
          onEvent: (event) => {
            if (event.type === "token") {
              send({ type: "token", text: event.text });
            } else {
              send({ type: "metadata", data: event.data });
            }
          },
        });

        // Persist assistant message(s) produced by the orchestrator.
        for (const msg of messages) {
          await service.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: msg.content,
            metadata: msg.metadata,
          });
        }
        await service
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);

        send({ type: "done" });
      } catch (err) {
        console.error("[api/chat] stream error:", err);
        // A brand-new conversation whose first AI turn failed is a dead
        // conversation (F-02): silently delete it so it never appears in the
        // sidebar/riwayat. Keep the fallback message only for established
        // conversations (F-02 AC-6). Tasks FK-guard the delete: only remove if
        // no tasks were created yet.
        if (createdNew) {
          const { data: linkedTasks } = await service
            .from("tasks")
            .select("id")
            .eq("conversation_id", conversationId)
            .limit(1);
          if (!linkedTasks || linkedTasks.length === 0) {
            await service
              .from("conversations")
              .delete()
              .eq("id", conversationId);
            send({ type: "deleted" });
            return;
          }
        }
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