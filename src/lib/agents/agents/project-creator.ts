import { LlmAgent } from "@google/adk";
import { generateProjectTool } from "../tools/project-generator";
import { SYSTEM_PROMPTS } from "../prompts";
import { AGENT_MODEL } from "./agronomist";

/**
 * Project Creator agent (project-based-refactor plan T-008): analyzes the
 * user's message + land and calls `generate_project` to produce a project
 * skeleton (one-time tasks + recurring templates).
 */

export const projectCreatorAgent: LlmAgent = new LlmAgent({
  name: "ProjectCreator",
  model: AGENT_MODEL,
  description:
    "Membuat proyek tanam baru dari keinginan pengguna: satu proyek untuk satu lahan, lengkap dengan tugas satu kali dan template tugas rutin.",
  instruction: SYSTEM_PROMPTS.projectCreator,
  tools: [generateProjectTool],
});