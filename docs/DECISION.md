# DECISION — Tanduri Architecture Decision Records

This document captures key technical decisions, their context, options, chosen approach, rationale, and consequences. ADRs are numbered sequentially.

| Status | Meaning |
|--------|---------|
| **Accepted** | Decision final, used in build |
| **Proposed** | Suggested but pending implementation feedback |
| **Open** | Needs verification during build |

---

## ADR-01: ADK Implementation Strategy

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposal specifies Google Agent Development Kit (ADK) for multi-agent orchestration. ADK was originally Python-only, but `@google/adk` (TypeScript) is now GA, so ADK runs natively inside the Node.js/TypeScript stack. Vercel (free tier) supports Node.js/TypeScript only. Team chose single deployment on Vercel for simplicity and 3-day deadline. |
| Options | A) Python FastAPI + ADK service deployed separately on Render; Next.js on Vercel — 2 deployments, CORS, Render sleep delay. B) Official `@google/adk` (TypeScript) for agent/tool definitions + `@google/genai` SDK for stateless serverless execution in Next.js API routes — one deployment, no Python needed. |
| Decision | **Option B+** — `@google/adk` definitions + `@google/genai` execution adapter |
| Rationale | Official ADK framework provides a type-safe `LlmAgent` hierarchy and `FunctionTool` with Zod schema validation; the serverless execution adapter keeps Vercel compatibility because `InMemoryRunner` state does not persist across requests. |
| Consequences | Uses `@google/adk` for structure (`LlmAgent`, `FunctionTool`, subAgents) and `@google/genai` for execution. The manual function-calling loop is replaced by the adapter in `src/lib/agents/core/runner.ts`. Same API contract, tool names, and system prompts as before — only the framework wrapper changes. |

## ADR-02: Google Search Integration

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposal requires Agentic Search Tool for real-time agronomic references. Two free options: Google Custom Search API (JSON API, 100 queries/day free, needs API key + CX) or Gemini's built-in `google_search` grounding tool (no extra key, server-side, included in Gemini API free tier). |
| Options | A) Custom Search API. B) Gemini `google_search` grounding tool. |
| Decision | **Option B** — Gemini `google_search` grounding |
| Rationale | Zero additional API key or cost, native Gemini integration, sufficient for agriculture reference queries. Custom Search API adds complexity (key, CX ID) with lower query limit. |
| Consequences | Grounding only works within Gemini model call; cannot separate search from LLM (acceptable: agent calls search as a tool during reasoning). Search quality identical to Google Search. |

## ADR-03: Email Provider

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | F-09 requires email reminders for task deadlines. Free tier options: Resend (100 emails/day, 3000/month, needs domain verification or sandbox), Nodemailer + SMTP (e.g., Gmail SMTP, low volume, less reliable). |
| Options | A) Resend. B) Nodemailer + custom SMTP. |
| Decision | **Option A** — Resend |
| Rationale | Simple REST API, generous free tier, built-in deliverability. Sandbox mode allows testing with team emails without custom domain. |
| Consequences | Demo emails limited to verified recipients unless domain is configured. Must set `RESEND_API_KEY` env var. Fallback: if email fails, log to `notification_logs` with status=send_error. |

## ADR-04: Cron Scheduler for Email Reminders

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | F-09 needs daily cron at 07:00 Asia/Jakarta (00:00 UTC). Vercel Hobby plan supports cron jobs: 100 jobs/project, **once per day minimum interval**, per-hour precision (±59 min). Also possible: GitHub Actions scheduled workflow, Supabase pg_cron + Edge Function. |
| Options | A) Vercel Cron (Hobby limit: once-per-day, ±59 min precision — acceptable for daily reminder). B) GitHub Actions cron workflow (free, any interval, but requires repo push to update). C) Supabase pg_cron + Edge Function (free, but needs paid add-on for pg_cron? pg_cron available in all Supabase tiers). |
| Decision | **Option A** — Vercel Cron, with Option C documented as fallback |
| Rationale | Vercel Cron integrates directly with the application (same deployment, no external dependency), 100 jobs free enough for 1 job. The ±59 min precision is acceptable for a daily reminder (user sees "Siang" vs "Pagi"). Once-per-day limit matches our requirement (one run at 00:00 UTC = 07:00 WIB). |
| Consequences | If more granular scheduling needed in future (e.g., multiple reminder times per day), migrate to pg_cron (already running in Supabase) or GitHub Actions. Vercel cron currently runs at UTC 00:00 — will trigger email between 00:00–00:59 UTC (07:00–07:59 WIB) — acceptable. Cron job costs are included in free plan (no additional function invocation charges). |

## ADR-05: Realtime Kanban Sync

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposal requires real-time task board updates without page refresh. |
| Options | A) Supabase Realtime (subscription to PostgreSQL changes; free tier, public channels with RLS filtering). B) Server-Sent Events / WebSocket from custom server (Vercel functions don't support persistent connections well). C) Polling every N seconds. |
| Decision | **Option A** — Supabase Realtime |
| Rationale | Native Supabase feature, zero-ops, free tier includes realtime (up to 200 concurrent connections on free), RLS-integrated, works with Vercel serverless. |
| Consequences | Falls back to polling (30s interval) if WebSocket connection drops. Realtime must be enabled on `tasks` table via Supabase dashboard or SQL (create publication). |

## ADR-06: Authentication Provider

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposal: "Registrasi & Autentikasi menggunakan Supabase Auth." Options: Supabase Auth (email + Google OAuth), NextAuth.js/Auth.js, Clerk, Lucia. |
| Decision | **Supabase Auth** — email/password + Google OAuth |
| Rationale | Matches proposal, integrated with Supabase ecosystem (RLS, session management via `@supabase/ssr`), free tier, simplest for this stack. |
| Consequences | Session managed via cookies (SSR); middleware protects routes; profile auto-created via DB trigger. |

## ADR-07: Weather Data Provider

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposal calls for Weather API for real-time climate data per user location. |
| Options | A) OpenWeatherMap (free tier: 1000 calls/day, current weather + forecasts, simple API). B) WeatherAPI.com (free tier: 1M calls/month, also includes astronomy data). |
| Decision | **Option A** — OpenWeatherMap |
| Rationale | Sufficient for current-weather queries (temp, humidity, description), 1000/day easily covers demo usage. Standard REST API, no SDK needed. |
| Consequences | Cache weather data per (lat,lon) for 30 minutes to stay under limit during testing. |

## ADR-08: Photo Storage for Diagnosis

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | F-04 requires storing user-uploaded plant photos before passing to Gemini multimodal. Options: Supabase Storage, Vercel Blob (free tier limited), local filesystem (not possible on serverless). |
| Decision | **Supabase Storage** — bucket `plant-images` (private, RLS) |
| Rationale | Already using Supabase, free tier includes 1 GB storage, RLS policies enforce per-user isolation, signed URLs for server-side access by Gemini. |
| Consequences | Images must be fetched server-side (not passed as public URL) due to private bucket. Avatars use separate public-read bucket `avatars` for direct browser display. |

## ADR-09: LLM Model

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposa uses Gemini model via Google ADK. Which version balances quality vs latency (NFR-01: ≤8s single chat)? |
| Options | A) Gemini 2.5 Flash (fast, multimodal, free tier, latest capabilities). B) Gemini 2.5 Pro (higher quality but slower and more expensive). C) Gemini 2.0 Flash (older, faster but less capable). |
| Decision | **Option A** — Gemini 2.5 Flash |
| Rationale | Best balance: multimodal (vision), function calling, speed (typical 3–6s), free tier support. 2.5 Flash handles agriculture knowledge well via LLM internal knowledge + search grounding. |
| Consequences | Model name configurable via `GEMINI_MODEL` env var (default `gemini-2.5-flash`). If latency exceeds 8s, consider reducing history window or simplifying agent hierarchy. |

## ADR-10: Database Schema

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Seven tables from feature specs: profiles, lands, conversations, messages, tasks, task_comments, notification_logs, plus utility table weather_cache. |
| Decision | **All tables in single Supabase Postgres database** with RLS, as documented in DESIGN.md §6. |
| Rationale | Single data source simplifies development and ensures referential integrity. Supabase free tier (500 MB) sufficient for demo data. |
| Consequences | Enable Realtime publication for `tasks` table only (other tables don't need realtime). Full DDL in DESIGN.md and migration files. |

## ADR-11: Task Status State Machine

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | F-06 Kanban columns need status values. Proposal mentions "menggeser kartu antar kolom." |
| Options | A) Three statuses: `belum_dikerjakan` → `sedang_dikerjakan` → `selesai` (forward-only, no re-open). B) Same three but allow reverse move. C) Add `dibatalkan` (cancelled). |
| Decision | **Option A** — three forward statuses, with manual override for drag-back (user may drag back from "Sedang Dikerjakan" to "Belum Dikerjakan" — status update respects any order, no hard restriction). |
| Rationale | Simple, covers the workflow. Drag-back is permitted because the UI allows it (no server-enforced sequential check). |
| Consequences | No "cancelled" status in this build; user can delete tasks instead. |

## ADR-12: Timezone

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Task deadlines and email reminders need a timezone. Indonesia has multiple timezones (WIB/WITA/WIT). Proposal is for Indonesia. |
| Options | A) Fixed Asia/Jakarta (WIB, UTC+7). B) Per-user timezone (add field to profiles). C) Detect via browser. |
| Decision | **Option A** — Fixed Asia/Jakarta |
| Rationale | Simplifies cron scheduling and deadline logic. Team and initial target users are in WIB zone. Per-user timezone can be added later (F-10 has reminder_hour already). |
| Consequences | Users outside WIB experience reminder off by ±1 hour. Acceptable for demo. If needed, add `timezone` varchar to profiles later. |

## ADR-13: Language Strategy

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Proposal written in Indonesian. Team and target audience are Indonesian. |
| Options | A) UI Indonesia, docs English, code identifiers English. B) Everything Indonesian. C) Everything English. |
| Decision | **Option A** — UI Indonesian; documentation and code identifiers in English |
| Rationale | User-facing text must match proposal language (Indonesian). Technical documentation and code follow standard software practice (English) for broader accessibility. |
| Consequences | UI string constants centralized (Indonesian). Code comments in English. API responses (error messages) in Indonesian for user-facing errors; English for server logs. |

## ADR-14: Repository & Document Structure

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Need a clear repo layout for AI agent handsoff development. |
| Options | A) Flat: all docs in root. B) Organized: `docs/PRD.md`, `docs/features/*.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/TASK.md`, `docs/DECISION.md`. |
| Decision | **Option B** — structured docs directory |
| Rationale | Per-feature specs (`docs/features/F-*.md`) serve as contracts referenced by TASK.md. Clear separation of concerns. Scales for future features. |
| Consequences | AI agents must be instructed to look in `docs/` and `docs/features/` for spec files. Cross-references use F-ID format. |

## ADR-15: Demo Fallback Strategy

| Field | Value |
|-------|-------|
| Status | **Proposed** |
| Context | 3-day deadline with free-tier dependencies. If any API key (Gemini, OpenWeatherMap, Resend) is not activated or rate-limited, demo must still show the UI and flow. |
| Options | A) Hard failure — show error messages. B) Mock mode — if env var `NEXT_PUBLIC_DEMO_MODE=true`, use canned responses (pre-authored recommendation JSON, task samples, hardcoded weather) to demonstrate UI without live API calls. |
| Decision | **Option B** — mock mode as fallback |
| Rationale | Demo must show the full user journey regardless of API availability. Mock responses let us demonstrate UI, agent flow, kanban, and email logging without real keys. Toggle via env var. |
| Consequences | Additional development time to build mock responses (~30 min). Must clearly indicate in UI that mock mode is active ("Mode Demo — Data simulasi"). Mock mode can also be used for automated testing. |

---

## ADR-16: Design System Source of Truth (Airtable)

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | Team needs a single, editable source for design values (tokens, components, pages) that both humans and AI agents can query and update; DESIGN.md alone is a static file. The team uses Airtable and the Airtable skill is available. |
| Options | A) DESIGN.md as the only source. B) Airtable base `Tanduri Design System` (tables `Tokens`, `Components`, `Pages`) as operational source, DESIGN.md as mirror. C) JSON token file in repo (e.g. `tokens.json`) + generated CSS. |
| Decision | **Option B** — Airtable base as operational source of truth, DESIGN.md mirrors it |
| Rationale | Airtable is editable by non-coders (design handoff), queryable by agents via REST (skill), and supports linked records (Components → Tokens, Pages → Components). JSON token file (Option C) is a good future export target but lacks the team-editing workflow. |
| Consequences | Airtable and DESIGN.md can drift — mitigated by rule "Airtable wins, mirror back to DESIGN.md" (DESIGN.md §11.3). Setup requires a PAT + base (see `scripts/airtable/setup_design_base.sh`). Until the base exists, DESIGN.md §2 is authoritative. |

## ADR-17: UI/UX Source — Stitch Design Kit

| Field | Value |
|-------|-------|
| Status | **Accepted** |
| Context | UI tasks (T-005, T-101, T-204, T-304, T-402 UI, T-403 UI, T-404) need concrete design assets. The team will generate the UI/UX with Stitch before frontend work starts. |
| Options | A) Wait for Stitch-generated UI, then implement FE. B) Implement FE now from DESIGN.md tokens, replace later. |
| Decision | **Option A** — FE tasks wait for Stitch design (marked `⏳ BLOCKED: menunggu design Stitch (ADR-17)` in TASK.md); non-UI tasks (scaffold, Supabase, migrations, agent core, API routes, cron) proceed immediately |
| Rationale | Building FE twice wastes scarce time (3-day deadline). Backend/agent/API work has no design dependency and can proceed in parallel. Stitch output imports into Airtable `Pages.StitchRef` + `Components.Spec` (ADR-16), then mirrors into DESIGN.md §4 before FE starts. |
| Consequences | If Stitch assets are late, FE is the critical path — mitigate by preparing all FE task context (component inventory, strings, DnD behavior) now in DESIGN.md, so FE tasks are drop-in once designs land. Demo can still run API/agent flows via curl + mock mode (ADR-15) if needed. |

---

## Quick Reference

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-01 | Option B+ — @google/adk definitions + @google/genai execution adapter | Accepted |
| ADR-02 | Gemini `google_search` grounding | Accepted |
| ADR-03 | Resend for email | Accepted |
| ADR-04 | Vercel Cron (daily, per-hour precision) | Accepted |
| ADR-05 | Supabase Realtime | Accepted |
| ADR-06 | Supabase Auth | Accepted |
| ADR-07 | OpenWeatherMap | Accepted |
| ADR-08 | Supabase Storage (private for plant-images, public for avatars) | Accepted |
| ADR-09 | Gemini 2.5 Flash | Accepted |
| ADR-10 | Single DB with 7 tables + RLS | Accepted |
| ADR-11 | Three statuses, no hard order enforcement | Accepted |
| ADR-12 | Fixed Asia/Jakarta timezone | Accepted |
| ADR-13 | UI Indonesian, docs English | Accepted |
| ADR-14 | Structured docs directory | Accepted |
| ADR-15 | Mock mode fallback for demo | Proposed |
| ADR-16 | Airtable base as design system source of truth | Accepted |
| ADR-17 | FE tasks wait for Stitch UI kit | Accepted |

See also: `docs/PRD.md` §9 Glossary, `docs/ARCHITECTURE.md` for system-level decisions.
