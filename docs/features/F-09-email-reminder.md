---
# F-09: Email Reminders

| Field | Value |
|-------|-------|
| ID | F-09 |
| Name | Email Reminders (cron, deadline-based) |
| Priority (MoSCoW) | Should |
| Depends on | F-06 |
| Status | Draft |

## 1. Business Description

F-09 keeps users from missing their planting deadlines. Once a day, an automated sweep emails the user when a task deadline is near (due within the next 24 hours) or overdue and not yet completed (`status != 'selesai'`). Emails only fire when the user opted in (`notification_email_preference = true`) and at the user's preferred hour (`reminder_hour`). Each task that qualifies is emailed at most once per day.

The feature closes the loop opened by F-05: plans produce deadlines, deadlines produce reminders, reminders produce actions that flip cards to Selesai on the F-06 board. The job is idempotent, must never block itself on an email failure, and must log every failure server-side.

## 2. User Stories

- As a user, I want an email when a task is due tomorrow, so I remember before it slips.
- As a user, I want an email when a task is overdue and unfinished, so I can get back on track.
- As a user, I want at most one email per task per day, so my inbox is not spammed.
- As a user, I want to receive reminders only at my preferred hour, so they arrive at a convenient time.
- As a user, I want to opt out of reminders, so no emails arrive when I no longer need them.

## 3. Acceptance Criteria

1. The endpoint `POST /api/cron/reminders` requires a `CRON_SECRET` header matching the env var `CRON_SECRET`; missing or mismatched header returns `401`, and unauthenticated direct access returns `401` before any query runs.
2. The selection query returns tasks where the owning profile is active, `profiles.notification_email_preference = true`, `tasks.status != 'selesai'`, and (`tasks.due_date = today + 1` OR `tasks.due_date < today`), computed in Asia/Jakarta.
3. The reminder window is exactly "due tomorrow" or "overdue": a task with `due_date > today + 1` is never selected; completion (`status = 'selesai'`) disqualifies a task regardless of its date.
4. Dedup: a run first checks `notification_logs` for an existing row with the same `(user_id, task_id, 'email_reminder', today)`; if present, the task is skipped and `skipped` incremented, never `sent`.
5. Each qualifying task queues a Resend email in Indonesian: subject `🌱 Pengingat Tanduri: <task title>`, body with greeting using `display_name`, task title, due date formatted "Jatuh tempo besok (12 Agustus 2026)", the overdue notice "Sudah terlambat X hari" when overdue, a link to `https://<vercel-url>/dashboard`, and the signature "Tim Tanduri".
6. The endpoint returns JSON `{ sent: n, skipped: m }`, where `n` is queued emails and `m` is deduped/skipped rows; an empty result returns `{ sent: 0, skipped: 0 }`.
7. When a Resend call fails, the run logs a `notification_logs` entry (type `email_failed` or a status of `failed`) and continues to the next task; it never aborts the cron.
8. Idempotency: a re-invocation of the same run day sends zero extra emails (returns `{ sent: 0, skipped: m }`).

## 4. Data Requirements

- Consumed from `tasks` (schema owned by F-05): `id`, `user_id`, `title`, `due_date` (date, Asia/Jakarta), `status`.
- Consumed from `profiles` (schema owned by F-01): `display_name`, `notification_email_preference` (bool, default `true`), `reminder_hour` (int, default `7`).
- New `notification_logs` table:

| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK `profiles(id)` |
| task_id | uuid | FK `tasks(id)` (cascade delete) |
| type | text | CHECK in ('email_reminder','email_failed') |
| sent_at | date | NOT NULL |
| created_at | timestamptz | default now() |

- UNIQUE constraint on `(user_id, task_id, type, sent_at)`; gives per-day idempotency — a row means "already handled today".

## 5. Integration

- Scheduling: Vercel Cron on the Hobby plan — `cron.json` with `"schedule": "0 7 * * *"` and `"timezone": "Asia/Jakarta"` (07:00 Asia/Jakarta = 00:00 UTC), targeting `/api/cron/reminders`. Vercel sends the `CRON_SECRET` header automatically when that env var is set.
- Hobby-plan cron limits must be verified during implementation (see DECISION.md ADR-04). Documented fallback if Vercel cron is unavailable on Hobby: a GitHub Actions scheduled workflow hitting the same endpoint, or Supabase `pg_cron` calling the endpoint as a scheduled edge function.
- Emails sent via the Resend API server-side using `RESEND_API_KEY` (env var). Free tier ~3000 emails/month, 100/day. Sender must be a verified domain or, for testing, the Resend sandbox onboarding address.
- No client changes; the F-06 dashboard link appears only inside the email body.

## 6. Technical Constraints

- Vercel free tier + Supabase free tier + Resend free tier only (PRD NFR-09).
- All deadline math is fixed to Asia/Jakarta (PRD §8, ADR-12); per-user timezones are out of scope.
- Email logic runs server-side only; `CRON_SECRET` and `RESEND_API_KEY` live in env vars, never reach the client (PRD NFR-04).
- The cron must be idempotent and additive: it reads, dedups, sends, and logs; it never mutates task or profile rows.
- UI/content text in Indonesian; code identifiers in English (PRD §8).

## 7. Edge Cases & Error Handling

1. Resend 4xx (invalid `from` address, rate limit) -> log type `email_failed`, continue to the next row; the failed row serves as a retry candidate for a later run (dedup only blocks rows logged as sent).
2. Empty result set -> return `{ sent: 0, skipped: 0 }` without errors.
3. `CRON_SECRET` missing or mismatched -> `401`, no selection query runs, no emails sent.
4. Unauthenticated or non-cron access -> `401`.
5. Task deleted between selection and send (cascade from F-05 lands deletion) -> lookup-by-`task_id` returns nothing; count `skipped`, continue without crash.
6. Duplicate `(user_id, task_id, type, sent_at)` from overlapping runs -> UNIQUE constraint rejects the insert; catch the conflict, count `skipped`, continue (idempotent re-run).
7. Rate limit or quota exhausted -> 429 surfacing as a failed send; logged `email_failed`; a later run retries it (dedup must allow retry when `status = 'failed'`).

## 8. Definition of Done

- [ ] `POST /api/cron/reminders` reachable; Vercel cron scheduled daily `0 7 * * *` in `cron.json` with timezone Asia/Jakarta; fallback documented (GitHub Actions workflow or Supabase `pg_cron` edge function) if Hobby cron is unavailable.
- [ ] Selection query returns exactly due-tomorrow + overdue tasks for active, opted-in profiles with `status != 'selesai'`, in Asia/Jakarta.
- [ ] Verify the dedup rule: a second invocation for the same day sends zero extra emails.
- [ ] Resend email arrives with subject `🌱 Pengingat Tanduri: <title>`, body with Indonesian date text, "Sudah terlambat X hari" when overdue, dashboard link, and "Tim Tanduri" signature.
- [ ] Failed sends logged as `email_failed` (or status `failed`) and the run continues.
- [ ] `CRON_SECRET` mismatch and unauthenticated access both return `401`.
- [ ] Repeated manual invocation returns `{ sent: 0, skipped: m }` after the first run.

## 9. References

- PRD §6 (F-09 feature map row; depends on F-06), §9 Glossary (Task, Kanban, Supabase), §8 constraints (Asia/Jakarta, free tier, Indonesian UI).
- `docs/features/F-06-kanban-dashboard.md` — `status` values (`belum_dikerjakan`/`sedang_dikerjakan`/`selesai`), board URL `/dashboard`.
- `docs/features/F-05-task-generator.md` — `tasks` schema, `due_date` semantics, FK `user_id`.
- F-01 / F-10 user profile spec — `profiles` columns `notification_email_preference`, `reminder_hour`.
- `docs/DECISION.md` — ADR-003 (Hobby-plan cron limits; verify during implementation), ADR-012 (Asia/Jakarta timezone), ADR-? (Resend email provider choice).
- Vercel Cron docs — `cron.json`/`cronjobs.json`, `CRON_SECRET` header, timezone syntax.
- Resend API docs — send endpoint, free-tier limits, verified domain / sandbox onboarding sender.