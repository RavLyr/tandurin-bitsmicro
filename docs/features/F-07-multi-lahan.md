---
# F-07: Multi-Land Profiles

| Field | Value |
|-------|-------|
| ID | F-07 |
| Name | Multi-Land Profiles |
| Priority (MoSCoW) | Should |
| Depends on | F-01 |
| Status | Draft |

## 1. Business Description

F-07 lets a single user register, edit, and manage multiple land profiles (Lahan) in one account, and mark exactly one as active. The active land becomes the context for consultation (F-02/F-03) and the dashboard filter (F-06): crop recommendations, care plans, and Kanban boards operate on the selected land.

A user may garden in a yard, a balcony, and a pot at the same time; each has different media, sunlight, and water conditions. Without land profiles, recommendations from F-03 would be generic and tasks from F-05 would mix lands in one dashboard. F-07 scopes every downstream feature to a concrete land, keeping data consistent and the demo multi-land ready.

## 2. User Stories

- As a user, I want to register my first land (name, location, media, water, sunlight, budget), so the agent can recommend crops that fit it.
- As a user, I want to add more lands, so each of my planting spots gets its own profile.
- As a user, I want to edit or delete a land, so profiles stay accurate over time.
- As a user, I want to switch the active land with one action, so consultation and dashboard follow the land I care about now.
- As a user, I want the agent to know my active land without me repeating its details, so my chat stays short.

## 3. Acceptance Criteria

1. Given a new user, the first land created is automatically set `is_active = true`.
2. When a user switches the active land, exactly one land per user has `is_active = true` — verified at the DB level, not only in the UI.
3. Given any land list, the active land is visually marked and "Jadikan Aktif" is shown only on inactive lands.
4. When a user creates a land with empty `name`, the API rejects it with a validation error.
5. When a user creates a land with `area_m2` outside 1–100000 or `budget_idr` outside 0–1e12, the API rejects it with a validation error.
6. When coordinates are provided, they must be valid lat/lon ranges (`latitude` −90..90, `longitude` −180..180); otherwise rejected. Empty coordinates are allowed.
7. When a user deletes a land that has tasks, the API rejects with message "Pindahkan atau hapus tugas lahan ini dulu" and no data is changed.
8. Given an active land, a new consultation (F-02) injects a land summary into the agent system prompt, and recommendations (F-03) match that land's media, sunlight, water, and budget.
9. Given a user with no lands, the agent asks "Tambahkan lahanmu dulu di halaman Lahan, atau ceritakan kondisinya langsung".
10. Given lands A and B, the dashboard (F-06) filters tasks by the selected/active land, and switching active land updates the board.

## 4. Data Requirements

- `lands` table (Supabase, RLS owner-only):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles | |
| name | text NOT NULL | e.g. "Pekarangan Rumah", max 60 chars |
| location | text | city/subdistrict, free text |
| latitude | numeric, nullable | −90..90 if set |
| longitude | numeric, nullable | −180..180 if set |
| area_m2 | numeric, nullable | 1–100000 |
| media | text | check in ('soil','hydroponic','pot','other'), default 'soil' |
| water | text | check in ('plenty','limited'), default 'plenty' |
| sunlight | text | check in ('full','partial','shade'), default 'full' |
| budget_idr | numeric, nullable | 0–1e12 |
| experience | text | check in ('beginner','experienced','professional'), default 'beginner' |
| is_active | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

- Single-active guarantee: partial unique index `UNIQUE (user_id) WHERE is_active` (or equivalent trigger). This makes "exactly one active per user" a DB invariant, not an app convention.
- Switching active land runs in one transaction: clear `is_active` on all the user's lands, set it on the target land.

## 5. Integration

- CRUD endpoints (all RLS owner-only): `GET /api/lands`, `POST /api/lands`, `PATCH /api/lands/{id}`, `DELETE /api/lands/{id}`.
- F-01 auth required on every endpoint; `user_id` derived from the session, never from the request body.
- F-02/F-03: the chat API fetches the active land and injects a one-paragraph summary into the agent system prompt (name, location, area, media, water, sunlight, budget, experience).
- F-06: dashboard query joins tasks to land; filter dropdown lists the user's lands, defaulting to the active land.
- UI page `/lahan` (Indonesian): land summary cards, "Tambah Lahan" form, edit form, delete with confirm dialog, "Jadikan Aktif" button.

## 6. Technical Constraints

- Delete-with-tasks decision: **soft-block** (reject the delete, message "Pindahkan atau hapus tugas lahan ini dulu"). Rationale: cascade-deleting tasks silently destroys confirmed plans and Kanban history; soft-block is a 3-line check, keeps the demo honest, and never surprises the user. Revisit cascade only if bulk land cleanup becomes a real user need.
- Partial unique index is the single source of truth for active land; UI must tolerate and recover from constraint violations (e.g. stale two-tab state).
- Supabase RLS policies on `lands`: select/insert/update/delete only where `auth.uid() = user_id`.
- Budget and area stored as numeric, not money/float types, to avoid rounding artifacts.
- `updated_at` bumped on every PATCH via trigger.

## 7. Edge Cases & Error Handling

1. User with zero lands → chat asks "Tambahkan lahanmu dulu di halaman Lahan, atau ceritakan kondisinya langsung"; dashboard shows empty state.
2. Deleting the active land → if it has no tasks, delete is allowed; first remaining land (oldest `created_at`) becomes active. If no lands remain, no active land exists.
3. Concurrent switch (two tabs) → last write wins; the transaction re-checks the single-active invariant, and the partial unique index rejects any conflicting write with a constraint error surfaced as a friendly message.
4. Duplicate active selection attempt → DB rejects; UI falls back to the server's active land.
5. Validation errors (name > 60 chars, area/budget out of range, bad coordinates) → 422 with field-level Indonesian messages.
6. Delete blocked by existing tasks → 409 with "Pindahkan atau hapus tugas lahan ini dulu".
7. Latitude/longitude partially filled → both required together; single coordinate rejected.
8. `media`, `water`, `sunlight`, `experience` outside allowed enums → rejected at DB check; API validates before insert/update.

## 8. Definition of Done

- [ ] CRUD on `/lahan` works: create, list cards, edit, delete with confirm dialog, "Jadikan Aktif".
- [ ] Single-active invariant enforced in DB (partial unique index), verified by test: creating first land auto-activates; switching leaves exactly one active.
- [ ] Chat (F-02/F-03) uses active land context in system prompt; no-land fallback message verified.
- [ ] Dashboard (F-06) filters by land; switching active land updates the board.
- [ ] Delete-block rule tested: land with tasks returns 409 with the Indonesian message; land without tasks deletes.

## 9. References

- PRD §6 (F-07 in feature table), §9 glossary (Lahan).
- `docs/ARCHITECTURE.md` — Supabase RLS, agent hierarchy.
- `docs/DECISION.md` — ADR on data model decisions.
- `docs/features/F-02-chat-konsultasi.md`, `docs/features/F-03-rekomendasi-komoditas.md`, `docs/features/F-06-kanban-dashboard.md`.
