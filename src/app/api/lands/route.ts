import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client for land writes/reads (server-only env vars).
 * Never import this into client components (AGENTS.md hard rule).
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type LandMedia = "soil" | "hydroponic" | "pot" | "other";
type LandWater = "plenty" | "limited";
type LandSunlight = "full" | "partial" | "shade";
type LandExperience = "beginner" | "experienced" | "professional";

/**
 * Shared field validation (F-07 AC-4..6) with Indonesian 422 messages.
 * Reused by PATCH /api/lands/[id] via `landPatchSchema`.
 */
const landFields = {
  name: z
    .string()
    .trim()
    .min(1, { message: STRINGS.lands.nameRequired })
    .max(60, { message: STRINGS.lands.nameTooLong }),
  location: z.string().trim().max(200, { message: STRINGS.lands.invalidValue }).optional(),
  latitude: z
    .number({ message: STRINGS.lands.invalidNumber })
    .min(-90, { message: STRINGS.lands.latRange })
    .max(90, { message: STRINGS.lands.latRange })
    .nullable()
    .optional(),
  longitude: z
    .number({ message: STRINGS.lands.invalidNumber })
    .min(-180, { message: STRINGS.lands.lonRange })
    .max(180, { message: STRINGS.lands.lonRange })
    .nullable()
    .optional(),
  area_m2: z
    .number({ message: STRINGS.lands.invalidNumber })
    .min(1, { message: STRINGS.lands.areaRange })
    .max(100000, { message: STRINGS.lands.areaRange })
    .nullable()
    .optional(),
  budget_idr: z
    .number({ message: STRINGS.lands.invalidNumber })
    .min(0, { message: STRINGS.lands.budgetRange })
    .max(1e12, { message: STRINGS.lands.budgetRange })
    .nullable()
    .optional(),
  media: z.enum(["soil", "hydroponic", "pot", "other"], { message: STRINGS.lands.invalidValue }).optional(),
  water: z.enum(["plenty", "limited"], { message: STRINGS.lands.invalidValue }).optional(),
  sunlight: z.enum(["full", "partial", "shade"], { message: STRINGS.lands.invalidValue }).optional(),
  experience: z
    .enum(["beginner", "experienced", "professional"], { message: STRINGS.lands.invalidValue })
    .optional(),
} satisfies Record<string, z.ZodType>;

type LandFields = {
  name: string;
  location?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  area_m2?: number | null | undefined;
  budget_idr?: number | null | undefined;
  media?: LandMedia | undefined;
  water?: LandWater | undefined;
  sunlight?: LandSunlight | undefined;
  experience?: LandExperience | undefined;
};

type LandCoordsFields = Pick<LandFields, "latitude" | "longitude">;

/** Latitude/longitude are both-or-neither (F-07 edge case 7). */
function coordsBoth(value: LandCoordsFields, ctx: z.RefinementCtx) {
  const hasLat = value.latitude != null;
  const hasLon = value.longitude != null;
  if (hasLat !== hasLon) {
    ctx.addIssue({
      code: "custom",
      path: hasLat ? ["longitude"] : ["latitude"],
      message: STRINGS.lands.coordsBoth,
    });
  }
}

const landBaseSchema = z.object(landFields);

/** POST body (create; name required, others default via DB column defaults). */
export const landCreateSchema = landBaseSchema.superRefine(coordsBoth);

/** PATCH body (partial update; requires at least one field). */
export const landPatchSchema = landBaseSchema
  .superRefine(coordsBoth)
  .refine((value) => Object.keys(value).length > 0, {
    message: STRINGS.lands.invalidBody,
  });

/** Drop `undefined` keys so supabase-js never serializes them into the body. */
function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) clean[key] = val;
  }
  return clean;
}

/** Flatten zod issues into a field-first error map for 422 responses. */
export function zodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "body";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Parse the JSON body; returns 400 when the request body is not JSON. */
async function readJson(request: NextRequest): Promise<{ ok: boolean; body: unknown }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, body: null };
  }
}

const LAND_SELECT =
  "id, user_id, name, location, latitude, longitude, area_m2, media, water, sunlight, budget_idr, experience, is_active, created_at, updated_at";

/**
 * GET /api/lands — list the user's lands, active first, with active-task
 * counts (tasks not marked 'selesai') and active-project counts.
 */
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: lands, error } = await service
    .from("lands")
    .select(LAND_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: STRINGS.lands.loadFailed }, { status: 500 });
  }

  const { data: tasks } = await service
    .from("tasks")
    .select("land_id")
    .eq("user_id", user.id)
    .neq("status", "selesai");

  const taskCounts: Record<string, number> = {};
  for (const task of tasks ?? []) {
    if (task.land_id) taskCounts[task.land_id] = (taskCounts[task.land_id] ?? 0) + 1;
  }

  // Legacy tasks (created before T-301 linked chat to a land) may have
  // land_id = null; attribute them to the active land so the land card count
  // matches the board's unfiltered "Semua Lahan" view.
  const activeLand = (lands ?? []).find((land) => land.is_active);
  const unassigned = (tasks ?? []).filter((task) => !task.land_id).length;
  if (activeLand && unassigned > 0) {
    taskCounts[activeLand.id] = (taskCounts[activeLand.id] ?? 0) + unassigned;
  }

  const { data: projects } = await service
    .from("projects")
    .select("land_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const projectCounts: Record<string, number> = {};
  for (const project of projects ?? []) {
    if (project.land_id) projectCounts[project.land_id] = (projectCounts[project.land_id] ?? 0) + 1;
  }

  const items = (lands ?? []).map((land) => ({
    ...land,
    task_count: taskCounts[land.id] ?? 0,
    project_count: projectCounts[land.id] ?? 0,
  }));
  items.sort((a, b) => Number(b.is_active) - Number(a.is_active));

  return NextResponse.json({ data: items });
}

/**
 * POST /api/lands — create a land. First land auto-activates (F-07 AC-1);
 * concurrency-safe against the partial unique index lands_single_active.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const { ok, body } = await readJson(request);
  if (!ok) {
    return NextResponse.json({ error: STRINGS.lands.invalidBody }, { status: 422 });
  }

  const parsed = landCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: zodErrors(parsed.error) }, { status: 422 });
  }
  const data = stripUndefined(parsed.data as unknown as Record<string, unknown>);

  const service = createServiceClient();
  const { data: existing } = await service
    .from("lands")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  // Concurrent first-land race: retry once without auto-activate if the
  // partial unique index lands_single_active rejects our insert.
  for (const isActive of [existing?.length === 0, false]) {
    const { data: created, error } = await service
      .from("lands")
      .insert({ user_id: user.id, ...data, is_active: isActive })
      .select(LAND_SELECT)
      .single();
    if (error) {
      if (error.code === "23505" && isActive) continue;
      return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
    }
    return NextResponse.json({ data: created }, { status: 201 });
  }

  return NextResponse.json({ error: STRINGS.lands.failed }, { status: 500 });
}