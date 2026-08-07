import { GoogleGenAI, type Content, type FunctionDeclaration, type FunctionResponse, type Part, type Tool } from "@google/genai";

/**
 * Orchestrator (T-202): generic streaming chat + Gemini function-calling loop.
 * Agents (agronomist/task-planner) build on this with their own prompts/tools.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentContext {
  landSummary?: string | null;
}

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

const MAX_HISTORY = 20;
const MAX_FUNCTION_TURNS = 5;

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

export async function runChat({
  prompt,
  history = [],
  tools = [],
  context = {},
  systemInstruction = "",
  onToken,
  supabase,
  image = null,
}: RunChatParams): Promise<RunChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const client = getClient(apiKey);
  const toolMap = new Map(tools.map((t) => [t.declaration.name, t]));
  const toolsConfig: Tool[] | undefined =
    tools.length > 0
      ? [{ functionDeclarations: tools.map((t) => t.declaration) }]
      : undefined;

  const instruction = context.landSummary
    ? `${systemInstruction}\n\nInfo lahan aktif pengguna:\n${context.landSummary}`
    : systemInstruction;

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
    // prose ("Decision: Call default_api:*") that is not for the user.
    // Its turnText is deliberately discarded too (no answer yet).

    // Execute tool calls, then feed responses back to the model.
    const functionResponses: FunctionResponse[] = [];
    for (const call of callParts) {
      const tool = toolMap.get(call.name ?? "");
      let payload: unknown = null;
      if (tool) {
        try {
          payload = await tool.execute(call.args ?? {}, supabase);
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