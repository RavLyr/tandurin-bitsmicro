---
# F-05: Task Generator

| Field | Value |
|-------|-------|
| ID | F-05 |
| Name | Task Generator (plan → tasks with deadlines) |
| Priority (MoSCoW) | Must |
| Depends on | F-03 |
| Status | Draft |

## 1. Business Description

F-05 converts an agreed crop plan into an actionable care schedule. After the user confirms the plan in chat (F-03 `plan_confirmed`), the Task Planner Agent decomposes the confirmed plan into a structured, ordered list of tasks with deadlines, persists them to Supabase, and syncs them to the Kanban board (F-06).

This is the payoff step of the consultation: the user stops being told *what* to plant and starts being told *what to do today*. Every confirmed plan must produce a minimum viable schedule (≥5 tasks) with agronomically sensible timing, so the user can track progress on the Kanban dashboard.

## 2. User Stories

- As a user, I want my confirmed plan to become a concrete task list, so I know exactly what to do each day.
- As a user, I want tasks ordered by agronomy phases (soil prep → sowing → planting → watering → fertilizing → care → harvest), so steps are not jumbled.
- As a user, I want realistic deadlines based on the crop growth cycle, so I do not water, fertilize, or harvest at the wrong time.
- As a user, I want tasks to appear on my Kanban board automatically, so I can manage my schedule without re-typing anything.
- As a user, I want the chat to confirm the generated schedule, so I know generation succeeded.

## 3. Acceptance Criteria

1. A user message confirming the plan (`messages.metadata` `{ type: 'plan_confirmed' }`) triggers generation; the agent replies "Oke, saya buatkan jadwalnya sekarang..." before generating.
2. The Task Generator Tool runs as Gemini function call `generate_tasks`, with input = confirmed plan summary (crop names, `land_id`, planting window, experience level).
3. The tool returns a JSON array of tasks; each task has `title`, `description`, `due_date`, `phase`, `position`.
4. Every generated plan contains ≥5 tasks.
5. Task phases follow agronomy sequence: olah_lahan → semai → tanam → penyiraman → pemupukan → perawatan → panen.
6. Deadlines are spaced per crop growth cycle (default example: day 0 olah lahan, day 1–2 semai, day 7 tanam, then weekly perawatan, panen at the harvest estimate).
7. No due date is in the past: if `due_date < today` (Asia/Jakarta), it is clamped to today.
8. Generation is idempotent: if tasks already exist for the conversation, the tool returns the existing tasks and no duplicate insert happens.
9. Tasks are batch-inserted to the `tasks` table via supabase-js server-side (service role), then a realtime update is pushed (F-06 subscribes).
10. After insert, an assistant message lists generated tasks (title + due date) and says "Cek papan Kanban di dashboard untuk mengelola jadwalmu".

## 4. Data Requirements

`tasks` table schema:

| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK profiles |
| land_id | uuid | FK lands, nullable |
| conversation_id | uuid | FK conversations, nullable |
| title | text | NOT NULL (Indonesian) |
| description | text | nullable |
| status | text | CHECK in ('belum_dikerjakan','sedang_dikerjakan','selesai'), default 'belum_dikerjakan' |
| due_date | date | NOT NULL |
| position | int | NOT NULL (ordering within status) |
| phase | text | nullable ('olah_lahan','semai','tanam','pemupukan','penyiraman','panen','perawatan') |
| crop | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Tool input JSON (example): `{ "crops": ["kangkung"], "land_id": "...", "planting_window": "2026-08-08", "experience": "beginner" }`.

Tool output JSON (example): `[ { "title": "Olah lahan", "description": "Gemburkan tanah...", "due_date": "2026-08-08", "phase": "olah_lahan", "position": 1 }, ... ]`.

## 5. Integration

- Chat flow: F-02 → F-03 (`plan_confirmed`) → F-05 → F-06.
- Agent: Orchestrator → Task Planner Agent → Task Generator Tool (Gemini function call `generate_tasks`, via `@google/genai`).
- Persistence: supabase-js server-side (service role) batch insert into `tasks`; realtime broadcast for F-06 clients.
- Idempotency check: query `tasks` by `conversation_id` before insert; skip generation if rows exist.
- RLS: user can only see/update own tasks (`user_id`); server writes via service role.

## 6. Technical Constraints

- Gemini AI Studio free tier; function calling must stay within chat response budget (PRD NFR-01, ≤15s for multi-tool flows).
- All due dates in Asia/Jakarta timezone (PRD §8).
- Title/UI text in Indonesian; code/comments in English.
- Supabase is single source of truth; Kanban (F-06) reads via realtime, never via separate writes.
- No cron/reminder logic here — F-09 consumes `tasks.due_date` later.

## 7. Edge Cases & Error Handling

1. Plan lacks crop data → do not generate; ask user to confirm crop first.
2. Batch insert partial failure → rollback/retry; report count inserted to user.
3. Duplicate detection (`conversation_id` already has tasks) → return existing tasks instead of regenerating.
4. Due date in past (short crop cycle, late confirmation) → clamp to today.
5. Planting window missing → default from conversation context or today +1; state assumption in chat.
6. Land deleted/missing `land_id` → generate with `land_id` null; tasks still attached to conversation.

## 8. Definition of Done

- [ ] ≥5 tasks generated per confirmed plan.
- [ ] Deadlines agronomically sensible (phase order + growth-cycle spacing).
- [ ] Idempotent per conversation — no duplicate generation on repeat trigger.
- [ ] Tasks inserted to Supabase `tasks` table (service role) with RLS intact.
- [ ] Summary message with tasks listed (title + due date) + "Cek papan Kanban..." sent in chat.
- [ ] Tasks visible on Kanban board (F-06) via realtime.

## 9. References

- PRD §6 (feature map), §9 (glossary: Task Planner Agent, Task, Kanban, Realtime).
- `docs/features/F-03-rekomendasi-komoditas.md` — `plan_confirmed` trigger and plan structure.
- `docs/features/F-06-kanban-dashboard.md` — realtime consumption of `tasks`.
- `docs/DECISION.md` — ADR-01 (ADK pattern via Gemini SDK), timezone decision.
