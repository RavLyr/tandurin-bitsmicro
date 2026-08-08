import { FunctionTool } from "@google/adk";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";

/**
 * Task generator (F-05, T-201 step 3): deterministic planner converting a
 * confirmed planting plan into a task list. No LLM call — dates are computed
 * in Asia/Jakarta so the result is always valid.
 */

/**
 * ADK FunctionTool (ADK-orchestrator refactor). No injected state needed.
 */
export const generateTasksTool = new FunctionTool({
  name: "generate_tasks",
  description:
    "Buatkan jadwal tugas tanam (≥5 tugas) dari rencana tanam yang sudah dikonfirmasi pengguna. Urutan fase: olah_lahan → semai → tanam → penyiraman → pemupukan → perawatan → panen.",
  parameters: z.object({
    confirmed_plan: z
      .object({
        crops: z.array(z.string()).describe("Nama komoditas yang akan ditanam."),
        planting_window: z
          .string()
          .describe("Jendela tanam, mis. '2 minggu lagi' atau tanggal mulai."),
        experience: z
          .string()
          .describe("Tingkat pengalaman petani: beginner/experienced/professional."),
        land_summary: z.string().optional().describe("Ringkasan kondisi lahan (opsional)."),
      })
      .describe("Rencana tanam yang sudah dikonfirmasi pengguna."),
  }),
  execute: (args) => generate_tasks_executor(args),
});

export const generate_tasks_declaration: FunctionDeclaration = {
  name: "generate_tasks",
  description:
    "Buatkan jadwal tugas tanam (≥5 tugas) dari rencana tanam yang sudah dikonfirmasi pengguna. Urutan fase: olah_lahan → semai → tanam → penyiraman → pemupukan → perawatan → panen.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed_plan: {
        type: Type.OBJECT,
        description: "Rencana tanam yang sudah dikonfirmasi pengguna.",
        properties: {
          crops: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Nama komoditas yang akan ditanam.",
          },
          planting_window: {
            type: Type.STRING,
            description: "Jendela tanam, mis. '2 minggu lagi' atau tanggal mulai.",
          },
          experience: {
            type: Type.STRING,
            description: "Tingkat pengalaman petani: beginner/experienced/professional.",
          },
          land_summary: {
            type: Type.STRING,
            description: "Ringkasan kondisi lahan (opsional).",
          },
        },
        required: ["crops", "planting_window", "experience"],
      },
    },
    required: ["confirmed_plan"],
  },
};

export type TaskPhase =
  | "olah_lahan"
  | "semai"
  | "tanam"
  | "penyiraman"
  | "pemupukan"
  | "perawatan"
  | "panen";

export interface GeneratedTask {
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  phase: TaskPhase;
  position: number;
}

const PHASES: TaskPhase[] = [
  "olah_lahan",
  "semai",
  "tanam",
  "penyiraman",
  "pemupukan",
  "perawatan",
  "panen",
];

const PHASE_TITLES: Record<TaskPhase, string> = {
  olah_lahan: "Olah Lahan",
  semai: "Semai Bibit",
  tanam: "Tanam Bibit",
  penyiraman: "Penyiraman",
  pemupukan: "Pemupukan",
  perawatan: "Perawatan",
  panen: "Panen",
};

/** Days offset per phase, indexed by position within its phase. */
const PHASE_OFFSETS: Record<TaskPhase, number[]> = {
  olah_lahan: [0],
  semai: [2],
  tanam: [7],
  penyiraman: [10, 14, 18, 22],
  pemupukan: [14, 28],
  perawatan: [21, 28],
  panen: [60],
};

/** Today's date (YYYY-MM-DD) in Asia/Jakarta, clamped to UTC-safe bounds. */
function todayJakarta(): Date {
  const now = new Date();
  // Jakarta is UTC+7; approximate by adding 7h to UTC date math for the date key.
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generate_tasks_executor(args: {
  confirmed_plan: {
    crops: string[];
    planting_window: string;
    experience: string;
    land_summary?: string;
  };
}): GeneratedTask[] {
  const { crops } = args.confirmed_plan;
  const crop = crops[0] ?? "Tanaman";
  const base = todayJakarta();
  const tasks: GeneratedTask[] = [];
  let position = 0;

  PHASES.forEach((phase) => {
    const offsets = PHASE_OFFSETS[phase];
    offsets.forEach((offset, index) => {
      const due = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
      tasks.push({
        title: `${PHASE_TITLES[phase]} ${crop}${index > 0 ? ` (tahap ${index + 1})` : ""}`,
        description: `Jadwal ${PHASE_TITLES[phase].toLowerCase()} untuk ${crop} sesuai rencana tanam.`,
        due_date: toDateKey(due),
        phase,
        position,
      });
      position += 1;
    });
  });

  return tasks;
}
