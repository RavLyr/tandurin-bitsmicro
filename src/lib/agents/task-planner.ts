import { runChat, type AgentContext, type ChatTurn, type AgentTool } from "./orchestrator";
import {
  generate_tasks_declaration,
  generate_tasks_executor,
  type GeneratedTask,
} from "./tools/task-generator";
import { SYSTEM_PROMPTS } from "./prompts";

/**
 * Task Planner agent (T-202): converts a confirmed plan into a task schedule
 * via the `generate_tasks` tool, then returns the parsed tasks JSON.
 */

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

const taskPlannerTools: AgentTool[] = [
  {
    declaration: generate_tasks_declaration,
    execute: (args) =>
      generate_tasks_executor(args as Parameters<typeof generate_tasks_executor>[0]),
  },
];

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

export async function runTaskPlanner({
  prompt,
  history = [],
  context = {},
  onToken,
  supabase,
}: RunTaskPlannerParams): Promise<RunTaskPlannerResult> {
  const { text, functionCalls } = await runChat({
    prompt,
    history,
    tools: taskPlannerTools,
    context,
    systemInstruction: SYSTEM_PROMPTS.taskPlanner,
    onToken,
    supabase,
  });

  const tasksCall = functionCalls.find((c) => c.name === "generate_tasks");
  const tasks = tasksCall ? parseTasks(tasksCall.output) : null;

  return { text, tasks };
}