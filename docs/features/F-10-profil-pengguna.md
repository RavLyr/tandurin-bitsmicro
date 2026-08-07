# F-10: User Profile

| Field | Value |
|-------|-------|
| ID | F-10 |
| Name | User Profile |
| Priority (MoSCoW) | Should |
| Depends on | F-01 |
| Status | Draft |

## 1. Business Description

Tanduri stores per-user personal data and reminder preferences in the `profiles` table (created by F-01). Without a profile page, users cannot correct their display name, manage their avatar, or change when they receive email reminders — so reminder behavior would be locked to defaults and identities would show auto-generated names. F-10 gives the user a single page (`/profil`) where they view and edit their personal data: display name and avatar under "Profil", a daily reminder time and email-notification toggle under "Preferensi Pengingat", and a logout action under "Akun". The account email is read-only and always comes from the Supabase Auth session user — it is the identity anchor and is never editable. Avatar files live in the Supabase Storage bucket `avatars` (public-read, per decision below), referenced by `avatar_url` in `profiles`.

## 2. User Stories

- As a user, I want to see my display name, avatar, and account email on one page, so that I know what Tanduri stores about me.
- As a user, I want to change my display name, so that friends and the task board show the name I prefer.
- As a user, I want to upload an avatar picture, so that my profile is recognizable.
- As a user, I want to choose my daily reminder hour and toggle email notifications, so that reminders arrive when I can act on them.
- As a user, I want the account email to stay read-only, so that I cannot accidentally change my login identity.
- As a user, I want to log out from my profile page, so that I can end my session on shared devices.

## 3. Acceptance Criteria

- AC-01: `/profil` renders for an authenticated user; unauthenticated requests redirect to `/login` (302).
- AC-02: The page shows three sections: "Profil" (display name input, avatar preview + upload, email read-only), "Preferensi Pengingat" (toggle `notification_email_preference`, hour picker `reminder_hour` with label "Jam pengingat harian"), "Akun" (logout button).
- AC-03: The page loads existing values from the user's `profiles` row (display name, avatar, notification preference, reminder hour) on mount.
- AC-04: Saving a display name trimmed to 3–60 characters persists via `PATCH /api/profil` and the updated value is shown after save.
- AC-05: Saving with display name shorter than 3 or longer than 60 characters is rejected with an Indonesian message ("Nama tampilan harus 3–60 karakter") and nothing is persisted.
- AC-06: The email field renders the session user's email and is read-only (disabled input); it cannot be changed from this page.
- AC-07: Saving `reminder_hour` as an integer 0–23 persists; values outside 0–23 are rejected with an Indonesian message ("Jam pengingat harus 0–23").
- AC-08: Toggling `notification_email_preference` and saving persists the boolean value.
- AC-09: Uploading a jpeg/png/webp file ≤ 2 MB shows a client-side preview before save; on save the file is uploaded to the `avatars` bucket at path `{user_id}/avatar.{ext}` (overwriting any previous file), `avatar_url` is updated via the API, and the new avatar displays.
- AC-10: Uploading a file larger than 2 MB or of an unsupported type is rejected with an Indonesian message ("Ukuran maksimal 2 MB" / "Format gambar tidak didukung") and the old avatar remains.
- AC-11: If avatar upload to Storage fails, the old `avatar_url` is kept, an Indonesian error is shown ("Gagal mengunggah foto profil"), and the rest of the profile data still saves.
- AC-12: Logout from the "Akun" section destroys the session and redirects to `/login`.
- AC-13: A saved `reminder_hour` and `notification_email_preference` are the values consumed by the F-09 email reminder cron for that user.

## 4. Data Requirements

`profiles` table (created by F-01 migration; F-10 adds no schema columns):

- `id` — `uuid` PK referencing `auth.users(id)`
- `display_name` — `text`, required, trimmed, 3–60 chars
- `avatar_url` — `text` nullable (URL or Storage public URL)
- `notification_email_preference` — `boolean` default `true`
- `reminder_hour` — `int` default `7`, valid 0–23
- `created_at` — `timestamptz`

Storage bucket `avatars` (public-read, DECISION):

- Object path `{user_id}/avatar.{ext}` — one avatar per user; re-upload overwrites the same path so stale files never accumulate.
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`; max size 2 MB.
- No delete-before-upload step needed: overwrite is the replace mechanism (the old file is the same path).

API contract — `PATCH /api/profil` (server-side, session-authenticated):

- Request body: `{ display_name?: string, avatar_url?: string, notification_email_preference?: boolean, reminder_hour?: number }`.
- Server validates per rules above; email is never accepted in the body.
- Success: 200 with updated `profiles` row. Validation failure: 400 with Indonesian message. Unauthenticated: 401.

## 5. Integration

- Supabase Auth session (F-01) supplies the user; email displayed from session user only.
- Supabase Storage: `upload`/`remove` on bucket `avatars`; server-side via `SUPABASE_SERVICE_ROLE_KEY` or user-context client (bucket is public-read so no signed URLs needed).
- `PATCH /api/profil` writes to `profiles`; RLS "users can select/update own profile" (F-01) enforces owner-only access.
- F-09 email reminder cron reads `reminder_hour` and `notification_email_preference` from `profiles` to schedule/skip emails.
- Next.js 15 App Router; `/profil` is a protected route (F-01 AC-07).

## 6. Technical Constraints

- Supabase free tier: Storage limits apply; keep avatars ≤ 2 MB.
- Public-read bucket decision: simpler than signed URLs and acceptable because avatars are low-sensitivity; revisit (private bucket + signed URL) if storage abuse appears. `ponytail:` bucket policy — move to private + signed URL if public bucket is abused.
- 3-day deadline: no client-side image cropping/resizing; rely on client preview and server size/type checks only.
- Timezone Asia/Jakarta for `reminder_hour` interpretation (F-09).
- Avatar extension derived from uploaded file MIME, not client filename.

## 7. Edge Cases & Error Handling

- Avatar too large (> 2 MB) or unsupported type → "Ukuran maksimal 2 MB" / "Format gambar tidak didukung"; old avatar kept.
- Storage upload failure → keep old `avatar_url`, show "Gagal mengunggah foto profil"; other profile fields still save.
- Concurrent profile updates → last write wins; `updated_at` optimistic concurrency check is optional and documented (not required for this build; acceptable because profiles are low-conflict).
- User re-uploads avatar → overwrite `{user_id}/avatar.{ext}`; no orphan objects remain.
- Network failure on save → "Gagal menyimpan, periksa koneksi internet Anda"; form values preserved.
- Display name whitespace-only → treated as empty after trim; rejected with the 3–60 characters message.
- Missing `profiles` row (race) → server creates or falls back to defaults derived from session user; page still renders.

## 8. Definition of Done

- [ ] Profile loads on `/profil` with existing display name, avatar, email (read-only), and reminder preferences.
- [ ] Display name edit saves and persists via `PATCH /api/profil`; validation messages per AC-05.
- [ ] Avatar upload, client preview, overwrite replace, and `avatar_url` persistence work end-to-end.
- [ ] Reminder hour and notification toggle persist and are the values used by the F-09 cron.
- [ ] Avatar rejection paths (size/type) and storage-failure fallback verified per AC-10/AC-11.
- [ ] Logout works and redirects to `/login`.
- [ ] RLS verified: another user cannot read or update this user's profile row.
- [ ] Works on the production URL on Vercel free tier.

## 9. References

- PRD §6 Features Overview (F-10 row; depends on F-01)
- `docs/features/F-01-auth.md` — `profiles` schema, trigger, RLS, protected routes
- `docs/features/F-09-email-reminder.md` — cron consuming `reminder_hour` / `notification_email_preference`
- PRD Glossary: Supabase, RLS, Profil
- `docs/DESIGN.md` — profile page UI flow
- `docs/DECISION.md` — ADR on avatar storage (public-read bucket)
