import {
  Context,
  InvocationContext,
  PluginManager,
  createSession,
  isFunctionTool,
  type FunctionTool,
  type LlmAgent,
} from "@google/adk";
import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type FunctionResponse,
  type Part,
  type Tool,
} from "@google/genai";
import type { AgentContext, ChatTurn, RunChatResult } from "./types";

/**
 * Serverless runner (ADK-orchestrator refactor): executes agents defined with
 * `@google/adk` (LlmAgent + FunctionTool) through the `@google/genai` SDK.
 *
 * `InMemoryRunner` keeps state across requests, which does not fit the
 * stateless Next.js/Vercel serverless model. Instead, this adapter reads the
 * agent's tool declarations (`FunctionTool._getDeclaration()`) and drives the
 * same generateContentStream function-calling loop the old orchestrator used.
 * The ADK types stay the source of truth for the hierarchy (LLM agents,
 * subAgents, Zod-validated tools); execution remains stateless per request.
 *
 * The getter loop is identical to the legacy `runChat()`:
 * - MAX_HISTORY=20 turns feed the model;
 * - tool-call turns never stream text (planning prose is discarded);
 * - only the final turn's tokens are forwarded via `onToken`.
 */

const MAX_HISTORY = 20;
const MAX_FUNCTION_TURNS = 5;

export interface RunAgentParams {
  agent: LlmAgent;
  prompt: string;
  history?: ChatTurn[];
  context?: AgentContext;
  onToken?: (text: string) => void;
  supabase?: unknown;
  /** Inline image attached to the user message (T-401, F-04): base64 data. */
  image?: { mimeType: string; data: string } | null;
}

function getClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

/** Build the full contents array: system -> history (trimmed) -> user. */
function buildContents(
  systemInstruction: string,
  history: ChatTurn[],
  prompt: string,
  image?: { mimeType: string; data: string } | null
): { systemInstruction: string; contents: Content[] } {
  const trimmed = history.slice(-MAX_HISTORY);
  const contents: Content[] = trimmed.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.content }],
  }));
  const userParts: Part[] = [];
  if (image) {
    userParts.push({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }
  userParts.push({ text: prompt });
  contents.push({ role: "user", parts: userParts });
  return { systemInstruction, contents };
}

/**
 * Build a minimal ADK Context so FunctionTool.execute can read session state
 * via `toolContext.state.get(...)` (e.g. the injected Supabase client).
 * Rebuilt per tool call — the serverless model is stateless.
 */
function buildToolContext(agent: LlmAgent, supabase?: unknown): Context {
  const session = createSession({
    id: `serverless-${Date.now()}`,
    appName: "tanduri",
    state: { supabase },
  });
  const invocationContext = new InvocationContext({
    invocationId: `inv-${Date.now()}`,
    agent,
    session,
    pluginManager: new PluginManager(),
  });
  return new Context({ invocationContext });
}

/** Resolve the agent's plain-text instruction (provider functions are YAGNI). */
function resolveInstruction(agent: LlmAgent): string {
  const instruction = agent.instruction;
  return typeof instruction === "string" ? instruction : "";
}

export async function runAgent({
  agent,
  prompt,
  history = [],
  context,
  onToken,
  supabase,
  image = null,
}: RunAgentParams): Promise<RunChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const client = getClient(apiKey);

  // ADK tools → genai function declarations (no manual conversion: FunctionTool
  // already exposes the FunctionDeclaration via _getDeclaration()).
  const toolMap = new Map<string, FunctionTool>();
  const declarations: FunctionDeclaration[] = [];
  for (const tool of agent.tools ?? []) {
    if (isFunctionTool(tool)) {
      const declaration = tool._getDeclaration();
      if (declaration.name) {
        toolMap.set(declaration.name, tool);
        declarations.push(declaration);
      }
    }
  }
  const toolsConfig: Tool[] | undefined =
    declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;

  const baseInstruction = resolveInstruction(agent);
  const instruction = context?.landSummary
    ? `${baseInstruction}\n\nInfo lahan aktif pengguna:\n${context.landSummary}`
    : baseInstruction;

  let { contents } = buildContents(instruction, history, prompt, image);

  const functionCalls: { name: string; args: Record<string, unknown>; output: unknown }[] = [];
  let text = "";

  for (let turn = 0; turn <= MAX_FUNCTION_TURNS; turn += 1) {
    const response = await client.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: instruction,
        tools: toolsConfig,
      },
    });

    const modelParts: Part[] = [];
    const callParts: {
      name?: string;
      args?: Record<string, unknown>;
      id?: string;
    }[] = [];
    let turnText = "";
    const turnTokens: string[] = [];

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.functionCall) {
          modelParts.push(part);
          callParts.push(part.functionCall);
        } else if (part.text) {
          turnText += part.text;
          turnTokens.push(part.text);
        }
      }
    }

    if (callParts.length === 0) {
      // Final turn: stream its tokens (they are the user-facing answer).
      for (const token of turnTokens) onToken?.(token);
      text += turnText;
      break;
    }

    // Tool-call turn: never stream its text — the model emits planning
    // prose ("Decision: Call ...") that is not for the user. Its turnText is
    // deliberately discarded too (no answer yet).

    // Execute tool calls via the ADK FunctionTool (Zod-validated), feeding the
    // responses back to the model.
    const functionResponses: FunctionResponse[] = [];
    for (const call of callParts) {
      const tool = toolMap.get(call.name ?? "");
      let payload: unknown = null;
      if (tool) {
        try {
          payload = await tool.runAsync({
            args: call.args ?? {},
            toolContext: buildToolContext(agent, supabase ?? undefined),
          });
        } catch {
          payload = null;
        }
      }
      functionCalls.push({ name: call.name ?? "", args: call.args ?? {}, output: payload });
      functionResponses.push({
        name: call.name ?? "",
        id: call.id,
        response: { output: payload },
      });
    }

    contents = [
      ...contents,
      { role: "model", parts: modelParts },
      { role: "user", parts: functionResponses.map((r) => ({ functionResponse: r })) },
    ];

    if (turn === MAX_FUNCTION_TURNS) break;
  }

  return { text, functionCalls };
}