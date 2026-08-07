import type { FunctionDeclaration } from "@google/genai";
import { weather_declaration, weather_executor } from "./weather";
import { search_declaration, search_executor } from "./search";
import { generate_tasks_declaration, generate_tasks_executor } from "./task-generator";

/**
 * Tool registry (NFR-08): exactly one registration line per tool.
 * Executors that need Supabase receive it at call time from the caller.
 */
export const TOOLS: Record<
  string,
  {
    declaration: FunctionDeclaration;
    execute: (
      args: Record<string, unknown>,
      supabase?: unknown
    ) => Promise<unknown> | unknown;
  }
> = {
  // (a) weather_lookup — cache-first OpenWeatherMap (needs supabase client)
  weather_lookup: {
    declaration: weather_declaration,
    execute: (args, supabase) => weather_executor(args as Parameters<typeof weather_executor>[0], supabase as Parameters<typeof weather_executor>[1]),
  },
  // (b) search_references — Gemini google_search grounding, no extra key
  search_references: {
    declaration: search_declaration,
    execute: (args) => search_executor(args as Parameters<typeof search_executor>[0]),
  },
  // (c) generate_tasks — deterministic planner from confirmed plan
  generate_tasks: {
    declaration: generate_tasks_declaration,
    execute: (args) =>
      generate_tasks_executor(args as Parameters<typeof generate_tasks_executor>[0]),
  },
};

export { weather_declaration, weather_executor, type WeatherResult } from "./weather";
export { search_declaration, search_executor, type SearchResult } from "./search";
export {
  generate_tasks_declaration,
  generate_tasks_executor,
  type GeneratedTask,
  type TaskPhase,
} from "./task-generator";
