import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";

/**
 * Service-role client for project writes/reads (server-only env vars).
 * Never import this into client components (AGENTS.md hard rule).
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PROJECT_SELECT =
  "id, user_id, land_id, name, description, status, created_at, updated_at";

/** Soft cap on projects per land (plan T-007). */
const MAX_PROJECTS_PER_LAND = 10;

const projectFields = {
  name: z
    .string()
    .trim()
    .min(1, { message: STRINGS.projects.nameRequired })
    .max(100, { message: STRINGS.projects.nameTooLong }),
  description: z
    .string()
    .trim()
    .max(500, { message: STRINGS.projects.invalidValue })
    .optional(),
  status: z
    .enum(["active", "archived"], { message: STRINGS.projects.invalidValue })
    .optional(),
} satisfies Record<string, z.ZodType>;

/** POST body (create; land_id + name required). */
export const projectCreateSchema = z.object({
  land_id: z.string().uuid({ message: STRINGS.projects.landRequired }),
  name: projectFields.name,
  description: projectFields.description,
});

/** PATCH body (partial update; requires at least one field). */
export const projectPatchSchema = z
  .object({
    name: projectFields.name.optional(),
    description: projectFields.description,
    status: projectFields.status,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: STRINGS.projects.invalidBody,
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

/**
 * GET /api/projects?land_id=&status= — list the user's projects, newest
 * first, optionally filtered by land and/or status.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: STRINGS.chat_errors.unauth }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const landId = searchParams.get("land_id");
  const status = searchParams.get("status");

  const service = createServiceClient();
  let query = service.from("projects").select(PROJECT_SELECT).eq("user_id", user.id);
  if (landId) query = query.eq("land_id", landId);
  if (status) query = query.eq("status", status);

  const { data: projects, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: STRINGS.projects.loadFailed }, { status: 500 });
  }

  return NextResponse.json({ projects });
}

/**
 * POST /api/projects — create a project scoped to one of the user's lands.
 * Rejects duplicate names on the same land (409) and enforces a soft cap of
 * 10 projects per land (422).
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
    return NextResponse.json({ error: STRINGS.projects.invalidBody }, { status: 422 });
  }

  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: zodErrors(parsed.error) }, { status: 422 });
  }
  const data = stripUndefined(parsed.data as unknown as Record<string, unknown>);

  const service = createServiceClient();

  // The land must belong to the user (ownership rule).
  const { data: land } = await service
    .from("lands")
    .select("id")
    .eq("id", data.land_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!land) {
    return NextResponse.json({ error: STRINGS.projects.landNotFound }, { status: 404 });
  }

  // Duplicate name on the same land → 409 (plan T-007).
  const { data: duplicate } = await service
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("land_id", data.land_id)
    .eq("name", data.name)
    .eq("status", "active")
    .maybeSingle();
  if (duplicate) {
    return NextResponse.json({ error: STRINGS.projects.duplicateName }, { status: 409 });
  }

  // Soft cap: 10 projects per land → 422 (plan T-007).
  const { count } = await service
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("land_id", data.land_id);
  if ((count ?? 0) >= MAX_PROJECTS_PER_LAND) {
    return NextResponse.json({ error: STRINGS.projects.tooManyProjects }, { status: 422 });
  }

  const { data: created, error } = await service
    .from("projects")
    .insert({ user_id: user.id, ...data })
    .select(PROJECT_SELECT)
    .single();

  if (error || !created) {
    return NextResponse.json({ error: STRINGS.projects.failed }, { status: 500 });
  }
  return NextResponse.json({ project: created }, { status: 201 });
}