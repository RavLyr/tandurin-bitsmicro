import { LlmAgent } from "@google/adk";
import { generateTasksTool } from "../tools/task-generator";
import { SYSTEM_PROMPTS } from "../prompts";
import { AGENT_MODEL } from "./agronomist";

/**
 * Task Planner agent (ADK-orchestrator refactor): converts a confirmed plan
 * into a task schedule via the `generate_tasks` FunctionTool.
 */

export const taskPlannerAgent: LlmAgent = new LlmAgent({
  name: "TaskPlanner",
  model: AGENT_MODEL,
  description:
    "Membuat jadwal tugas tanam (≥5 tugas) dari rencana tanam yang sudah dikonfirmasi pengguna.",
  instruction: SYSTEM_PROMPTS.taskPlanner,
  tools: [generateTasksTool],
});