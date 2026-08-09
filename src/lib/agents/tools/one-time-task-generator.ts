import { FunctionTool } from "@google/adk";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { OneTimeTaskPhase } from "./project-generator";

/**
 * One-Time Task generator (project-based-refactor plan T-009): converts a
 * confirmed project plan into one-time tasks WITH due dates, using only the
 * one-time phases (olah_lahan → semai → tanam → panen). No LLM call — dates
 * are computed in Asia/Jakarta so the result is always valid.
 */

/**
 * ADK FunctionTool (ADK-orchestrator refactor). No injected state needed.
 */
export const generateOneTimeTasksTool = new FunctionTool({
  name: "generate_one_time_tasks",
  description:
    "Buatkan tugas satu kali (olah_lahan, semai, tanam, panen) dengan tanggal jatuh tempo untuk proyek yang sudah dikonfirmasi. Urutan fase: olah_lahan → semai → tanam → panen.",
  parameters: z.object({
    project_summary: z
      .object({
        crops: z.array(z.string()).describe("Nama komoditas yang ditanam dalam proyek."),
        planting_window: z
          .string()
          .describe("Jendela tanam, mis. '2 minggu lagi' atau tanggal mulai."),
        experience: z
          .string()
          .describe("Tingkat pengalaman petani: beginner/experienced/professional."),
      })
      .describe("Ringkasan proyek yang sudah dikonfirmasi pengguna."),
  }),
  execute: (args) => generate_one_time_tasks_executor(args),
});

export const generate_one_time_tasks_declaration: FunctionDeclaration = {
  name: "generate_one_time_tasks",
  description:
    "Buatkan tugas satu kali (olah_lahan, semai, tanam, panen) dengan tanggal jatuh tempo untuk proyek yang sudah dikonfirmasi. Urutan fase: olah_lahan → semai → tanam → panen.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      project_summary: {
        type: Type.OBJECT,
        description: "Ringkasan proyek yang sudah dikonfirmasi pengguna.",
        properties: {
          crops: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Nama komoditas yang ditanam dalam proyek.",
          },
          planting_window: {
            type: Type.STRING,
            description: "Jendela tanam, mis. '2 minggu lagi' atau tanggal mulai.",
          },
          experience: {
            type: Type.STRING,
            description: "Tingkat pengalaman pengguna: beginner/experienced/professional.",
          },
        },
        required: ["crops", "planting_window", "experience"],
      },
    },
    required: ["project_summary"],
  },
};

export interface GeneratedOneTimeTaskWithDue {
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  phase: OneTimeTaskPhase;
  position: number;
}

const PHASES: { phase: OneTimeTaskPhase; title: string }[] = [
  { phase: "olah_lahan", title: "Olah Lahan" },
  { phase: "semai", title: "Semai Bibit" },
  { phase: "tanam", title: "Tanam Bibit" },
  { phase: "panen", title: "Panen" },
];

/** Days offset per one-time phase, indexed by position within its phase. */
const PHASE_OFFSETS: Record<OneTimeTaskPhase, number[]> = {
  olah_lahan: [0],
  semai: [2],
  tanam: [7],
  panen: [60],
};

/** Today's date (YYYY-MM-DD) in Asia/Jakarta, clamped to UTC-safe bounds. */
function todayJakarta(): Date {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generate_one_time_tasks_executor(args: {
  project_summary: {
    crops: string[];
    planting_window: string;
    experience: string;
  };
}): GeneratedOneTimeTaskWithDue[] {
  const { crops } = args.project_summary;
  const crop = crops[0] ?? "Tanaman";
  const base = todayJakarta();
  const tasks: GeneratedOneTimeTaskWithDue[] = [];
  let position = 0;

  PHASES.forEach(({ phase, title }) => {
    const offsets = PHASE_OFFSETS[phase];
    offsets.forEach((offset, index) => {
      const due = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
      tasks.push({
        title: `${title} ${crop}${index > 0 ? ` (tahap ${index + 1})` : ""}`,
        description: `Jadwal ${title.toLowerCase()} untuk ${crop} sesuai rencana proyek.`,
        due_date: toDateKey(due),
        phase,
        position,
      });
      position += 1;
    });
  });

  return tasks;
}