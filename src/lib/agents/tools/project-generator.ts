import { FunctionTool } from "@google/adk";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";

/**
 * Project generator (project-based-refactor plan T-008): the Project Creator
 * agent analyzes the user's message + land and calls `generate_project` with
 * the crop and a suggested name; this tool returns the complete project
 * skeleton — one-time tasks (no due_date yet, computed later by the One-Time
 * Task Generator) and recurring templates with sensible default intervals.
 * Deterministic so the result is always structurally valid.
 */

/**
 * ADK FunctionTool (ADK-orchestrator refactor). No injected state needed.
 */
export const generateProjectTool = new FunctionTool({
  name: "generate_project",
  description:
    "Buat kerangka proyek tanam baru: satu proyek untuk satu lahan. Masukkan komoditas utama (crop), nama proyek, dan deskripsi. Tool menghasilkan tugas satu kali (olah_lahan, semai, tanam, panen) dan template tugas rutin (penyiraman, pemupukan, perawatan, pestisida) dengan interval bawaan.",
  parameters: z.object({
    crop: z.string().describe("Nama komoditas utama proyek, mis. 'cabai'."),
    project_name: z.string().describe("Nama proyek yang diusulkan, mis. 'Cabai Rawit Pekarangan'."),
    description: z
      .string()
      .describe("Deskripsi singkat proyek (tujuan tanam, kondisi lahan)."),
    land_summary: z
      .string()
      .optional()
      .describe("Ringkasan kondisi lahan aktif pengguna (opsional)."),
    existing_projects: z
      .array(z.string())
      .optional()
      .describe("Nama proyek yang sudah dimiliki pengguna, agar tidak duplikat."),
  }),
  execute: (args) => generate_project_executor(args),
});

export const generate_project_declaration: FunctionDeclaration = {
  name: "generate_project",
  description:
    "Buat kerangka proyek tanam baru: satu proyek untuk satu lahan. Masukkan komoditas utama (crop), nama proyek, dan deskripsi. Tool menghasilkan tugas satu kali (olah_lahan, semai, tanam, panen) dan template tugas rutin (penyiraman, pemupukan, perawatan, pestisida) dengan interval bawaan.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      crop: { type: Type.STRING, description: "Nama komoditas utama proyek, mis. 'cabai'." },
      project_name: {
        type: Type.STRING,
        description: "Nama proyek yang diusulkan, mis. 'Cabai Rawit Pekarangan'.",
      },
      description: {
        type: Type.STRING,
        description: "Deskripsi singkat proyek (tujuan tanam, kondisi lahan).",
      },
      land_summary: {
        type: Type.STRING,
        description: "Ringkasan kondisi lahan aktif pengguna (opsional).",
      },
      existing_projects: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Nama proyek yang sudah dimiliki pengguna, agar tidak duplikat.",
      },
    },
    required: ["crop", "project_name", "description"],
  },
};

export type OneTimeTaskPhase = "olah_lahan" | "semai" | "tanam" | "panen";

export interface GeneratedOneTimeTask {
  title: string;
  description: string;
  phase: OneTimeTaskPhase;
  position: number;
}

export type RecurringCategory = "penyiraman" | "pemupukan" | "perawatan" | "pestisida";

export interface GeneratedRecurringTemplate {
  title: string;
  description: string;
  category: RecurringCategory;
  interval_days: number;
  time_of_day: string;
}

export interface GeneratedProject {
  name: string;
  description: string;
  one_time_tasks: GeneratedOneTimeTask[];
  recurring_templates: GeneratedRecurringTemplate[];
}

/** One-time phases only (recurring care tasks live in templates, T-008). */
const ONE_TIME_PHASES: { phase: OneTimeTaskPhase; title: string; description: string }[] = [
  { phase: "olah_lahan", title: "Olah Lahan", description: "Persiapan lahan" },
  { phase: "semai", title: "Semai Bibit", description: "Penyemaian bibit" },
  { phase: "tanam", title: "Tanam Bibit", description: "Penanaman bibit" },
  { phase: "panen", title: "Panen", description: "Panen hasil" },
];

/** Default interval per recurring category (plan T-010). */
const RECURRING_DEFAULTS: {
  category: RecurringCategory;
  interval_days: number;
  time_of_day: string;
  title: string;
  description: string;
}[] = [
  {
    category: "penyiraman",
    interval_days: 1,
    time_of_day: "pagi",
    title: "Penyiraman",
    description: "Siram tanaman secara rutin",
  },
  {
    category: "pemupukan",
    interval_days: 7,
    time_of_day: "pagi",
    title: "Pemupukan",
    description: "Pemberian pupuk sesuai fase tanam",
  },
  {
    category: "perawatan",
    interval_days: 14,
    time_of_day: "sore",
    title: "Perawatan",
    description: "Perawatan rutin (pemangkasan, penyiangan, dll.)",
  },
  {
    category: "pestisida",
    interval_days: 14,
    time_of_day: "sore",
    title: "Pemeriksaan Hama",
    description: "Pemeriksaan dan pengendalian hama",
  },
];

export function generate_project_executor(args: {
  crop: string;
  project_name: string;
  description: string;
  land_summary?: string;
  existing_projects?: string[];
}): GeneratedProject {
  const crop = args.crop.trim() || "Tanaman";

  const one_time_tasks: GeneratedOneTimeTask[] = ONE_TIME_PHASES.map((p, index) => ({
    title: `${p.title} ${crop}`,
    description: `${p.description} ${crop} sesuai rencana proyek.`,
    phase: p.phase,
    position: index,
  }));

  const recurring_templates: GeneratedRecurringTemplate[] = RECURRING_DEFAULTS.map((t) => ({
    title: `${t.title} ${crop}`,
    description: `${t.description} ${crop}.`,
    category: t.category,
    interval_days: t.interval_days,
    time_of_day: t.time_of_day,
  }));

  return {
    name: args.project_name.trim() || `Proyek ${crop}`,
    description: args.description.trim(),
    one_time_tasks,
    recurring_templates,
  };
}