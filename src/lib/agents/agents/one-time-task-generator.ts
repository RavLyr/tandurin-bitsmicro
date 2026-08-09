import { LlmAgent } from "@google/adk";
import { generateOneTimeTasksTool } from "../tools/one-time-task-generator";
import { SYSTEM_PROMPTS } from "../prompts";
import { AGENT_MODEL } from "./agronomist";

/**
 * One-Time Task Generator agent (project-based-refactor plan T-009): converts
 * a confirmed project plan into one-time tasks with due dates via the
 * `generate_one_time_tasks` FunctionTool.
 */

export const oneTimeTaskGeneratorAgent: LlmAgent = new LlmAgent({
  name: "OneTimeTaskGenerator",
  model: AGENT_MODEL,
  description:
    "Membuat jadwal tugas satu kali (olah_lahan, semai, tanam, panen) dengan tanggal jatuh tempo untuk proyek yang sudah dikonfirmasi.",
  instruction: SYSTEM_PROMPTS.oneTimeTaskGenerator,
  tools: [generateOneTimeTasksTool],
});