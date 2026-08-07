# AGENTS.md — Tanduri Development Rules

Rules for every AI agent (or developer) working on this repo. Read this file first, then `docs/TASK.md` §0, then the feature spec referenced by your task.

## Project

- **Product:** Tanduri — Personal Planting Assistant (Bitsmikro Innovative Vibecode 2026, Team Satria Firm Vibers, Universitas Diponegoro).
- **Stack:** Next.js 15 (App Router, `src/` dir, Tailwind), `@google/genai` (Gemini 2.5 Flash, ADK pattern), Supabase (Postgres/Auth/Storage/Realtime), Vercel, OpenWeatherMap, Resend. See `docs/ARCHITECTURE.md`.
- **Docs (source of truth, read before coding):**
  - `docs/PRD.md` — vision, features (F-01..F-10), NFR, glossary
  - `docs/features/F-*.md` — per-feature spec: acceptance criteria, data, integration (the contract)
  - `docs/DESIGN.md` — UI/UX, tokens, page designs, data model (SQL DDL)
  - `docs/ARCHITECTURE.md` — system design, agent hierarchy, deployment
  - `docs/TASK.md` — executable task list (checklist). This file is the operative work plan.
  - `docs/DECISION.md` — ADR-01..17 (why things are built this way)

## Workflow (mandatory, every task)

1. **Pick a task** `T-XXX` from `docs/TASK.md`. Never start a task whose dependencies (graph §8) are incomplete.
2. **Read before coding:** the task block + the feature spec(s) it references + relevant DESIGN/ARCHITECTURE sections. If anything is ambiguous, re-read; do not invent behavior the specs don't state.
3. **Implement.** Touch only files listed in the task's **Files:** line. Add a `ponytail:` comment where you deliberately simplify, naming the ceiling and upgrade path.
4. **Run the gate — all three, in order.** Collect error logs and fix until green:
   - `pnpm exec tsc --noEmit` (typecheck)
   - `pnpm exec eslint .` (lint)
   - `pnpm build` (production build — also verifies server compilation)
   The gate failing is a red task. Do not proceed, do not mark done.
5. **Verify behavior** per the task's **Verification:** line (manual or `curl`). Log what you observe.
6. **Update the checklist:** in `docs/TASK.md`, flip `- [ ]` → `- [x]` **only after** steps 4–5 pass. Never mark `[x]` before the gate is green.
7. **Report** (concise): task ID, files touched, gate results (exit codes + any errors fixed), verification evidence, status `[x]`.

## Report format for gate errors

```
T-XXX gate FAILED
- tsc --noEmit: exit <code> — <first error line + file:line>
- eslint .: exit <code> — <rule, file:line>
- build: exit <code> — <first error line>
- fix applied: <what changed>
- gate re-run: PASS (all three)
```

## Hard rules

- **TASK.md is a checklist:** `- [ ]` = not done, `- [x]` = done + gate green. Update it in the same commit/session as the work.
- **UI tasks are BLOCKED on Stitch design** (ADR-17): tasks marked `⏳ BLOCKED: menunggu design Stitch` must not start until design assets exist. Work non-UI tasks first. If you are an agent picking up a BLOCKED task, report blocked and stop.
- **No secrets in client code:** `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET` are server-only env vars. Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEMO_MODE` may be client-visible. Never log keys.
- **Writes go through server routes** with service role; client uses anon key + RLS only. No direct service-role usage in client components.
- **RLS is mandatory** on every table (see DESIGN §6). New table → new RLS policies in the same migration.
- **Language:** code identifiers/comments English; UI strings Indonesian, centralized in `src/lib/i18n.ts` (never hardcode Indonesian strings inline).
- **Timezone:** all deadline/reminder math in `Asia/Jakarta`.
- **No new dependencies** unless the task explicitly lists them (lazy senior rule: stdlib/native first, YAGNI, no boilerplate).
- **Do not commit** unless explicitly asked.
- **Do not modify** files outside your task's **Files:** line (docs edits only via their own task).

## Design system (Airtable)

- `docs/DESIGN.md` §2 tokens and §11 Airtable design system are authoritative for UI values.
- Airtable base `Tanduri Design System` (tables: `Tokens`, `Components`, `Pages`) is the operational source of truth for design values; DESIGN.md mirrors it.
- When a task needs a token/component not yet defined: check Airtable `Tokens`/`Components` first; if missing, note it in the report (do not invent colors/radii ad hoc).

## Dependencies & order recap (see TASK.md §8 for full graph)

Non-UI path (start now): T-000 → T-001 → T-002 → T-003 → T-004 → T-102 → T-201 → T-202 → T-203 → T-301 → T-302 → T-303 → T-401 → T-405 → T-406 → T-501 → T-503 → T-504.
UI path (after Stitch design): T-005 → T-101 → T-204 → T-304 → T-402 (UI part) → T-403 (UI part) → T-404.
