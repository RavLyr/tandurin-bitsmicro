import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";

/**
 * Web search tool (F-03, T-201 step 2) via Gemini `google_search` grounding —
 * no extra API key. Returns top results as { title, url, snippet }.
 */

export const search_declaration: FunctionDeclaration = {
  name: "search_references",
  description:
    "Cari referensi terbaru dari web untuk memperkuat rekomendasi (mis. harga pasar, hama musiman, praktik tanam). Kembalikan daftar sumber yang bisa dikutip.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Topik pencarian dalam Bahasa Indonesia atau istilah tanaman.",
      },
    },
    required: ["query"],
  },
};

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function search_executor(args: { query: string }): Promise<SearchResult[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!apiKey) return null;

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model,
      contents: args.query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction:
          "Jawab singkat. Kembalikan jawaban yang akurat berdasarkan hasil pencarian.",
      },
    });

    const candidate = response.candidates?.[0];
    const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const supports = candidate?.groundingMetadata?.groundingSupports ?? [];

    const results: SearchResult[] = chunks
      .filter((chunk) => chunk.web?.uri)
      .map((chunk, index) => {
        const support = supports.find((s) => (s.groundingChunkIndices ?? []).includes(index));
        return {
          title: chunk.web?.title ?? chunk.web?.uri ?? "",
          url: chunk.web?.uri ?? "",
          snippet: support?.segment?.text ?? "",
        };
      });

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}
