# F-06: Kanban Dashboard

| Field | Value |
|-------|-------|
| ID | F-06 |
| Name | Kanban Dashboard (realtime task board) |
| Priority (MoSCoW) | Must |
| Depends on | F-01, F-05 |
| Status | Draft |

## 1. Business Description

F-06 is the operational heart of Tanduri: a web dashboard at `/dashboard` that renders the tasks produced by F-05 (Task Generator) as a Kanban board. The user sees every actionable planting step grouped into three fixed columns, tracks progress across land profiles, and can act on tasks directly — moving cards, editing descriptions, marking completion, and adding manual notes. Because the board subscribes to Supabase Realtime, tasks generated during a chat consultation appear on the board instantly with no page refresh, making the agent's plan feel alive rather than stored somewhere out of sight.

The board is the user's daily "what do I do with my plants today" surface: overdue items are highlighted, the currently selected land (F-07) filters the visible tasks, and a quick action opens the Chat Tanduri widget. The feature is mobile-first: on small screens the columns scroll horizontally and cards use full width.

## 2. User Stories

- As a user, I want to see all my tasks grouped by status column, so I know what is pending, in progress, and done at a glance.
- As a user, I want to drag a task card between columns, so I can update its status by gesture instead of editing forms.
- As a user, I want to reorder cards within a column, so I can prioritize what to do first.
- As a user, I want tasks generated during chat to appear on the board without refreshing, so I can switch from planning to doing immediately.
- As a user, I want overdue tasks visibly highlighted, so I know which deadlines slipped.
- As a user, I want to add a manual note to a task, so I can record observations (e.g. "leaf yellowing observed").
- As a user, I want to mark a task done with one click, so completing a step takes seconds.
- As a user, I want to filter the board by land, so I can focus on one planting project at a time.
- As a user on mobile, I want to swipe between columns, so the board stays usable on a phone.

## 3. Acceptance Criteria

1. Visiting `/dashboard` authenticated shows tasks grouped into exactly three columns, in fixed order: "Belum Dikerjakan" (`status = belum_dikerjakan`), "Sedang Dikerjakan" (`status = sedang_dikerjakan`), "Selesai" (`status = selesai`); empty columns render with an empty-state hint.
2. Only tasks belonging to the authenticated user (and the selected land, when a land filter is active) are shown; unauthenticated visits redirect to `/login` (F-01).
3. Dragging a card to another column calls `POST /api/tasks/update` and persists the new status; the UI updates immediately and reverts the card to its original column if the request fails (optimistic update with rollback).
4. Dropping a card into a column sets `position = max(position) + 1` within that column for the current (user, land) scope.
5. Reordering within a column persists new positions; all affected rows are renumbered in a single transaction via the server action or RPC `update_task_positions`.
6. Realtime: subscribing to channel `tasks-changes` on the `tasks` table (public channel, RLS-filtered to `user_id = auth.uid()`) applies INSERT/UPDATE/DELETE events to the board without a page refresh; a task created in chat renders within 3 seconds of confirmation.
7. On realtime connection loss a banner shows "Koneksi realtime terputus, mencoba menyambung..." and the client reconnects; if realtime remains down, the board refetches every 30 seconds as fallback polling.
8. Task cards show title, a phase badge (fase: `olah lahan`, `semai`, `tanam`, `pemupukan`, `penyiraman`, `perawatan`, `panen`), and due date. A card with `due_date < today` and `status != selesai` shows a red highlight and "Terlambat X hari" (X = days overdue).
9. Expanding a card reveals its description; description can be edited inline and saved via `POST /api/tasks/update`.
10. A "Tandai Selesai" quick action on a card moves it to the next column ("Selesai" when already in "Sedang Dikerjakan") via `POST /api/tasks/update`.
11. Adding a comment inserts into `task_comments` via `POST /api/tasks/{id}/comment`; comments render under the card and are readable by the task owner.
12. Deleting a task shows a confirmation dialog ("Hapus tugas ini?"), then calls `DELETE /api/tasks/{id}` and removes the card from the board.
13. The filter bar offers a land selector (from F-07 lands list), a title search, and a status filter; default view is the active land. Filtering is client-side on the fetched task set.
14. Header quick actions: "Chat Tanduri" opens the chat widget (F-02), plus links to `/riwayat` and `/profil` and a land switcher.
15. Mobile: columns are horizontally scrollable (swipe), each card is full width; drag & drop is disabled when offline (no offline queue in this build) and a notice explains why.

## 4. Data Requirements

- `tasks` table — schema owned by F-05; F-06 consumes at minimum: `id` (uuid PK), `user_id` (fk `profiles.id`), `land_id` (fk F-07 lands, nullable), `title` (text), `description` (text, nullable), `fase` (text from the seven phase values above), `due_date` (date, Asia/Jakarta), `status` (text: `belum_dikerjakan` | `sedang_dikerjakan` | `selesai`), `position` (int, per user+land scope).
- `task_comments` table:
  - `id` — `uuid` primary key
  - `task_id` — uuid FK referencing `tasks(id)` (cascade delete)
  - `user_id` — uuid FK referencing `profiles(id)`
  - `content` — `text`
  - `created_at` — `timestamptz`
- Realtime: Supabase Realtime enabled for the `tasks` table (public channel). RLS policies: select/insert/update/delete own tasks only (`user_id = auth.uid()`); comments owner-only. Clients filter server-side via `user_id = auth.uid()` on the `tasks-changes` channel.
- Position invariant: `position` is unique per (user_id, land scope, status); board queries order by `status`, then `position ASC`.

## 5. Integration

- Supabase Realtime via `@supabase/supabase-js`: channel `tasks-changes`, postgres_changes events (INSERT/UPDATE/DELETE) filtered `user_id = auth.uid()`; public channel, RLS-filtered.
- Next.js 15 App Router server actions (all require session, re-validate RLS server-side):
  - `POST /api/tasks/update` — body: `{ id, status?, position?, description? }`
  - `POST /api/tasks/{id}/comment` — body: `{ content }`
  - `DELETE /api/tasks/{id}`
  - Reorder path uses RPC `update_task_positions` (single transaction) or a server action performing the same renumbering atomically.
- F-05 Task Generator writes to `tasks`; those writes surface via Realtime, no F-06 polling for normal operation.
- F-07 lands list feeds the land selector and switcher; `GET` via Supabase client with RLS.
- F-02 chat widget: "Chat Tanduri" button opens the existing widget component.
- Drag & drop: HTML5 drag & drop or pointer-based implementation preferred; `@dnd-kit` allowed as fallback. No heavy DnD library by default.

## 6. Technical Constraints

- Vercel free tier + Supabase free tier only (PRD §8, NFR-09).
- All deadline math in Asia/Jakarta (PRD §8).
- No offline queue in this build: when offline, dragging is disabled rather than silently losing writes.
- Optimistic updates must roll back cleanly on failure to avoid phantom states after realtime events.
- UI text in Indonesian; code identifiers in English.
- Position renumbering must be atomic (single transaction) to prevent duplicate positions.

## 7. Edge Cases & Error Handling

- Realtime disconnected → banner "Koneksi realtime terputus, mencoba menyambung...", reconnect attempts, then 30s polling fallback; banner clears on reconnection.
- Update/delete on a task that no longer exists (404, e.g. deleted elsewhere) → refresh the board, show "Tugas sudah dihapus".
- Optimistic update fails (network) → rollback to previous state, show "Gagal menyimpan perubahan, coba lagi".
- Offline → disable drag & drop; show offline notice; no queue.
- Task with `due_date` in the past but `status = selesai` → no overdue highlight (completed tasks are never shown as late).
- Null `due_date` → show "—" or phase-only card; never treated as overdue.
- Empty column → Indonesian empty-state text per column (e.g. "Belum ada tugas").
- Comments on a task the user can no longer see → blocked by RLS; comment POST returns 403-style error surfaced as a generic Indonesian message.
- Rapid double-drop (drag racing) → last write wins; position renumbering in a single transaction keeps ordering consistent.

## 8. Definition of Done

- [ ] `/dashboard` renders tasks grouped by the three fixed Indonesian columns, ordered by position.
- [ ] Drag & drop between columns and within a column persists status + position via server actions; rollback works on failure.
- [ ] Realtime on channel `tasks-changes` renders F-05 chat-generated tasks instantly (INSERT), and reflects UPDATE/DELETE without refresh.
- [ ] Reconnect + 30s polling fallback works when realtime is down, with the Indonesian banner.
- [ ] Overdue highlight ("Terlambat X hari") works for `due_date < today && status != selesai`.
- [ ] Comments (`task_comments`) add and render; delete shows confirm dialog and removes the card.
- [ ] Land filter + title search + status filter work; default view is the active land.
- [ ] Header shows "Chat Tanduri", land switcher, `/riwayat` and `/profil` links.
- [ ] Mobile: horizontal column swipe, full-width cards, drag disabled offline.
- [ ] All RLS policies verified: cross-user read/comment/update attempts return nothing.

## 9. References

- PRD §6 Features Overview (F-06 row; depends on F-01, F-05) and Glossary (Kanban, Lahan, Task, Realtime, RLS)
- PRD §7 NFR-05 (responsive UI), NFR-06 (realtime sync, Supabase as source of truth), NFR-04 (RLS)
- PRD §8 Constraints (free tier, Indonesian UI, Asia/Jakarta)
- `docs/features/F-05-task-generator.md` — `tasks` table schema, phase values, status values
- `docs/features/F-01-auth.md` — session handling, protected routes, RLS pattern
- `docs/features/F-07-multi-lahan.md` — lands list for the filter/switcher
- `docs/DESIGN.md` — board layout, card design, mobile behavior
- `docs/DECISION.md` — ADR on Realtime vs polling and DnD library choice (where stored)
