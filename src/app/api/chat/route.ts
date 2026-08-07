import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { runAgronomist } from "@/lib/agents/agronomist";
import { STRINGS } from "@/lib/i18n";

/**
 * POST /api/chat — SSE `text/event-stream` chat with the Agronomist agent
 * (T-203, F-02). Session-gated; persists conversation + messages via the
 * service role on completion.
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
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  const history: { role: "user" | "assistant"; content: string }[] = (pastMessages ?? []).map(
    (m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })
  );

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
      metadata: {},
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

      const metadata: { toolCalls: unknown[] } = { toolCalls: [] };

      try {
        const result = await runAgronomist({
          prompt: message,
          history,
          context,
          supabase: service,
          onToken: (text) => send({ type: "token", text }),
        });

        metadata.toolCalls = result.functionCalls;
        send({ type: "metadata", data: metadata });

        const content = result.text.trim() || STRINGS.chat_errors.aiUnavailable;
        await service.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content,
          metadata: metadata.toolCalls.length > 0 ? metadata : {},
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