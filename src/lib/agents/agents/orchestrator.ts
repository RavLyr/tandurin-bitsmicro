import { LlmAgent } from "@google/adk";
import { agronomistAgent, diagnosisAgent } from "./agronomist";
import { taskPlannerAgent } from "./task-planner";
import { projectCreatorAgent } from "./project-creator";
import { oneTimeTaskGeneratorAgent } from "./one-time-task-generator";
import { recurringTaskGeneratorAgent } from "./recurring-task-generator";
import { SYSTEM_PROMPTS } from "../prompts";
import { AGENT_MODEL } from "./agronomist";

/**
 * Root Orchestrator agent (ADK-orchestrator refactor): routes intents to its
 * subAgents. The serverless runner does NOT transfer via ADK's runtime; the
 * routing itself is implemented in the public API (index.ts), which picks the
 * concrete LlmAgent to execute. `subAgents` documents the hierarchy and keeps
 * the ADK definition faithful to the architecture.
 */

export const orchestratorAgent: LlmAgent = new LlmAgent({
  name: "Orchestrator",
  model: AGENT_MODEL,
  description:
    "Router utama Tanduri: mengarahkan pertanyaan ke Agronomist, Diagnosis, Task Planner, Project Creator, One-Time Task Generator, atau Recurring Task Generator.",
  instruction: SYSTEM_PROMPTS.orchestrator,
  tools: [],
  subAgents: [
    agronomistAgent,
    diagnosisAgent,
    taskPlannerAgent,
    projectCreatorAgent,
    oneTimeTaskGeneratorAgent,
    recurringTaskGeneratorAgent,
  ],
});