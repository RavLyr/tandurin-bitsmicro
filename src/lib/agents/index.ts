import { runAgent } from "./core/runner";
import type { AgentContext, ChatTurn, LandConditions, RunChatResult } from "./core/types";
import { agronomistAgent, diagnosisAgent } from "./agents/agronomist";
import { taskPlannerAgent } from "./agents/task-planner";
import { projectCreatorAgent } from "./agents/project-creator";
import {
  generate_tasks_executor,
  type GeneratedTask,
  type TaskPhase,
} from "./tools/task-generator";
import {
  generate_one_time_tasks_executor,
  type GeneratedOneTimeTaskWithDue,
} from "./tools/one-time-task-generator";
import { generate_recurring_templates_executor } from "./tools/recurring-task-generator";
import { generate_project_executor, type GeneratedProject } from "./tools/project-generator";
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
export type { GeneratedOneTimeTaskWithDue } from "./tools/one-time-task-generator";
export type {
  GeneratedProject,
  GeneratedOneTimeTask,
  GeneratedRecurringTemplate,
} from "./tools/project-generator";
export { agronomistAgent, diagnosisAgent } from "./agents/agronomist";
export { taskPlannerAgent } from "./agents/task-planner";
export { projectCreatorAgent } from "./agents/project-creator";
export { oneTimeTaskGeneratorAgent } from "./agents/one-time-task-generator";
export { recurringTaskGeneratorAgent } from "./agents/recurring-task-generator";
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

/** A single crop suggestion in the agronomist's structured output (F-03). */
export interface CropRecommendation {
  crop: string;
  match_percent: number;
  reason: string;
}

/**
 * Parse crop recommendations straight from the agronomist's markdown output.
 * This is the reliable path — the AI reliably emits markdown crop lists, but
 * often skips the optional JSON <recommendations> block. Expected shape:
 *
 *   ### 1. Kangkung Darat
 *   * **Kecocokan:** 95%
 *   * **Alasan:** Toleran terhadap suhu panas, cepat tumbuh.
 *   ### 2. Bayam Hijau
 *   * **Kecocokan:** 90%
 *   * **Alasan:** Butuh sinar matahari penuh.
 */
export function parseRecommendationsFromMarkdown(text: string): CropRecommendation[] | null {
  const result: CropRecommendation[] = [];
  // Split on H3 headings (each crop). Match "### <n>. <name>" or "### <name>".
  const sections = text.split(/^###\s+/m).slice(1);
  for (const section of sections) {
    const lines = section.split("\n");
    const heading = lines[0].trim();
    const block = lines.slice(1).join("\n");

    // A real crop section always carries a "**Kecocokan:** NN%" line. Without it
    // the heading is something else (e.g. the AI's "### **Fase 1...** schedule
    // phases) — skip those so they don't pollute the recommendation card.
    const percentMatch = block.match(/\*\*Kecocokan:\*\*\s*(\d+)%/);
    if (!percentMatch) continue;
    const match_percent = parseInt(percentMatch[1], 10);

    // Strip leading "1. " / "1) " numbering from the heading.
    const crop = heading.replace(/^\d+[\.\)]\s*/, "").trim();
    if (!crop) continue;

    const reasonMatch = block.match(/\*\*Alasan:\*\*\s*([\s\S]+?)(?=\n\*|\n###|$)/);
    const reason = reasonMatch ? reasonMatch[1].trim() : "";

    result.push({ crop, match_percent, reason });
  }
  return result.length > 0 ? result : null;
}

/**
 * Parse the agronomist's `<recommendations>...</recommendations>` JSON block
 * into a CropRecommendation array. Mirrors extractLandConditions (F-03 AC-1):
 * the card needs structured crop data — the markdown text alone won't render.
 */
export function extractRecommendations(accumulated: string): CropRecommendation[] | null {
  // Scan ALL fenced JSON blocks — land_conditions comes first, recommendations
  // after. Return the first block that carries a `recommendations` array.
  const blockRe = /```json\s*(\{[\s\S]*?\})\s*```/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRe.exec(accumulated)) !== null) {
    try {
      const parsed: unknown = JSON.parse(blockMatch[1]);
      if (typeof parsed !== "object" || parsed === null) continue;
      const arr = (parsed as Record<string, unknown>).recommendations;
      if (!Array.isArray(arr)) continue;
      const result: CropRecommendation[] = [];
      for (const item of arr) {
        if (typeof item !== "object" || item === null) continue;
        const i = item as Record<string, unknown>;
        if (typeof i.crop !== "string") continue;
        result.push({
          crop: i.crop,
          match_percent: typeof i.match_percent === "number" ? i.match_percent : 0,
          reason: typeof i.reason === "string" ? i.reason : "",
        });
      }
      if (result.length > 0) return result;
    } catch {
      // Malformed block — keep scanning.
    }
  }
  return null;
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

/** Direct request to start a new planting project (T-012, project flow). */
const PROJECT_INTENT = /(saya|aku)\s+(ingin|mau|pengen)\s+(menanam|tanam|mulai|buat)|buat\s+proyek|proyek\s+baru|mulai\s+tanam/i;

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

/**
 * Next free position for new tasks on a land: kanban enforces
 * UNIQUE (user_id, land_id, status, position) across ALL projects, so a new
 * batch must start after the current max position (23505 otherwise).
 */
export async function taskPositionOffset(
  supabase: SupabaseClient,
  userId: string,
  landId: string | null
): Promise<number> {
  if (!landId) return 0;
  try {
    const { data } = await supabase
      .from("tasks")
      .select("position")
      .eq("user_id", userId)
      .eq("land_id", landId)
      .order("position", { ascending: false })
      .limit(1);
    const max = (data && data[0]?.position as number | null) ?? null;
    return typeof max === "number" ? max + 1 : 0;
  } catch {
    return 0;
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

export interface RunProjectCreatorParams {
  prompt: string;
  history?: ChatTurn[];
  context?: AgentContext;
  onToken?: (text: string) => void;
  supabase?: unknown;
}

export interface RunProjectCreatorResult {
  text: string;
  project: GeneratedProject | null;
  crops: string[];
}

function parseProject(raw: unknown): GeneratedProject | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.name !== "string") return null;
  return {
    name: p.name,
    description: typeof p.description === "string" ? p.description : "",
    one_time_tasks: Array.isArray(p.one_time_tasks)
      ? (p.one_time_tasks as GeneratedProject["one_time_tasks"])
      : [],
    recurring_templates: Array.isArray(p.recurring_templates)
      ? (p.recurring_templates as GeneratedProject["recurring_templates"])
      : [],
  };
}

/** Run the Project Creator agent: intent → parsed project skeleton (T-011). */
export async function runProjectCreator({
  prompt,
  history = [],
  context = {},
  onToken,
  supabase,
}: RunTaskPlannerParams): Promise<RunProjectCreatorResult> {
  const { text, functionCalls } = await runAgent({
    agent: projectCreatorAgent,
    prompt,
    history,
    context,
    onToken,
    supabase,
  });

  const projectCall = functionCalls.find((c) => c.name === "generate_project");
  const project = projectCall ? parseProject(projectCall.output) : null;
  // The tool takes a single `crop` param (not a `crops` array); fall back to
  // any legacy `crops` array for forward compat. `crops[0]` feeds the
  // one-time task generator, so a missing value would relabel tasks as
  // "Tanaman" — keep the model's crop string first.
  const rawCrop = projectCall?.args?.crop;
  const rawCrops = projectCall?.args?.crops;
  const crops = [
    ...(typeof rawCrop === "string" ? [rawCrop] : []),
    ...(Array.isArray(rawCrops)
      ? rawCrops.filter((c): c is string => typeof c === "string")
      : []),
  ];

  return { text, project, crops };
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
  /** T-024: active project the conversation is linked to (null = none). */
  projectId?: string | null;
  /** Inline image attached to the user message (T-401, F-04). */
  image: { mimeType: string; data: string } | null;
  /** Stored image path (explicit this message, or last in conversation). */
  imagePath: string | null;
  /** T-301 step 3: the last assistant message was a recommendation. */
  awaitingConfirmation: boolean;
  /** Last assistant message row (id + metadata) for confirmation marking. */
  lastAssistant: { id: string; metadata: Record<string, unknown> | null } | null;
  /** T-024: explicit crops from the "Buat Proyek" button — when set, the project is built deterministically (no LLM agent). */
  projectCrops?: string[];
  /** Emits SSE payloads in order (token/metadata). */
  onEvent: (event: OrchestratorEvent) => void;
}

export interface RunOrchestratorResult {
  /** Assistant message(s) to persist, in order. */
  messages: { content: string; metadata: Record<string, unknown> }[];
}

interface ProjectCreationParams {
  message: string;
  history: ChatTurn[];
  context: AgentContext;
  supabase: SupabaseClient;
  userId: string;
  landId: string | null;
  conversationId: string;
  /** T-024: explicit crops → deterministic project build (skip LLM agent). */
  projectCrops?: string[];
  onEvent: (event: OrchestratorEvent) => void;
}

/**
 * Project creation flow: resolve a project skeleton (one-time tasks +
 * recurring templates), persist it + its tasks, and stream the summary.
 *
 * Two paths:
 *  - Deterministic (projectCrops set): build the project straight from the
 *    supplied crops via generate_project_executor — no LLM agent, so it can't
 *    fail to emit a tool-call. Used by the "Buat Proyek" button.
 *  - Agent (no projectCrops): run the Project Creator LLM agent. Returns null
 *    when the agent produces no project (caller falls through to default path).
 */
async function runProjectCreationFlow({
  message,
  history,
  context,
  supabase,
  userId,
  landId,
  conversationId,
  projectCrops,
  onEvent,
}: ProjectCreationParams): Promise<RunOrchestratorResult | null> {
  let project: GeneratedProject | null;
  let crops: string[];

  if (projectCrops && projectCrops.length > 0) {
    // Deterministic path: the user accepted a recommendation — build the
    // project from its crops directly, no LLM round-trip.
    const crop = projectCrops[0];
    project = generate_project_executor({
      crop,
      project_name: `Proyek ${crop}`,
      description: `Proyek tanam ${projectCrops.join(", ")} di lahan aktif.`,
    });
    crops = projectCrops;
  } else {
    let result: RunProjectCreatorResult;
    try {
      result = await runProjectCreator({ prompt: message, history, context, supabase });
    } catch (err) {
      console.error("[agents] project creator error:", err);
      return null;
    }
    if (!result.project) return null;
    project = result.project;
    crops = result.crops;
  }

  if (!project) return null;

  if (!landId) {
    onEvent({ type: "token", text: STRINGS.chat_errors.noLand });
    return {
      messages: [{ content: STRINGS.chat_errors.noLand, metadata: {} }],
    };
  }

  const interim = STRINGS.projects.creating;
  onEvent({ type: "token", text: interim });

  const { data: createdProject, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: userId, land_id: landId, name: project.name, description: project.description })
    .select("id, name")
    .single();

  if (projectError || !createdProject) {
    onEvent({ type: "token", text: STRINGS.projects.failed });
    return { messages: [{ content: STRINGS.projects.failed, metadata: {} }] };
  }
  const projectId = createdProject.id;

  // T-024: link the conversation to the project so /riwayat shows the badge
  // and resuming the chat carries the project context.
  if (conversationId && projectId) {
    await supabase
      .from("conversations")
      .update({ project_id: projectId })
      .eq("id", conversationId);
  }

  // generate_project returns tasks without due_date — computed here (T-008).
  const crop = crops[0] ?? "Tanaman";
  let oneTimeTasks: GeneratedOneTimeTaskWithDue[];
  try {
    oneTimeTasks = generate_one_time_tasks_executor({
      project_summary: { crops: [crop], planting_window: "mulai hari ini", experience: "beginner" },
    });
  } catch {
    oneTimeTasks = [];
  }
  if (oneTimeTasks.length === 0) {
    oneTimeTasks = project.one_time_tasks.map((t) => ({
      title: t.title,
      description: t.description,
      phase: t.phase,
      position: t.position,
      due_date: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }));
  }

  // Positions must be unique per (user, land, status) across all projects —
  // start the batch after the current max so previous Kanban rows keep order.
  const positionStart = await taskPositionOffset(supabase, userId, landId);
  const taskRows = oneTimeTasks.map((t, index) => ({
    user_id: userId,
    land_id: landId,
    project_id: projectId,
    conversation_id: conversationId,
    title: t.title,
    description: t.description,
    phase: t.phase,
    due_date: t.due_date,
    position: positionStart + index,
    crop: null,
  }));
  const { error: tasksError } = await supabase.from("tasks").insert(taskRows);
  if (tasksError) {
    console.error("[agents] project tasks insert error:", tasksError);
  }

  // Recurring templates — interval/time defaults already applied in the tool.
  const templateRows = project.recurring_templates.map((t) => ({
    user_id: userId,
    project_id: projectId,
    title: t.title,
    description: t.description,
    category: t.category,
    interval_days: t.interval_days,
    time_of_day: t.time_of_day,
    is_active: true,
  }));
  if (templateRows.length > 0) {
    const { error: templatesError } = await supabase
      .from("recurring_task_templates")
      .insert(templateRows);
    if (templatesError) {
      console.error("[agents] recurring templates insert error:", templatesError);
    }
  }

  const summary = STRINGS.projects.createdSummary(
    createdProject.name,
    taskRows.length,
    templateRows.length
  );
  onEvent({ type: "token", text: summary });

  const summaryMetadata = {
    type: "project_created",
    project_id: projectId,
    tasks_count: taskRows.length,
    recurring_count: templateRows.length,
  };
  onEvent({ type: "metadata", data: summaryMetadata });

  return {
    messages: [
      { content: interim, metadata: { type: "project-creating" } },
      { content: summary, metadata: summaryMetadata },
    ],
  };
}

interface EnsureProjectParams {
  /** Existing project the conversation is already linked to (null = none). */
  existingProjectId: string | null;
  /** Recommendation message metadata — crops come from here. */
  recommendationMetadata: Record<string, unknown> | null;
  supabase: SupabaseClient;
  userId: string;
  landId: string | null;
  conversationId: string;
}

/**
 * Ensure the conversation has a project before generating tasks, so tasks are
 * never left orphaned on the board (T-024). If the conversation is already
 * linked to a project, reuse it; otherwise create a new project from the
 * recommendation's crops and link the conversation to it.
 */
async function ensureProjectForRecommendation({
  existingProjectId,
  recommendationMetadata,
  supabase,
  userId,
  landId,
  conversationId,
}: EnsureProjectParams): Promise<string | null> {
  // Reuse the project the conversation is already linked to.
  if (existingProjectId) return existingProjectId;

  // Extract structured crops from the recommendation metadata.
  const recs = recommendationMetadata?.recommendations;
  let crops: string[] = [];
  if (Array.isArray(recs)) {
    crops = recs
      .map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>).crop : undefined))
      .filter((c): c is string => typeof c === "string" && c.trim() !== "");
  }
  if (crops.length === 0) return null;

  const crop = crops[0];
  const project = generate_project_executor({
    crop,
    project_name: `Proyek ${crop}`,
    description: `Proyek tanam ${crops.join(", ")} di lahan aktif.`,
  });

  const { data: created, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, land_id: landId, name: project.name, description: project.description })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[agents] ensureProject project insert error:", error);
    return null;
  }

  // Link the conversation to the new project.
  if (conversationId) {
    await supabase
      .from("conversations")
      .update({ project_id: created.id })
      .eq("id", conversationId);
  }
  return created.id;
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
  projectId,
  image,
  imagePath,
  awaitingConfirmation,
  lastAssistant,
  projectCrops,
  onEvent,
}: RunOrchestratorParams): Promise<RunOrchestratorResult> {
  // T-024: surface the active project to downstream agents so the
  // project-creation-avoidance / task-planner flows can reference it.
  const agentContext: AgentContext = { ...context };
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    if (project?.name) {
      agentContext.projectSummary = `Proyek aktif: ${project.name}`;
    }
  }

  // Explicit "Buat Proyek" button click — ALWAYS creates a project, even when
  // a recommendation is pending confirmation. The button is the user's deliberate
  // intent, so it must not be blocked by the confirmation-state guard below.
  if (projectCrops && projectCrops.length > 0) {
    const creation = await runProjectCreationFlow({
      message,
      history,
      context: agentContext,
      supabase,
      userId,
      landId,
      conversationId,
      projectCrops,
      onEvent,
    });
    if (creation) return creation;
  } else if (PROJECT_INTENT.test(message) && !awaitingConfirmation) {
    // Typed project intent — only when not mid-confirmation, to avoid conflicting
    // with the task-generation path right below.
    const creation = await runProjectCreationFlow({
      message,
      history,
      context: agentContext,
      supabase,
      userId,
      landId,
      conversationId,
      onEvent,
    });
    if (creation) return creation;
  }

  if (isAffirmative(message) && awaitingConfirmation && lastAssistant) {
    // T-301 step 3: mark the recommendation as confirmed.
    await supabase
      .from("messages")
      .update({
        metadata: { ...(lastAssistant.metadata ?? {}), plan_confirmed: true },
      })
      .eq("id", lastAssistant.id);

    // T-024: ensure the conversation has a project so tasks are never orphaned
    // on the board — reuse the linked project, or create one from the
    // recommendation's crops. Tasks get assigned to this project below.
    const resolvedProjectId = await ensureProjectForRecommendation({
      existingProjectId: projectId ?? null,
      recommendationMetadata: lastAssistant.metadata,
      supabase,
      userId,
      landId,
      conversationId,
    });

    const interim = STRINGS.chat.taskPlanConfirmed;
    onEvent({ type: "token", text: interim });

    // Crops drive the deterministic schedule. Prefer the structured
    // recommendation metadata; fall back to the active land name.
    const recs = lastAssistant.metadata?.recommendations;
    let crops: string[] = [];
    if (Array.isArray(recs)) {
      crops = recs
        .map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>).crop : undefined))
        .filter((c): c is string => typeof c === "string" && c.trim() !== "");
    }
    if (crops.length === 0) {
      const fallbackCrop = (agentContext.landSummary?.match(/Nama lahan: ([^\n]+)/)?.[1] ??
        "Tanaman") as string;
      crops = [fallbackCrop];
    }

    // T-302: idempotency check — tasks already generated for this conversation?
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(1);

    let tasks: GeneratedTask[] = [];
    if (!existingTasks || existingTasks.length === 0) {
      // Deterministic schedule (same executors the project-creation flow uses):
      // one-time phases get due dates; recurring phases become templates so
      // penyiraman/pemupukan/perawatan are NOT one-off board tasks.
      const oneTimeTasks = generate_one_time_tasks_executor({
        project_summary: { crops, planting_window: "mulai hari ini", experience: "beginner" },
      });

      tasks = oneTimeTasks.map((t) => ({
        title: t.title,
        description: t.description,
        due_date: clampDueDate(t.due_date),
        phase: t.phase,
        position: t.position,
      }));

      const positionStart = await taskPositionOffset(supabase, userId, landId);
      const rows = tasks.map((t, index) => ({
        user_id: userId,
        land_id: landId,
        project_id: resolvedProjectId,
        conversation_id: conversationId,
        title: t.title,
        description: t.description ?? "",
        phase: t.phase,
        due_date: t.due_date,
        position: positionStart + index,
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

      // Recurring templates — these power the repeating care schedule.
      const recurringTemplates = generate_recurring_templates_executor({
        project_summary: { crops, recurring_categories: ["penyiraman", "pemupukan", "perawatan", "pestisida"] },
      });
      const templateRows = recurringTemplates.map((t) => ({
        user_id: userId,
        project_id: resolvedProjectId,
        title: t.title,
        description: t.description,
        category: t.category,
        interval_days: t.interval_days,
        time_of_day: t.time_of_day,
        is_active: true,
      }));
      if (templateRows.length > 0) {
        const { error: templatesError } = await supabase
          .from("recurring_task_templates")
          .insert(templateRows);
        if (templatesError) {
          console.error("[agents] recurring templates insert error:", templatesError);
        }
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
      project_id: resolvedProjectId,
      tasks_count: tasks.length,
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
  const metadata: {
    toolCalls: unknown[];
    land_conditions?: LandConditions;
    recommendations?: CropRecommendation[];
  } = { toolCalls: [] };
  let accumulatedText = "";

  const result: RunChatResult = await runAgent({
    agent: image !== null ? diagnosisAgent : agronomistAgent,
    prompt: message,
    history,
    context: agentContext,
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
      // Emit structured crop data for the recommendation card (F-03 AC-1).
      // Mirrors land_conditions: the card can't render from markdown text alone.
      if (metadata.recommendations === undefined) {
        const recs = extractRecommendations(accumulatedText);
        if (recs) {
          metadata.recommendations = recs;
          onEvent({ type: "metadata", data: { recommendations: recs } });
        }
      }
    },
  });

  metadata.toolCalls = result.functionCalls;
  // Resolve structured crop data. The JSON <recommendations> block is optional
  // and the AI often skips it — so the reliable fallback is parsing the
  // markdown crop list the agronomist reliably emits.
  if (metadata.recommendations === undefined) {
    const fromJson = extractRecommendations(result.text);
    if (fromJson) {
      metadata.recommendations = fromJson;
    } else {
      const fromMarkdown = parseRecommendationsFromMarkdown(result.text);
      if (fromMarkdown) metadata.recommendations = fromMarkdown;
    }
  }

  const content = result.text.trim() || STRINGS.chat_errors.aiUnavailable;
  const isRecommendation = /Apakah rencana ini sesuai\?/.test(content);
  const hasMetadata =
    metadata.toolCalls.length > 0 ||
    metadata.land_conditions !== undefined ||
    metadata.recommendations !== undefined ||
    isRecommendation ||
    image !== null;
  // Merge type into metadata BEFORE emitting — the streaming event is what the
  // client renders live; without `type` the recommendation card never shows
  // until a reload reads the (typed) row back from the DB.
  const typeMeta = isRecommendation
    ? { type: "recommendation" }
    : image !== null
      ? {
          type: "diagnosis",
          image_path: imagePath,
          mime_type: image?.mimeType ?? "image/jpeg",
        }
      : {};
  if (Object.keys(typeMeta).length > 0) Object.assign(metadata, typeMeta);

  onEvent({ type: "metadata", data: metadata });

  const persistedMeta: Record<string, unknown> = hasMetadata ? metadata : {};

  return { messages: [{ content, metadata: persistedMeta }] };
}