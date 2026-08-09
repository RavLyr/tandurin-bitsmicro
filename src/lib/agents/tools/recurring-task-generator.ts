import { FunctionTool } from "@google/adk";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { RecurringCategory } from "./project-generator";

/**
 * Recurring Task generator (project-based-refactor plan T-010): converts a
 * confirmed project plan into recurring task templates (penyiraman/
 * pemupukan/perawatan/pestisida) with sensible default intervals. No LLM
 * call — intervals are deterministic so the schedule is always valid.
 */

/**
 * ADK FunctionTool (ADK-orchestrator refactor). No injected state needed.
 */
export const generateRecurringTemplatesTool = new FunctionTool({
  name: "generate_recurring_templates",
  description:
    "Buatkan template tugas rutin berulang (penyiraman, pemupukan, perawatan, pestisida) untuk proyek yang sudah dikonfirmasi, dengan interval hari bawaan per kategori.",
  parameters: z.object({
    project_summary: z
      .object({
        crops: z.array(z.string()).describe("Nama komoditas yang ditanam dalam proyek."),
        recurring_categories: z
          .array(z.enum(["penyiraman", "pemupukan", "perawatan", "pestisida"]))
          .describe("Kategori tugas rutin yang diminta pengguna."),
      })
      .describe("Ringkasan proyek yang sudah dikonfirmasi pengguna."),
  }),
  execute: (args) => generate_recurring_templates_executor(args),
});

export const generate_recurring_templates_declaration: FunctionDeclaration = {
  name: "generate_recurring_templates",
  description:
    "Buatkan template tugas rutin berulang (pennyiraman, pemupukan, perawatan, pestisida) untuk proyek yang sudah dikonfirmasi, dengan interval default bawaan per kategori.",
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
          recurring_categories: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              enum: ["penyiraman", "pemupukan", "perawatan", "pestisida"],
            },
            description: "Kategori tugas rutin yang diminta pengguna.",
          },
        },
        required: ["crops", "recurring_categories"],
      },
    },
    required: ["project_summary"],
  },
};

export interface GeneratedRecurringTemplateWithDefaults {
  title: string;
  description: string;
  category: RecurringCategory;
  interval_days: number;
  time_of_day: string;
}

/** Default interval + time per recurring category (plan T-010). */
const CATEGORY_DEFAULTS: Record<
  RecurringCategory,
  { interval_days: number; time_of_day: string; title: string; description: string }
> = {
  penyiraman: {
    interval_days: 1,
    time_of_day: "pagi",
    title: "Penyiraman",
    description: "Siram tanaman secara rutin",
  },
  pemupukan: {
    interval_days: 7,
    time_of_day: "pagi",
    title: "Pemupukan",
    description: "Berikan pupuk sesuai jadwal",
  },
  perawatan: {
    interval_days: 14,
    time_of_day: "sore",
    title: "Perawatan",
    description: "Perawatan rutin tanaman",
  },
  pestisida: {
    interval_days: 14,
    time_of_day: "sore",
    title: "Pemeriksaan Hama",
    description: "Pemeriksaan dan pengendalian hama/penyakit",
  },
};

export function generate_recurring_templates_executor(args: {
  project_summary: {
    crops: string[];
    recurring_categories: RecurringCategory[];
  };
}): GeneratedRecurringTemplateWithDefaults[] {
  const { crops, recurring_categories } = args.project_summary;
  const crop = crops[0] ?? "Tanaman";
  const categories = recurring_categories.length > 0 ? recurring_categories : (Object.keys(
    CATEGORY_DEFAULTS
  ) as RecurringCategory[]);

  return categories.map((category) => {
    const defaults = CATEGORY_DEFAULTS[category];
    return {
      title: `${defaults.title} ${crop}`,
      description: `${defaults.description} ${crop}.`,
      category,
      interval_days: defaults.interval_days,
      time_of_day: defaults.time_of_day,
    };
  });
}