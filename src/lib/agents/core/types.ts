import type { FunctionDeclaration } from "@google/genai";

/**
 * Shared agent types (T-202 refactor). Moved out of the old orchestrator.ts
 * so the ADK adapter (core/runner.ts) and the public API (index.ts) can both
 * import them without circular dependencies.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentContext {
  landSummary?: string | null;
  /** T-024: active project the conversation is linked to (name summary). */
  projectSummary?: string | null;
}

/** Legacy tool shape (declaration + executor) kept for backward compat. */
export interface AgentTool {
  declaration: FunctionDeclaration;
  execute: (
    args: Record<string, unknown>,
    supabase?: unknown
  ) => Promise<unknown> | unknown;
}

export interface RunChatParams {
  prompt: string;
  history?: ChatTurn[];
  tools?: AgentTool[];
  context?: AgentContext;
  systemInstruction?: string;
  onToken?: (text: string) => void;
  supabase?: unknown;
  /** Inline image attached to the user message (T-401, F-04): base64 data. */
  image?: { mimeType: string; data: string } | null;
}

export interface RunChatResult {
  text: string;
  functionCalls: { name: string; args: Record<string, unknown>; output: unknown }[];
}

/**
 * Land conditions extracted from the model's fenced ```json block (F-03 AC-1).
 * YAGNI: only the fields the client renders are kept.
 */
export interface LandConditions {
  location?: string;
  latitude?: number;
  longitude?: number;
  area_m2?: number;
}