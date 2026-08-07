# Tanduri — Demo Script (T-406)

End-to-end walkthrough for the demo. Steps are sequential; each lists the
action, expected UI state, and talking points. Commands target the production
URL (`NEXT_PUBLIC_APP_URL`); they work the same on `http://localhost:3000`.

Prep:

```bash
# 1. Apply the seed (Supabase Dashboard → SQL Editor → paste scripts/seed.sql → Run).
#    Or with CLI:
#    supabase db push   (if linked)
# 2. Create/reset the demo user password:
#    Supabase Dashboard → Authentication → Users → demo@tanduri.test → Reset password.
bash scripts/setup.sh   # verifies .env.local has all non-optional vars
pnpm dev                # or pnpm start for the production build
```

---

## 1. Login

**Action:** open `<APP_URL>/login`, enter `demo@tanduri.test` (or register a
new account with email/password).

**Expected:** redirected to `/dashboard` (Kanban). Header shows logo + land
switcher "Pekarangan Dempo", Riwayat/Lahan icons, avatar.

**Talking points:** auth via Supabase (email/password or Google), session
cookie, RLS-backed reads.

## 2. Kanban board populated

**Action:** observe the three columns.

**Expected:** "Belum Dikerjakan" (2, incl. a red overdue card "Terlambat X
hari"), "Sedang Dikerjakan" (2), "Selesai" (2). Cards show phase badge
(e.g. "Olah Lahan"), due date, description.

## 3. Chat recommendation

**Action:** header → "Chat Tanduri" → new chat → tap the example chips
"Rekomendasikan tanaman untuk lahan 10 m² di Semarang".

**Expected:** streaming reply ("Sedang menulis..."), tool call to
`weather_lookup` (weather data in reply), ≥2 crops each with "Kecocokan: X%",
ending with "Apakah rencana ini sesuai? Saya bisa buatkan jadwal perawatannya."

**Talking points:** agent orchestration + function calling (weather API),
markdown rendering, metadata cards.

## 4. Confirm → Kanban tasks appear

**Action:** reply `sesuai`.

**Expected:** interim message "Oke, saya buatkan jadwalnya sekarang...", then a
task summary card listing 12 tasks + "Buka Kanban". Switch to `/dashboard` —
new tasks now in "Belum Dikerjakan" (realtime if another tab is open).

**Talking points:** T-301 plan confirmation captured in `metadata.plan_confirmed`;
T-302 generated tasks inserted into `tasks` (idempotent — re-confirming creates
no duplicates).

## 5. Drag a card

**Action:** drag a "Belum Dikerjakan" card into "Sedang Dikerjakan"; reorder two
cards inside a column.

**Expected:** optimistic move; persists on reload; toast on success.

**Talking points:** `@dnd-kit` + `POST /api/tasks/update` (position shift keeps
the unique index valid), keyboard fallback arrow keys (a11y).

## 6. Photo diagnosis

**Action:** in chat → paperclip → pick a clear photo of a sick plant leaf →
type "Daun ini kenapa?" → send.

**Expected:** image preview before send; reply with 5-6 structured sections
(gejala, top-2 diagnosis + keyakinan, penyebab, perawatan bertahap, kapan ke
ahli, penafian AI); diagnosis card with the photo + disclaimer.

**Talking points:** client-side canvas compression ≤1024px/≤5MB, private
`plant-images` bucket (owner-only RLS), Gemini multimodal inline image, follow-up
questions reuse the stored image (no re-upload).

## 6. Run the reminder cron (F-09)

**Action:** trigger locally (the seed already made one task due tomorrow and one
overdue). Run on the server:

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2)
curl -X POST http://localhost:3000/api/cron/reminders -H "x-cron-secret: $CRON_SECRET"
```

**Expected:** `{ sent: 1, skipped: 1 }` (one image reminder sent per opted-in
profile — sandbox/whitelisted inbox; the overdue task dedups via
`notification_logs`). Wrong secret → 401.

**Talking points:** cron route gated by `CRON_SECRET`, Asia/Jakarta selection,
Resend email, idempotent dedup logging.

## 7. Riwayat + resume

**Action:** /riwayat → find the tomato/cabai conversation → "Lanjutkan
Konsultasi".

**Expected:** full thread reloads in `/chat?conversation_id=…`; follow-up
question in context.

**Talking points:** lateral-join list (message count + preview only), resume
sends the last 20 messages as history.

## 8. Profile/avatar

**Action:** /profil → upload avatar, set "Jam pengingat harian", toggle email
preference → save.

**Expected:** toast "Perubahan tersimpan"; avatar shows in header;
`reminder_hour` returned by GET.

## 9. Lahan page (F-07)

**Action:** /lahan → "Tambah Lahan" → create "Kebun Rooftop" (Jakarta) → set
active.

**Expected:** new land card with "Aktif" badge; "Semua Lahan" + land chips in
Kanban change the task filter.

---

## Deployment verification checklist (T-503/T-504)

| Check | How |
|-------|-----|
| Health | `GET <prod>/` → 200 |
| All env vars present | Vercel Project Settings → Environment Variables |
| Cron registered | Vercel Dashboard → Cron |
| Manual cron trigger | `curl -X POST <prod>/api/cron/reminders -H "x-cron-secret: $CRON_SECRET"` → JSON |
| Secret not in client bundle | DevTools → Network → grep "service_role" in deployed JS → absent |