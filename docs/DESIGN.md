# DESIGN — Tanduri UI/UX & Data Design

| Field | Value |
|-------|-------|
| Product | Tanduri — Solusi Tani Zaman Saiki |
| Project | Bitsmikro Innovative Vibecode 2026, Team Satria Firm Vibers, Universitas Diponegoro |
| Status | Draft |
| Source of truth | `docs/PRD.md`, `docs/features/F-01..F-10.md` |

## 1. Design Principles

- **Farm meets modern tech.** Warm earth neutrals + calm green as the primary brand color; clean cards, generous whitespace, rounded corners — an agricultural app that does not feel dated.
- **Calm and trustworthy.** Low-contrast green primary, muted neutrals; the only loud color is semantic (overdue red, warning amber), so urgency is instantly visible.
- **Mobile-first responsive.** Kanban, chat, and forms are designed for a phone first, expanding to tablet/desktop. Columns swipe horizontally on small screens.
- **Indonesian UI.** Every label, button, state, and error is Indonesian (PRD §8). Documentation prose stays English.
- **Accessible.** AA contrast minimum, visible focus rings, Indonesian `aria-label`s, alt text on images, keyboard fallbacks for every gesture.
- **Component reuse.** A small set of shadcn/ui-style primitives (`Button`, `Input`, `Dialog`, `Toast`, `Badge`, `Card`, `Skeleton`) reused across all pages; no page-specific ad-hoc components where a primitive exists.
- **Kanban is the core demo screen**; the chat widget is reachable from the dashboard header in one click ("Chat Tanduri").

## 2. Design Tokens

### Color

Palet final dari Stitch UI kit (`screen-ui/code*.html` tailwind.config). Nilai baru menggantikan draft sebelumnya dan menjadi source of truth untuk FE.

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#16A34A` | Buttons, active states, links, "Chat Tanduri" CTA |
| `--primary-container` | `#00873A` | Button hover background, phase badge bg (dark green) |
| `--primary-fixed` | `#7FFC97` | Alternate bright green tint |
| `--primary-fixed-dim` | `#62DF7D` | Slightly dimmer primary tint |
| `--on-primary` | `#FFFFFF` | Text on primary backgrounds |
| `--on-primary-container` | `#F7FFF2` | Text on primary-container (very light green) |
| `--on-primary-fixed` | `#002109` | Dark text on bright green tints |
| `--on-primary-fixed-variant` | `#005320` | Muted text on green tints |
| `--inverse-primary` | `#62DF7D` | Primary in dark mode (not used yet) |
| `--surface` | `#FFFFFF` | Cards, dialogs, inputs |
| `--surface-bright` | `#F0FDEF` | Very light green-white surface |
| `--surface-container-lowest` | `#FFFFFF` | Lowest elevation surface |
| `--surface-container-low` | `#EAF7E9` | Slightly tinted surface |
| `--surface-container` | `#E4F1E3` | Default container surface |
| `--surface-container-high` | `#DFECDE` | Higher elevation container |
| `--surface-container-highest` | `#D9E6D8` | Highest elevation container |
| `--surface-dim` | `#D1DDD0` | Dimmed surface variation |
| `--surface-variant` | `#D9E6D8` | Alternative surface variant |
| `--on-surface` | `#1F2A21` | Primary text (dark green-black) |
| `--on-surface-variant` | `#3E4A3D` | Secondary text, placeholders |
| `--inverse-surface` | `#28332A` | Inverse surface for dark mode |
| `--inverse-on-surface` | `#E7F4E6` | Text on inverse surface |
| `--background` | `#F8FAF7` | Page background (green-tinted white); alias `--bg` |
| `--on-background` | `#131E16` | Text on background |
| `--outline` | `#6E7B6C` | Borders, dividers |
| `--outline-variant` | `#BDCABA` | Lighter borders, subtle dividers |
| `--secondary` | `#526256` | Secondary actions, muted elements |
| `--on-secondary` | `#FFFFFF` | Text on secondary |
| `--secondary-container` | `#D5E7D8` | Container for secondary elements |
| `--on-secondary-container` | `#58685C` | Text on secondary container |
| `--secondary-fixed` | `#D5E7D8` | Fixed variant secondary |
| `--secondary-fixed-dim` | `#BACBBC` | Dimmer fixed secondary |
| `--on-secondary-fixed` | `#101F15` | Text on secondary fixed |
| `--on-secondary-fixed-variant` | `#3B4A3F` | Muted text on secondary fixed |
| `--tertiary` | `#2B673F` | Tertiary accent (dark green) |
| `--on-tertiary` | `#FFFFFF` | Text on tertiary |
| `--tertiary-container` | `#458156` | Container for tertiary |
| `--on-tertiary-container` | `#F6FFF4` | Text on tertiary container |
| `--tertiary-fixed` | `#B1F2BE` | Bright tertiary tint |
| `--tertiary-fixed-dim` | `#96D5A3` | Dimmer tertiary tint |
| `--on-tertiary-fixed` | `#00210D` | Text on tertiary fixed |
| `--on-tertiary-fixed-variant` | `#12512C` | Muted text on tertiary fixed |
| `--error` | `#BA1A1A` (Stitch) / `#DC2626` (design tokens) | Error/destructive actions — use `#DC2626` per token seed |
| `--on-error` | `#FFFFFF` | Text on error |
| `--error-container` | `#FFDAD6` (Stitch) / `#FEE2E2` (design tokens) | Error background — use `#FEE2E2` |
| `--on-error-container` | `#93000A` | Text on error container |
| `--surface-tint` | `#006E2D` | Magic tint accent |
| `--danger-soft` | `#FFDAD6` | Overdue card bg tint (from Stitch kanban) |
| `--text` | `#1F2A21` | Alias for on-surface |
| `--text-muted` | `#3E4A3D` | Alias for on-surface-variant |
| `--bg` | `#F8FAF7` | Alias for background |
| `--border-color` | `#E3E8E3` | Original border from design.md — replaced by `--outline` / `--outline-variant` in final build |

Perubahan penting dari draft sebelumnya:
- `--surface-bright` berubah `#FFFFFF` → `#F0FDEF`
- `--primary-container` berubah `#DCFCE7` → `#00873A` (hijau gelap, bukan soft)
- `--danger-soft` mengikuti Stitch `#FFDAD6` bukan `#FEE2E2`
- `--earth-50/200` tidak langsung ada; perannya diambil oleh `surface-container-low` dan `outline-variant`
- `--on-surface-variant` (`#3E4A3D`) menggantikan `--text-muted` (`#5B6B5F`)

### Typography, spacing, radius, shadow

| Token | Value |
|-------|-------|
| Font family | Display/headings/body/button: `"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; labels/overline: `"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace` (Google Fonts, loaded via CSS; fallback = system stack) |
| Font sizes | `text-xs` 12px / `text-sm` 14px (body) / `text-base` 16px / `text-lg` 18px / `text-xl` 20px (page titles) / `text-2xl` 24px (hero/login) |
| Font weights | 400 body, 500 semibold labels (Space Mono 500), 600/700 headings |
| Font weights | 400 body, 500 semibold labels, 600/700 headings |
| Spacing scale | 4px base: 4, 8, 12, 16, 24, 32, 48 (`space-y-*` tailwind scale) |
| Radius | `sm` 6px inputs, `md` 8px buttons/cards, `lg` 12px chat bubbles/columns, `full` pills/badges/avatars |
| Shadow | `sm` `0 1px 2px rgb(0 0 0 / 0.05)` cards; `md` `0 4px 12px rgb(0 0 0 / 0.08)` floating chat widget; `lg` `0 8px 24px rgb(0 0 0 / 0.12)` modals |

## 3. Information Architecture & Routes

Public vs protected (F-01 AC-07/08): unauthenticated visits to protected routes 302 → `/login`; authenticated visits to `/login`/`/register` → `/dashboard`.

| Route | Page | Access | Source |
|-------|------|--------|--------|
| `/login` | Auth: Masuk | Public | F-01 |
| `/register` | Auth: Daftar | Public | F-01 |
| `/dashboard` | Kanban board (core demo screen) | Protected | F-06 |
| `/chat` | Dedicated chat page (full layout) | Protected | F-02 |
| `/riwayat` | Riwayat Konsultasi (history list + thread view) | Protected | F-08 |
| `/lahan` | Lahan (land cards + CRUD forms) | Protected | F-07 |
| `/profil` | Profil (profile + reminder prefs) | Protected | F-10 |
| `POST /api/chat` | SSE chat stream | Protected | F-02 |
| `POST /api/upload` | Photo upload (multipart → `plant-images`) | Protected | F-04 |
| `POST /api/tasks/update` | Task status/position/description update | Protected | F-06 |
| `POST /api/tasks/{id}/comment` | Task comment | Protected | F-06 |
| `DELETE /api/tasks/{id}` | Task delete | Protected | F-06 |
| `GET|POST /api/lands`, `PATCH|DELETE /api/lands/{id}` | Land CRUD | Protected | F-07 |
| `PATCH /api/profil` | Profile update | Protected | F-10 |
| `POST /api/cron/reminders` | Daily reminder sweep (`CRON_SECRET`) | Cron only | F-09 |

Nav model: sticky top header (fixed, h-16, `bg-surface`, border-b `outline-variant`) on protected pages — logo + "Pilih Lahan" dropdown (left), centered "Chat Tanduri" button (primary uppercase, hidden on mobile), right nav "Riwayat" + "Lahan" (uppercase text-sm font-label) + profile avatar. Active route: underline/border-b-2 + `text-primary`. Mobile: fixed bottom nav with icon+label (HOME / CHAT / RIWAYAT / LAHAN) — per Stitch `code(2)/(6)/(7)`.

## 4. Page Designs

### 4.1 Auth pages (F-01)

Dua halaman terpisah: **Register** (`screen-ui/code.html`, `code(1).html`) dan **Login** (`screen-ui/code(3).html`). Keduanya centering card `max-w-[420px] bg-surface rounded-lg shadow-sm border border-outline-variant`.

- **Header umum:** logo (w-16 h-16 rounded-lg) + "Tanduri." (text-2xl font-bold) + tagline "Solusi Tani Zaman Saiki" (text-sm text-text-muted).
- **Register — `code.html`:**
  - Fields bordered (`border-outline-variant rounded-md px-3 py-2`): Nama (opsional), Email, Kata Sandi (dengan toggle visibility — icon `visibility_off`). Semua label text-sm font-semibold.
  - Tombol "Daftar" full-width `bg-primary` putih `font-bold`.
  - Divider "atau" (garis + text mutted).
  - Tombol Google `bg-surface border border-outline-variant` + Google G SVG.
  - Link "Sudah punya akun? Masuk" (text-primary).
- **Login — `code(3).html`:**
  - Konsisten dengan register, tapi: labels uppercase 10px absolute -top-5; inputs **underline** (`border-b border-outline-variant`); tambahan link "LUPA SANDI?" (uppercase label-sm 10px).
  - Tombol "MASUK" uppercase `font-button`.
  - Link "Belum punya akun? Daftar".
- **States/errors:** "Email sudah terdaftar.", "Email atau kata sandi salah.", "Terjadi kendala saat masuk dengan Google, gunakan email dan kata sandi.", "Email sudah digunakan dengan metode lain. Masuk dengan metode sebelumnya.", "Gagal terhubung, periksa koneksi internet Anda." → inline error + toast; loading disabled submit + "Memproses..." (register) / "Masuk..." (login).

### 4.2 Dashboard — Kanban (F-06) *core demo screen* — `screen-ui/code(2).html`

- **Header:** fixed h-16 `bg-surface-container-lowest border-b border-border-color`; logo h-8 + "Pilih Lahan" (dropdown uppercase, `border-border-color rounded text-label text-sm uppercase`); center "Chat Tanduri" (uppercase font-semibold, `bg-primary text-on-primary border-2 border-primary hover:bg-surface hover:text-primary`); kanan: "Riwayat" "Lahan" + avatar (ring-border-color ring-offset). 
- **Filter bar:** sticky top-16 `bg-surface-container-lowest/90 backdrop-blur-md border-b border-border-color`; judul "Papan Tugas" (font-headline text-xl font-bold); search "Cari tugas..." (icon search absolute left-3, `pl-10`); filter chips — **"Semua Lahan"** aktif (`border-primary bg-primary text-on-primary font-label text-xs uppercase tracking-widest`) + chips per lahan (`border-border-color bg-surface-container-lowest`).
- **Kanban canvas:** `grid grid-cols-1 md:grid-cols-3 gap-6 min-w-[900px]` dalam `overflow-x-auto` (mobile = horizontal scroll).
- **Kolom:** header `border-b-2 border-border-color pb-3` — dot warna kolom (Belum Dikerjakan = `bg-error`, Sedang Dikerjakan = `bg-[#E3A334]`, Selesai = `bg-[#2E7D32]`) + judul (font-headline text-lg font-semibold) + count badge (`bg-surface-container-high px-2 py-1 rounded font-label text-xs`).
- **Task card:** `bg-surface-container-lowest border border-border-color rounded-md p-4 hover:shadow-md`;
  - *Overdue:* `bg-danger-soft border-l-4 border-l-error` + badge "Terlambat X Hari" (`bg-error/20 text-on-error-container font-label text-xs font-bold uppercase`).
  - *Sedang dikerjakan:* strip kiri `w-1 bg-[#E3A334]`; progress bar `h-1 bg-surface-container-high` + fill `bg-primary`.
  - *Selesai:* `opacity-75` + title `line-through` + icon `check_circle text-[#2E7D32]`.
  - Isi: menu "..." (more_horiz), title (font-headline text-base font-semibold line-clamp-2), deskripsi (text-sm text-on-surface-variant line-clamp-2), footer `border-t border-border-color` — tanggal (icon calendar_today + `text-error` jika overdue) + phase badge ("Olah Lahan" dll: `px-2 py-0.5 border rounded font-label text-[10px] uppercase`).
  - Aksi cepat di card "sedang dikerjakan": tombol "Tandai Selesai" (`bg-primary text-on-primary w-full py-1.5 uppercase`).
- **"Tambah Tugas" button:** dashed border full-width per kolom (`border-dashed border-border-color text-on-surface-variant hover:text-primary uppercase`).
- **Footer mobile:** fixed bottom `bg-surface-container-lowest border-t` — 4 nav icon+label (HOME/CHAT/RIWAYAT/LAHAN, `material-symbols-outlined` + label 10px font-label).
- **Empty states:** kolom kosong → placeholder "Belum ada tugas"; zero tasks → CTA "Mulai Konsultasi" ke `/chat`.

### 4.3 Chat page + widget (F-02/F-03/F-04) — `screen-ui/code(6).html`

- **Layout (dedicated `/chat`):** dua panel. Kiri (desktop): riwayat conv (search icon kiri atas, list item: judul conv + preview terpotong + waktu relatif "Hari Ini"/"Kemarin"/"21 Ags", ikon "menu_open" + trash). Kanan: header (judul, chip "Lahan: Pekarangan Belakang" + "Konsultasi Baru" button, tombol padd kiri) + thread + composer.
- **Header thread:** judul top ("Tanduri AI"), tombol edit. **Composer:** input + ikon tambah.
- **Message anatomy:**
  - *User bubble:* right-aligned `bg-primary text-on-primary rounded` (dari Stitch thread kanan).
  - *Assistant bubble:* left, teks declarative; pesan diagnosis menyertakan card.
  - *Diagnosis card (F-04) — dari Stitch:* heading "Bercak Daun Septoria", dua kotak diagnose ("Bercak Daun Septoria" tinggi / "Hawar Daun (Blight)" sedang), section "Tindakan Segera:" list numbered persis, tombol "Tanyakan" lanjut ("Bagaimana cara mencegahnya?" — berubah jadi input). Pemetaan 1:1 dari `code(6).html`.
  - *Recommendation card / Task summary:* reuse panel styling yang sama (card `bg-surface border border-outline-variant rounded-lg`).
- **Composer:** input bangun textarea (per `code(6)` composer: placeholder "Tanyakan tentang lahanmu..."), ikon attach (klip), tombol kirim.
- **Empty state:** "Selamat datang di Tanduri!" + prompt example untuk memulai.

> Catatan implementasi FE: struktur HTML dari `code(6).html` menjadi template dasar, data dinamis disuntik React. Ikon via Material Symbols Outlined (`material-symbols-outlined` class, font dibundle CDN di `<head>`). Markdown assistant tetap dirender via `react-markdown`.

### 4.4 Riwayat page (F-08) — `screen-ui/code(5).html`

- **Layout:** page title "Riwayat Konsultasi" (font-headline, besar) + search input "Cari riwayat..." (icon search absolute); daftar conversation sebagai cards (list vertikal):
  - Card: judul conv (font-semibold), tanggal+mint (e.g. "12 Okt 2023, 14:30" → format Asia/Jakarta), badge lahan ("Lahan A – Sawah Utara", `bg-surface-container-high`), preview pesan (text-sm truncated), ikon trash (delete) kanan, tombol aksi "Lanjutkan" + panah (`arrow_forward`).
- **Actions:** "Lanjutkan" → `/chat?conversation_id=X`; trash → confirm dialog "Hapus percakapan ini?"; empty → "Belum ada riwayat konsultasi" + CTA "Mulai Konsultasi".
- **Load lebih:** tombol "Muat Lebih Banyak" di bawah (pagination).

### 4.5 Lahan page (F-07) — `screen-ui/code(7).html`

- **Layout:** judul "Lahan Saya" + tombol "+ Tambah Lahan" (bg-primary text-on-primary rounded). Grid card grid.
- **Card lahan (Stitch):** `bg-surface border border-outline-variant rounded-lg p-4`:
  - Nama lahan besar ("Kebun Atap Menteng"), badge **"Aktif"** jika aktif (`bg-primary text-on-primary`).
  - Ikon location_on + text "Jakarta Pusat".
  - Dua baris informasi: **"Luas Area"** + value (e.g. "24" m²); **"Tugas Aktif"** + count badge.
  - Chip baris media: `potted_plant` icon + "Polybag", `sunny` icon + "Penuh", `water_drop` icon + "Irigasi".
  - Tiga ikon aksi: `more_horiz` → "Edit" / "Jadikan Aktif" / "Hapus" dropdown.
- **Empty:** "Belum ada lahan, tambahkan lahan pertamamu" + CTA.
- **Delete blocked if has tasks:** toast "Pindahkan atau hapus tugas lahan ini dulu".
- **Form "Tambah Lahan"/"Edit Lahan"** (modal, styling selaras auth inputs): Nama Lahan (text, ≤60, required — "Nama lahan wajib diisi"); Lokasi (text, city); Koordinat (lat/lon optional, both-or-none); Luas (m², 1–100000); Media tanam (select: Tanah, Hidroponik, Pot, Lainnya → soil/hydroponic/pot/other); Ketersediaan air (Melimpah/Terbatas → plenty/limited); Cahaya matahari (Penuh/Sebagian/Teduh → full/partial/shade); Anggaran (Rp, 0–1e12); Pengalaman (Pemula/Berpengalaman/Profesional → beginner/experienced/professional). Tombol "Simpan".
- **States:** empty → "Belum ada lahan, tambahkan lahan pertamamu" + CTA; delete blocked → toast "Pindahkan atau hapus tugas lahan ini dulu"; validation errors inline field-level (422); delete confirm "Hapus lahan ini?"; deleting active land → oldest remaining becomes active.

### 4.6 Profil page (F-10) — `screen-ui/code(4).html`

- **Layout:** judul besar "Pengaturan Profil" (text-4xl/5xl font-display font-bold uppercase) + subtitle. Grid `lg:grid-cols-12`: kolom main (8) = sections; sidebar (4) sticky = Keamanan Akun.
- **Section 01. Data Diri:** label section `font-label text-outline uppercase tracking-widest` + garis. Form avatar (w-24 h-24 rounded-full border-2, hover overlay icon photo_camera → click opens file input) + "Nama Tampilan" (input underline `border-b border-outline-variant`) + "Alamat Email" (input disabled + badge "Terverifikasi"). Tombol "Simpan Perubahan" (`bg-primary text-on-primary rounded px-8 py-3 font-label uppercase` + arrow_forward).
- **Section 02. Preferensi Pengingat:** toggle `peer-checked:bg-primary` "Aktifkan pengingat email"; select "Jam Pengingat Harian" (`border-b`, appearance-none, icon expand_more) dengan opsi preset: "Pagi (06:00 WIB)", "Pagi (07:00 WIB)" default, "Pagi (08:00 WIB)", "Sore (16:00 WIB)", "Sore (17:00 WIB)". Opsi terbatas ini → `reminder_hour` integer (6/7/8/16/17). Tombol "Simpan Preferensi".
- **Section 03. Keamanan Akun (sidebar):** card `bg-error-container p-8 border border-error/20 rounded-lg` — judul "Zona Berbahaya" (text-error, text-2xl font-headline bold), teks penjelasan, tombol "Keluar dari Akun" (border-2 border-error text-error hover:bg-error hover:text-white). Logout → `/login`.
- **Save:** per-section PATCH `/api/profil`; success toast "Perubahan tersimpan"; errors: "Nama tampilan harus 3–60 karakter", "Jam pengingat harus 0–23", "Ukuran maksimal 2 MB", "Format gambar tidak didukung", "Gagal mengunggah foto profil" (keeps old avatar), "Gagal menyimpan, periksa koneksi internet Anda".

### 4.7 Shared components

| Component | Spec |
|-----------|------|
| Toast | Bottom-center stack, `--success`/`--danger`/`--warning` variants, 4s auto-dismiss, close button, `aria-live=polite` |
| Confirmation dialog | "Hapus tugas ini?" / "Hapus lahan ini?" / "Hapus percakapan ini?" — buttons "Batal" / "Hapus" (danger); focus trapped, Esc closes, initial focus on "Batal" |
| Skeleton | `--earth-200` pulse blocks replacing cards/columns during initial load |
| Realtime banner | Top amber banner (see 4.2); offline state banner "Tidak ada koneksi internet" with retry |

## 5. Key Interaction Flows

### 5.1 Onboarding & first consultation (F-01 → F-02 → F-03 → F-05)

1. User registers/`Lanjutkan dengan Google` (F-01); trigger creates `profiles` row.
2. User lands on `/dashboard` (empty board, CTA "Mulai Konsultasi").
3. CTA opens chat widget; user picks example prompt or types question (F-02, e.g. "saya ingin mulai tanam sayur di balkon").
4. Agent extracts `land_conditions`; if no land profile exists → "Tambahkan lahanmu dulu di halaman Lahan, atau ceritakan kondisinya langsung" (F-07 AC-9); user may answer in chat or use `/lahan` form.
5. Weather Tool + Search Tool augment; recommendation card + "Apakah rencana ini sesuai?" (F-03).
6. User clicks "Sesuai" → `plan_confirmed` metadata → F-05 generates ≥5 tasks → summary card → tasks appear on Kanban via realtime (F-06).

### 5.2 Photo diagnosis (F-04)

1. User clicks attach icon in composer → file picker (jpeg/png/webp only).
2. Client compress via canvas (max 1024px, ≤5MB) → preview thumbnail shown.
3. `POST /api/upload` → stored `plant-images/{user_id}/{ts}-{slug}.jpg` → message sent with image.
4. Agent returns structured diagnosis card (symptoms, top-2 + confidence, causes, treatment, expert note, disclaimer).
5. Follow-up questions reuse stored `image_path` — no re-upload (AC-9).
6. Errors: "Format gambar tidak didukung", "Ukuran maksimal 5 MB", "Foto kurang jelas, coba foto lebih dekat dan pastikan cahaya cukup" + retry.

### 5.3 Plan confirmation → tasks → Kanban (F-03 → F-05 → F-06)

1. Chat shows "Oke, saya buatkan jadwalnya sekarang..." (F-05 AC-1).
2. `generate_tasks` tool returns ≥5 tasks (phases olah_lahan→semai→tanam→penyiraman→pemupukan→perawatan→panen; due dates clamped ≥ today Asia/Jakarta).
3. Idempotency check by `conversation_id`; batch insert (service role) into `tasks`.
4. Realtime INSERT event on `tasks-changes` channel → board renders cards within ~3s (F-06 AC-6).
5. Chat summary card lists tasks + "Cek papan Kanban di dashboard untuk mengelola jadwalmu" + "Buka Kanban" button.

### 5.4 Drag & drop state update (F-06)

1. User drags card to "Sedang Dikerjakan".
2. UI moves card immediately (optimistic); `POST /api/tasks/update` `{id, status, position}`.
3. Success → `position = max+1` in target column; realtime event echoes update (ignored/merged as idempotent).
4. Failure → card reverts to original column + toast "Gagal menyimpan perubahan, coba lagi".
5. Reorder within column → atomic RPC `update_task_positions`; rapid double-drop → last write wins.
6. Offline → drag disabled + notice (no offline queue).

### 5.5 Resume history conversation (F-08)

1. `/riwayat` lists conversations `updated_at desc` (indexed) with previews.
2. User searches "Cari riwayat..." (client-side, case-insensitive title match).
3. Click row → full thread (markdown renderer, images, badges).
4. "Lanjutkan Konsultasi" → `/chat?conversation_id=X`, thread preloaded from DB.
5. New message → `POST /api/chat` with `conversation_id` + last 20 messages `history[]` → agent continues with context.
6. Trash + confirm → cascade delete conversation+messages; tasks remain on board.

### 5.6 Email reminder journey (F-09, F-10)

1. User sets "Jam pengingat harian" + keeps email toggle on (`/profil`, F-10).
2. Vercel cron 07:00 Asia/Jakarta hits `POST /api/cron/reminders` with `CRON_SECRET` (F-09).
3. Selection: opted-in profiles, `status != 'selesai'`, `due_date = tomorrow` OR overdue.
4. Dedup via `notification_logs` UNIQUE `(user_id, task_id, type, sent_at)` → skip already-sent.
5. Resend email: subject `🌱 Pengingat Tanduri: <title>`, body greeting by `display_name`, "Jatuh tempo besok (12 Agustus 2026)" or "Sudah terlambat X hari", dashboard link, "Tim Tanduri" signature.
6. Response `{ sent: n, skipped: m }`; failures logged `email_failed`, run never aborts; re-run same day sends 0.

## 6. Data Model

```sql
-- F-01/F-10: profiles (trigger: on_auth_user_created inserts row on auth.users insert)
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar_url text,
  notification_email_preference boolean not null default true,
  reminder_hour int not null default 7 check (reminder_hour between 0 and 23),
  created_at timestamptz not null default now()
);

-- F-07: lands
create table lands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  name text not null check (char_length(name) <= 60),
  location text,
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  area_m2 numeric check (area_m2 between 1 and 100000),
  media text not null default 'soil' check (media in ('soil','hydroponic','pot','other')),
  water text not null default 'plenty' check (water in ('plenty','limited')),
  sunlight text not null default 'full' check (sunlight in ('full','partial','shade')),
  budget_idr numeric check (budget_idr between 0 and 1000000000000),
  experience text not null default 'beginner' check (experience in ('beginner','experienced','professional')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index lands_single_active on lands (user_id) where is_active; -- exactly one active land per user

-- F-02/F-08: conversations + messages
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  land_id uuid references lands(id),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_updated on conversations (user_id, updated_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  metadata jsonb not null default '{}',  -- {type:'recommendation'|'plan_confirmed'|'diagnosis', crops, image_path, weather...}
  created_at timestamptz not null default now()
);
create index messages_conv_created on messages (conversation_id, created_at);

-- F-05/F-06: tasks + task_comments
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  land_id uuid references lands(id),
  conversation_id uuid references conversations(id),
  title text not null,
  description text,
  status text not null default 'belum_dikerjakan'
    check (status in ('belum_dikerjakan','sedang_dikerjakan','selesai')),
  due_date date not null, -- Asia/Jakarta
  position int not null,
  phase text check (phase in ('olah_lahan','semai','tanam','pemupukan','penyiraman','panen','perawatan')),
  crop text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_status_due on tasks (user_id, status, due_date);
create unique index tasks_positions on tasks (user_id, land_id, status, position); -- per-scope ordering invariant

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

-- F-09: notification_logs
create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  task_id uuid not null references tasks(id) on delete cascade,
  type text not null check (type in ('email_reminder','email_failed')),
  sent_at date not null,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, type, sent_at) -- per-day idempotency
);

-- F-03: weather_cache
create table weather_cache (
  lat numeric not null,
  lon numeric not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (lat, lon)
); -- TTL 30 min, upsert by (lat, lon)
```

**Relationships:** `profiles` ← `lands`, `conversations`, `tasks`, `task_comments`, `notification_logs` (all `user_id` FK); `conversations` → `messages` (cascade); `tasks` → `task_comments` (cascade); `notification_logs.task_id` cascade (task delete), `tasks` FK to `conversation_id` is nullable + **non-cascading** — deleting a conversation never deletes tasks (F-08 AC-7).

**Triggers/index notes:**
- `on_auth_user_created` trigger on `auth.users` (after insert) → inserts `profiles (id, display_name = coalesce(raw_user_meta_data->>'full_name', email))`; reliable for email + OAuth, no race (F-01).
- Partial unique index `lands_single_active` enforces one active land per user at DB level; switching = single transaction (clear all, set target) (F-07).
- `tasks_positions` unique index keeps per-(user, land, status) ordering; renumbering atomic via RPC `update_task_positions`.

**RLS (all tables, `authenticated`):** `using (user_id = auth.uid())` on select, `with check (user_id = auth.uid())` on insert/update/delete; `messages`/`conversations` scoped via `user_id`; server writes (chat, tasks, cron) use service-role key server-side (F-01/F-02/F-05/F-06); Storage buckets `plant-images` private owner-only, `avatars` public-read (F-04/F-10).

## 7. State Management

- **Client:** React state + server components (Next.js 15 App Router); no global store library. Server components read session + initial data (tasks, lands, conversations, profile); interactivity (filters, dialogs, forms, DnD) uses local component state. React Query optional if server-state caching is needed — not required.
- **Realtime lifecycle:** per page, subscribe once to channel `tasks-changes` (`postgres_changes` on `tasks`, filter `user_id = auth.uid()`) → map INSERT/UPDATE/DELETE events onto board state; cleanup (`removeChannel`) on unmount; on reconnect, refetch board as fallback. Duplicate events after optimistic updates merged idempotently (last write wins).
- **Optimistic updates:** drag & drop applies status/position immediately, rolls back on request failure; rollback never ghosts stale rows after realtime echo.
- **Chat streaming:** SSE events append tokens to the assistant bubble; on error/empty, show fallback message + "Coba lagi"; send button disabled while streaming (no double submit).
- **Forms:** controlled inputs, field-level validation before submit, optimistic remove for deletes with confirm dialog, last-write-wins for profile/land updates.

## 8. Responsive Breakpoints

| Breakpoint | Range | Behavior |
|------------|-------|----------|
| Mobile | `<640px` | Kanban: three columns in horizontally scrollable row (swipe), full-width cards; chat: full-height single pane (composer fixed bottom, thread scrolls), conversation list as drawer; header condensed to icon buttons; forms stack single column |
| Tablet | `640–1024px` | Kanban grid up to 3 columns visible or horizontal scroll with partial peek; chat sidebar collapsible; cards 2-up on `/lahan`, `/riwayat` |
| Desktop | `>1024px` | Kanban: three equal-width columns grid; chat: fixed sidebar + main thread; `/lahan` cards 3-up; multi-column forms |

## 9. Accessibility

- **Contrast:** all text AA-compliant against `--surface`/`--bg` (checked tokens: `--text` on white ≈ 12:1, `--text-muted` ≥ 4.5:1 on white, white on `--primary` ≈ 4.6:1, `--danger` on white ≈ 4.5:1).
- **Keyboard:** full tab order on all pages; dialogs trap focus, focus returns to trigger, Esc closes; drag & drop alternative = per-card move buttons ("Pindah ke Sedang Dikerjakan", "Tandai Selesai"); visible focus ring (`ring-2 ring-primary-strong ring-offset-2`) on all interactive elements.
- **Labels & alt text:** Indonesian `aria-label`s (e.g. `aria-label="Chat Tanduri"`, `aria-label="Hapus tugas"`); `alt` on task/avatar images; status announced via `aria-live` on toasts and realtime banner; input labels always associated (`<label for>`), not placeholders-only.
- **Motion:** typing indicator and skeleton pulses respect `prefers-reduced-motion` (paused/static).

## 10. References

- `docs/PRD.md` — vision §1, features §6, NFR §7, constraints §8, glossary §9
- `docs/features/F-01-auth.md` — `profiles` schema, trigger, RLS, protected routes, auth page strings
- `docs/features/F-02-chat-konsultasi.md` — chat UI strings, SSE, `conversations`/`messages`
- `docs/features/F-03-rekomendasi-komoditas.md` — recommendation card content, `land_conditions`, `weather_cache`
- `docs/features/F-04-diagnosa-foto.md` — upload limits, diagnosis card sections, `plant-images` bucket
- `docs/features/F-05-task-generator.md` — `tasks` schema, phase/status values, `generate_tasks`
- `docs/features/F-06-kanban-dashboard.md` — board layout, columns, DnD, realtime, overdue rules
- `docs/features/F-07-multi-lahan.md` — `lands` schema, single-active index, `/lahan` UI, delete-block rule
- `docs/features/F-08-riwayat-konsultasi.md` — `/riwayat` list/thread/resume/delete, indexes
- `docs/features/F-09-email-reminder.md` — cron, `notification_logs`, email content
- `docs/features/F-10-profil-pengguna.md` — `/profil` sections, avatar bucket, validation strings
- `docs/ARCHITECTURE.md`, `docs/DECISION.md` — agent pattern, timezone, cron, storage ADRs

## 11. Design System Management (Airtable)

The operational source of truth for design values is the Airtable base **`Tanduri Design System`** (ADR-16). This file mirrors it. When they conflict, **Airtable wins** — update Airtable, then mirror here.

### 11.1 Base layout

| Table | Primary key | Purpose |
|-------|-------------|---------|
| `Tokens` | Name (text) | Single design values (colors, type scale, spacing, radius, shadow, breakpoints) |
| `Components` | Name (text) | Reusable UI primitives + page-level components with their token mapping |
| `Pages` | Name (text) | Route-level screens, their components, and the Stitch wireframe reference |

### 11.2 Field schema (create exactly these fields)

**`Tokens`:**

| Field | Type | Notes |
|-------|------|-------|
| Name | Single line text | e.g. `--primary`, `radius-md`, `space-4` |
| Type | Single select | `color`, `typography`, `spacing`, `radius`, `shadow`, `breakpoint` |
| Value | Single line text | hex / px / rem — the actual value, e.g. `#16A34A`, `8px` |
| Usage | Long text | where it applies (mirror of DESIGN.md tables) |
| Status | Single select | `active`, `draft`, `deprecated` |
| UpdatedAt | Date | last sync from DESIGN.md (auto) |

**`Components`:**

| Field | Type | Notes |
|-------|------|-------|
| Name | Single line text | `Button`, `Input`, `Dialog`, `Toast`, `Badge`, `Card`, `Skeleton`, `Avatar`, `KanbanColumn`, `TaskCard`, `MessageBubble`, `RecommendationCard`, `DiagnosisCard`… |
| Variants | Long text | e.g. Button: `primary` / `secondary` / `danger` / `danger-outline` / `ghost` |
| Spec | Long text | dimensions, padding, radius, font size, focus ring, states (hover/active/disabled) |
| Tokens | Linked record → `Tokens` | which tokens it consumes |
| Status | Single select | `active`, `draft`, `deprecated` |

**`Pages`:**

| Field | Type | Notes |
|-------|------|-------|
| Name | Single line text | `/login`, `/register`, `/dashboard`, `/chat`, `/riwayat`, `/lahan`, `/profil` |
| Description | Long text | layout summary (mirror of §4) |
| Components | Linked record → `Components` | components used on this page |
| StitchRef | URL | Stitch wireframe / design asset link (ADR-17) |
| Status | Single select | `active`, `draft`, `deprecated` |

### 11.3 Rules (binding)

1. **Airtable is the operational source of truth.** DESIGN.md §2/§4/§4.x mirror Airtable; regenerate after any Airtable change.
2. **New design value → Airtable first.** Adding a token/component not in Airtable is a review flag: add it there (and mirror here) before implementing.
3. **Do not invent values.** Missing token/component = note it in the task report, do not invent colors/radii ad hoc.
4. **Stitch output imports here.** Generated UI (ADR-17) is imported into `Pages.StitchRef` + `Components.Spec`, then mirrored into §4 page designs before any FE task starts.
5. **Sync tooling:** use the Airtable skill (curl + PAT). Setup script: `scripts/airtable/setup_design_base.sh` (creates base tables + seeds tokens from §2). Token in `~/.hermes/.env` as `AIRTABLE_API_KEY`; base ID in `AIRTABLE_BASE_ID`.

### 11.4 Setup checklist

1. Create PAT at https://airtable.com/create/tokens (scopes: `data.records:read`, `data.records:write`, `schema.bases:read`; add the target base to the token's Access list).
2. Create an empty base named `Tanduri Design System` (or let the setup script create tables into an existing base).
3. Run `bash scripts/airtable/setup_design_base.sh` with `AIRTABLE_API_KEY` + `AIRTABLE_BASE_ID` set — creates the three tables (§11.2) and seeds all tokens from §2.
4. Generate the UI with Stitch using the ready-made prompt in `docs/stitch-prompt.md` (authoritative sections, token lock, Indonesian copy, output format). Import wireframes into `Pages.StitchRef` and component specs into `Components.Spec`.

### 11.5 Seed data (initial Tokens — mirrors §2)

All rows of §2.1 (color) and §2.2 (typography/spacing/radius/shadow) plus breakpoints `mobile <640px`, `tablet 640–1024px`, `desktop >1024px` (ADR-16 initial seed; Status = `active`).
