import { runChat, type AgentContext, type ChatTurn } from "./orchestrator";
import { weather_declaration, weather_executor } from "./tools/weather";
import { search_declaration, search_executor } from "./tools/search";
import { SYSTEM_PROMPTS } from "./prompts";
import type { AgentTool } from "./orchestrator";

/**
 * Agronomist agent (T-202): crop planning / care advice. Registers the weather
 * and search tools, injects an active-land summary when available.
 */

export interface RunAgronomistParams {
  prompt: string;
  history?: ChatTurn[];
  context?: AgentContext;
  onToken?: (text: string) => void;
  supabase?: unknown;
  image?: { mimeType: string; data: string } | null;
  /** When true, use the diagnosis system prompt (T-401, F-04). */
  diagnose?: boolean;
}

export interface RunAgronomistResult {
  text: string;
  functionCalls: { name: string; args: Record<string, unknown>; output: unknown }[];
}

const agronomistTools: AgentTool[] = [
  {
    declaration: weather_declaration,
    execute: (args, supabase) =>
      weather_executor(args as Parameters<typeof weather_executor>[0], supabase as Parameters<typeof weather_executor>[1]),
  },
  {
    declaration: search_declaration,
    execute: (args) => search_executor(args as Parameters<typeof search_executor>[0]),
  },
];

export async function runAgronomist({
  prompt,
  history = [],
  context = {},
  onToken,
  supabase,
  image = null,
  diagnose = false,
}: RunAgronomistParams): Promise<RunAgronomistResult> {
  const { text, functionCalls } = await runChat({
    prompt,
    history,
    tools: agronomistTools,
    context,
    systemInstruction: diagnose ? SYSTEM_PROMPTS.diagnosis : SYSTEM_PROMPTS.agronomist,
    onToken,
    supabase,
    image,
  });

  return { text, functionCalls };
}