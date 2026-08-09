import { LlmAgent } from "@google/adk";
import { generateRecurringTemplatesTool } from "../tools/recurring-task-generator";
import { SYSTEM_PROMPTS } from "../prompts";
import { AGENT_MODEL } from "./agronomist";

/**
 * Recurring Task Generator agent (project-based-refactor plan T-010):
 * converts a confirmed project plan into recurring task templates via the
 * `generate_recurring_templates` FunctionTool.
 */

export const recurringTaskGeneratorAgent: LlmAgent = new LlmAgent({
  name: "RecurringTaskGenerator",
  model: AGENT_MODEL,
  description:
    "Membuat template tugas rutin berulang (penyiraman, pemupukan, perawatan, pestisida) untuk proyek yang sudah dikonfirmasi.",
  instruction: SYSTEM_PROMPTS.recurringTaskGenerator,
  tools: [generateRecurringTemplatesTool],
});