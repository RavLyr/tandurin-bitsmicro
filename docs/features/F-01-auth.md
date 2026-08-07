# F-01: Authentication

| Field | Value |
|-------|-------|
| ID | F-01 |
| Name | Authentication (email/password + Google OAuth) |
| Priority (MoSCoW) | Must |
| Depends on | — |
| Status | Draft |

## 1. Business Description

Tanduri is a personal planting assistant that stores each user's land profiles (lahan), consultations, generated tasks, and notification preferences. Without a personal identity layer none of this data can be associated with a specific user, so authentication is the foundation every other feature (F-02…F-10) builds on. The feature provides two login methods: email/password and Google OAuth, both handled by Supabase Auth so Tanduri ships no bespoke credential storage. Every user who signs up or signs in with Google automatically receives a row in the `profiles` table that carries display name and reminder preferences, giving a single identity across chat history, task board, and land profiles. Sessions are cookie-based server-side sessions managed by `@supabase/ssr`, so the app reads the authenticated user on the server before rendering protected pages. Because the target user is a beginner urban gardener, the sign-in flow is kept short (Google one-click) and all UI text is Indonesian.

## 2. User Stories

- As a new user, I want to register with my email and password, so that I can use Tanduri without relying on a third-party account.
- As a returning user, I want to sign in with Google in one click, so that I can start using Tanduri without remembering credentials.
- As a signed-out user, I want to be redirected to the login page when visiting protected pages, so that my personal data is not exposed.
- As a user, I want to sign out, so that my session ends securely on shared devices.
- As a signed-up user, I want my profile row (display name, reminder hour) to exist automatically, so that I never have to fill in redundant setup screens.

## 3. Acceptance Criteria

- AC-01: A new user can sign up with a valid email and password; the account is created in Supabase Auth and a row is auto-created in `profiles`.
- AC-02: Signing up with an email that already exists returns a friendly Indonesian error ("Email sudah terdaftar") and does not create a duplicate account.
- AC-03: An existing user can sign in with the correct password and is redirected to `/dashboard`.
- AC-04: Signing in with a wrong password returns a friendly Indonesian error and does not log the user in.
- AC-05: A user can click "Lanjutkan dengan Google", complete the Google consent flow, and be signed in; `profiles` row is created if one does not exist.
- AC-06: If the browser blocks the Google popup, a friendly Indonesian message appears and the email/password form remains usable.
- AC-07: No authenticated user can access `/dashboard`, `/profil`, `/riwayat`, or `/lahan`; such requests redirect to `/login` (302), with next-URL preserved where usable.
- AC-08: An authenticated user visiting `/login` or `/register` is redirected to `/dashboard`.
- AC-09: Logout destroys the session cookie and redirects to `/login`; re-visiting a protected route after logout redirects again to `/login`.
- AC-10: The client bundle contains no `SUPABASE_SERVICE_ROLE_KEY` value (severable-only key never reached client code).

## 4. Data Requirements

Schema (created head of a SQL migration):

- `profiles`
  - `id` — `uuid` primary key referencing `auth.users(id)`
  - `display_name` — `text`
  - `avatar_url` — `text` (nullable)
  - `notification_email_preference` — `boolean` default `true`
  - `reminder_hour` — `int` default `7`
  - `created_at` — `timestamptz`

Example row:

```
id:          00000000-0000-0000-0000-000000000001
display_name: "Budiman"
avatar_url:  https://lh3.googleusercontent.com/... (nullable)
notification_email_preference: true
reminder_hour: 7
created_at:   2026-08-06T09:00:00+07:00
```

Auto-creation: a Supabase trigger `on_auth_user_created` on `auth.users` (after insert) inserts into `profiles` with `(id = new.id, display_name = coalesce(new.raw_user_meta_data->>'full_name', new.email))`. The trigger is the preferred reliable method because it fires even for OAuth signup with no application request, eliminating a race where the app tries to use a profile before the row exists.

## 5. Integration

- Supabase Auth (email/password + Google OAuth provider) via `@supabase/ssr` for cookie-based SSR sessions.
- Next.js 15 App Router: server components read the user via `createServerClient`; `middleware.ts` refreshes session and protects routes.
- Protected routes (redirect to `/login` when unauthenticated): `/dashboard`, `/profil`, `/riwayat`, `/lahan`.
- Env vars:
  - `NEXT_PUBLIC_SUPABASE_URL` (public, used in browser)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client bundle)
- Configure in Supabase Dashboard: Google OAuth provider enabled; Site URL and redirect URLs set to production + localhost.
- RLS: policy on `profiles` — "users can select/update own profile" (`using (auth.uid() = id) with check (auth.uid() = id)`). RLS is not applied to `auth.users`; that table is managed by Supabase.

## 6. Technical Constraints

- Vercel free tier: serverless functions, cookie size limits; keep session cookie within default limits.
- Supabase free tier: limited project al location; cold starts possible; rate limits on auth endpoints.
- Google OAuth popup must be opened from a user gesture; some browsers/in-app webviews block popups entirely.
- `NEXT_PUBLIC_*` variables are shipped to the browser; keys labeled `SUPABASE_SERVICE_ROLE_KEY` must never be `NEXT_PUBLIC_`.
- Timezone: `reminder_hour` and all deadlines use Asia/Jakarta.

## 7. Edge Cases & Error Handling

- Duplicate email at signup → "Email sudah terdaftar." (account exists; offer sign-in).
- Wrong password → "Email atau kata sandi salah." generic message (no account enumeration).
- Google popup blocked → detect no popup window; show "Terjadi kendala saat masuk dengan Google, gunakan email dan kata sandi."
- Email already linked to another provider / identity conflict → Supabase `identity_linking` behavior; show "Email sudah digunakan dengan metode lain. Masuk dengan metode sebelumnya."
- Network timeout / offline → "Gagal terhubung, periksa koneksi internet Anda."
- Network timeout during OAuth redirect → fall back to email/password; retry link available.
- Duplicate /resend of session refresh fails → clear cookies and redirect to `/login` to avoid des mixed state.
- Localized UI text: buttons "Masuk", "Daftar", "Lanjutkan dengan Google"; labels "Email", "Kata Sandi".

## 8. Definition of Done

- [ ] Email/password register works and creates an authenticated session.
- [ ] Email/password login works for pre-existing accounts.
- [ ] Logout works and clears the session.
- [ ] Google OAuth login works end-to-end (consent → callback → dashboard).
- [ ] Trigger `on_auth_user_created` creates one `profiles` row for every new user (email and Google); verified via SQL select on a test account.
- [ ] `/dashboard`, `/profil`, `/riwayat`, `/lahan` redirect unauthenticated users to `/login` and render for authenticated users.
- [ ] RLS policy "users can select/update own profile" active; cross-user read/update attempt returns empty/no rows.
- [ ] Server-only service-role key is not present anywhere in the client bundle (checked in build output).
- [ ] Indonesian error messages verified against AC-02–AC-07 scenarios.
- [ ] Works on the production URL on Vercel free tier.

## 9. References

- PRD §6 Features Overview (F-01 row; dependency of F-02..F-10)
- PRD Glossary: Supabase, RLS, Profil/lahan
- PRD §8 Constraints (free tier, Indonesian UI, Asia/Jakarta)
- `docs/ARCHITECTURE.md` — SSR session flow, deployment env config
- `docs/DESIGN.md` — login/register screen flows
- `docs/DECISION.md` — ADR covering auth stack/trigger choice (where stored)