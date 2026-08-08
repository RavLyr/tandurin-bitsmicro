import { LlmAgent } from "@google/adk";
import { weatherTool } from "../tools/weather";
import { searchTool } from "../tools/search";
import { SYSTEM_PROMPTS } from "../prompts";

/**
 * Agronomist agent (ADK-orchestrator refactor): crop planning / care advice.
 * Registers the weather + search ADK FunctionTools; the serverless runner
 * (core/runner.ts) executes it via @google/genai.
 */

export const AGENT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const agronomistAgent: LlmAgent = new LlmAgent({
  name: "Agronomist",
  model: AGENT_MODEL,
  description:
    "Ahli pertanian halaman: rekomendasi komoditas, jadwal tanam, perawatan, cuaca, dan referensi pasar.",
  instruction: SYSTEM_PROMPTS.agronomist,
  tools: [weatherTool, searchTool],
});

export const diagnosisAgent: LlmAgent = new LlmAgent({
  name: "Diagnosis",
  model: AGENT_MODEL,
  description: "Diagnosa foto kondisi tanaman (F-04) untuk pemula.",
  instruction: SYSTEM_PROMPTS.diagnosis,
  tools: [weatherTool, searchTool],
});