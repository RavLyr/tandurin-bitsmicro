import { runAgent } from "./core/runner";
import type { AgentContext, ChatTurn, LandConditions, RunChatResult } from "./core/types";
import { agronomistAgent, diagnosisAgent } from "./agents/agronomist";
import { taskPlannerAgent } from "./agents/task-planner";
import {
  generate_tasks_executor,
  type GeneratedTask,
  type TaskPhase,
} from "./tools/task-generator";
import { STRINGS } from "@/lib/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Public agent API (ADK-orchestrator refactor).
 *
 * Agents are now defined with `@google/adk` (LlmAgent + FunctionTool) under
 * `agents/`, executed statelessly via `core/runner.ts`. This module owns the
 * intent routing + feature behaviors that used to live in the API route:
 * land_conditions extraction (F-03 AC-1), confirmation → task planner flow
 * (T-301/T-302), diagnosis routing (F-04), and the ≥5-task fallback (F-05 AC-4).
 */

export type { AgentContext, ChatTurn, LandConditions, RunChatResult };
export type { GeneratedTask, TaskPhase };
export { agronomistAgent, diagnosisAgent } from "./agents/agronomist";
export { taskPlannerAgent } from "./agents/task-planner";
export { orchestratorAgent } from "./agents/orchestrator";

// ---------------------------------------------------------------------------
// Helpers (migrated verbatim from src/app/api/chat/route.ts)
// ---------------------------------------------------------------------------

/**
 * YAGNI (F-03 §3): only keep the fields the client renders. Everything else
 * in the emitted <land_conditions> JSON stays in the model's own context.
 */
export function sanitizeLandConditions(raw: Record<string, unknown>): LandConditions | null {
  const pick: LandConditions = {};
  if (typeof raw.location === "string") pick.location = raw.location;
  if (typeof raw.latitude === "number") pick.latitude = raw.latitude;
  if (typeof raw.longitude === "number") pick.longitude = raw.longitude;
  if (typeof raw.area_m2 === "number") pick.area_m2 = raw.area_m2;
  return Object.keys(pick).length > 0 ? pick : null;
}

/** Find the first fenced ```json { ... } ``` block in the accumulated stream. */
export function extractLandConditions(accumulated: string): LandConditions | null {
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

/** Short affirmative reply ("sesuai", "ya", "siap", "oke", "setuju", ...). */
const AFFIRMATIVE_WORDS = [
  "sesuai",
  "ya",
  "iya",
  "oke",
  "ok",
  "setuju",
  "lanjutkan",
  "lanjut",
  "sip",
  "mantap",
  "siap",
  "gas",
  "boleh",
];

/** Direct instruction to build the schedule (e.g. "langsung buat jadwal"). */
const SCHEDULING_INTENT = /(buat|bikin)\s+(jadwal|rencana|schedul)|jadwalnya|langsung|mulai|jalankan|aturkan/i;

const NEGATION = /\b(tidak|nggak|gak|belum|jangan|bukan)\b/;

export function isAffirmative(message: string): boolean {
  const normalized = message.toLowerCase().replace(/[.!?,]/g, "");
  const wordMatch = AFFIRMATIVE_WORDS.some(
    (w) =>
      normalized === w ||
      normalized.startsWith(`${w} `) ||
      normalized.endsWith(` ${w}`) ||
      normalized.includes(` ${w} `)
  );
  if (NEGATION.test(normalized)) return false;
  return wordMatch || SCHEDULING_INTENT.test(normalized);
}

const TASK_PHASES: TaskPhase[] = [
  "olah_lahan",
  "semai",
  "tanam",
  "penyiraman",
  "pemupukan",
  "perawatan",
  "panen",
];

/** Today's date key (YYYY-MM-DD) in Asia/Jakarta. */
export function jakartaTodayKey(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function clampDueDate(due: string): string {
  const today = jakartaTodayKey();
  return due < today ? today : due;
}

/** Safety net: build a schedule deterministically when the planner call fails. */
export function fallbackSchedule(crop: string): GeneratedTask[] {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RunTaskPlannerParams {
  prompt: string;
  history?: ChatTurn[];
  context?: AgentContext;
  onToken?: (text: string) => void;
  supabase?: unknown;
}

export interface RunTaskPlannerResult {
  text: string;
  tasks: GeneratedTask[] | null;
}

function parseTasks(raw: unknown): GeneratedTask[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (t): t is GeneratedTask =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as GeneratedTask).title === "string" &&
      typeof (t as GeneratedTask).due_date === "string" &&
      typeof (t as GeneratedTask).phase === "string"
  );
}

/** Run the Task Planner agent: confirmed plan → parsed task list (T-302). */
export async function runTaskPlanner({
  prompt,
  history = [],
  context = {},
  onToken,
  supabase,
}: RunTaskPlannerParams): Promise<RunTaskPlannerResult> {
  const { text, functionCalls } = await runAgent({
    agent: taskPlannerAgent,
    prompt,
    history,
    context,
    onToken,
    supabase,
  });

  const tasksCall = functionCalls.find((c) => c.name === "generate_tasks");
  const tasks = tasksCall ? parseTasks(tasksCall.output) : null;

  return { text, tasks };
}

/** Payload of a streamed event (kept in sync with the SSE wire format). */
export type OrchestratorEvent =
  | { type: "token"; text: string }
  | { type: "metadata"; data: Record<string, unknown> };

export interface RunOrchestratorParams {
  message: string;
  history: ChatTurn[];
  context: AgentContext;
  /** Service-role Supabase client used by tools + task persistence. */
  supabase: SupabaseClient;
  userId: string;
  landId: string | null;
  conversationId: string;
  /** Inline image attached to the user message (T-401, F-04). */
  image: { mimeType: string; data: string } | null;
  /** Stored image path (explicit this message, or last in conversation). */
  imagePath: string | null;
  /** T-301 step 3: the last assistant message was a recommendation. */
  awaitingConfirmation: boolean;
  /** Last assistant message row (id + metadata) for confirmation marking. */
  lastAssistant: { id: string; metadata: Record<string, unknown> | null } | null;
  /** Emits SSE payloads in order (token/metadata). */
  onEvent: (event: OrchestratorEvent) => void;
}

export interface RunOrchestratorResult {
  /** Assistant message(s) to persist, in order. */
  messages: { content: string; metadata: Record<string, unknown> }[];
}

/**
 * Route the user message to the right agent and drive the feature behaviors.
 *
 * Confirmation flow (T-301/T-302): a short affirmative reply to a previously
 * persisted recommendation marks the plan confirmed and generates the task
 * schedule (with idempotency check + ≥5-task fallback). Otherwise the message
 * goes to the Diagnosis agent (when a photo is attached) or the Agronomist.
 */
export async function runOrchestrator({
  message,
  history,
  context,
  supabase,
  userId,
  landId,
  conversationId,
  image,
  imagePath,
  awaitingConfirmation,
  lastAssistant,
  onEvent,
}: RunOrchestratorParams): Promise<RunOrchestratorResult> {
  if (isAffirmative(message) && awaitingConfirmation && lastAssistant) {
    // T-301 step 3: mark the recommendation as confirmed.
    await supabase
      .from("messages")
      .update({
        metadata: { ...(lastAssistant.metadata ?? {}), plan_confirmed: true },
      })
      .eq("id", lastAssistant.id);

    const interim = STRINGS.chat.taskPlanConfirmed;
    onEvent({ type: "token", text: interim });

    // T-302: idempotency check — tasks already generated for this conversation?
    const { data: existingTasks } = await supabase
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
          supabase,
        });
        tasks = (planResult.tasks ?? []).filter(
          (t) =>
            typeof t.title === "string" &&
            typeof t.due_date === "string" &&
            typeof t.phase === "string" &&
            TASK_PHASES.includes(t.phase)
        );
      } catch (err) {
        console.error("[agents] task planner error:", err);
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
        user_id: userId,
        land_id: landId,
        conversation_id: conversationId,
        title: t.title,
        description: t.description ?? "",
        phase: t.phase,
        due_date: t.due_date,
        position: t.position ?? index,
        crop: null,
      }));

      try {
        const { error: insertError } = await supabase.from("tasks").insert(rows);
        if (insertError) {
          console.error("[agents] tasks insert error:", insertError);
        }
      } catch (err) {
        console.error("[agents] tasks insert throw:", err);
      }
    } else {
      const { data: persisted } = await supabase
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

    onEvent({ type: "token", text: summary });
    const summaryMetadata = {
      type: "task-summary",
      tasks: tasks.map((t) => ({
        title: t.title,
        due_date: t.due_date,
        phase: t.phase,
      })),
    };
    onEvent({ type: "metadata", data: summaryMetadata });

    return {
      messages: [
        { content: interim, metadata: { plan_confirmed: true } },
        { content: summary, metadata: summaryMetadata },
      ],
    };
  }

  // Default path: Agronomist, or Diagnosis when a photo is attached (F-04).
  const metadata: { toolCalls: unknown[]; land_conditions?: LandConditions } = {
    toolCalls: [],
  };
  let accumulatedText = "";

  const result: RunChatResult = await runAgent({
    agent: image !== null ? diagnosisAgent : agronomistAgent,
    prompt: message,
    history,
    context,
    supabase,
    image,
    onToken: (text) => {
      accumulatedText += text;
      onEvent({ type: "token", text });
      // Emit land_conditions as soon as the fenced JSON block completes,
      // while the rest of the recommendation keeps streaming (F-03 AC-1).
      if (metadata.land_conditions === undefined) {
        const landConditions = extractLandConditions(accumulatedText);
        if (landConditions) {
          metadata.land_conditions = landConditions;
          onEvent({ type: "metadata", data: { land_conditions: landConditions } });
        }
      }
    },
  });

  metadata.toolCalls = result.functionCalls;
  onEvent({ type: "metadata", data: metadata });

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

  const persistedMeta: Record<string, unknown> = hasMetadata
    ? { ...metadata, ...typeMeta }
    : {};

  return { messages: [{ content, metadata: persistedMeta }] };
}