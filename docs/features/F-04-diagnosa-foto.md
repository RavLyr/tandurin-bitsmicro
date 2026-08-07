# F-04: Photo Diagnosis (multimodal vision)

| Field | Value |
|-------|-------|
| ID | F-04 |
| Name | Photo Diagnosis (multimodal vision) |
| Priority (MoSCoW) | Must |
| Depends on | F-02 |
| Status | Draft |

## 1. Business Description

A beginner gardener who notices a sick plant usually cannot name the disease or pest. Generic online advice is fragmented and often wrong for the plant's actual symptoms. F-04 lets the user upload a photo of the sick plant/leaf directly in the chat (F-02). The Vision Agent — implemented within the Agronomist Agent for this build (see `docs/DECISION.md` ADR-01) — inspects the image with Gemini multimodal input and returns a diagnosis in Indonesian: visible symptoms, top-2 likely diagnoses with confidence level, causes, step-by-step beginner-friendly treatment, and prevention. The feature converts panic into an actionable answer, aligning with the PRD goal of reducing beginner failure rates.

## 2. User Stories

- **US-04-01:** As a beginner gardener, I want to upload a photo of my sick plant in chat so I can learn what is wrong with it.
- **US-04-02:** As a user, I want the diagnosis written in simple Indonesian with confidence levels so I know how sure the AI is.
- **US-04-03:** As a user, I want step-by-step treatment instructions so I can act immediately without prior knowledge.
- **US-04-04:** As a user, I want to ask follow-up questions about the same photo without re-uploading it.
- **US-04-05:** As a user, I want to know when I must consult a real expert instead of relying on the AI.
- **US-04-06:** As a user, I want my diagnosis history kept private so only I can see it.

## 3. Acceptance Criteria

1. User can attach an image to a chat message via `POST /api/upload` (multipart) and sees a client-side preview before upload.
2. Accepted types: `image/jpeg`, `image/png`, `image/webp`; max size 5 MB; images are compressed client-side (canvas, max dimension 1024 px) before upload.
3. Uploaded image is stored in Supabase Storage bucket `plant-images` under path `{user_id}/{timestamp}-{slug}.jpg`; only authenticated users can upload.
4. Bucket is private and RLS-verified: an authenticated user can only read/delete their own images (policy: owner only).
5. Diagnosis request passes the image to Gemini (`gemini-2.5-flash`) as an inline image data part (base64 via signed URL or server-side fetch) in `generateContent`.
6. Reply is stored as an assistant message with `metadata: { type: 'diagnosis', image_path, mime_type }`.
7. Reply contains structured sections: (1) visible symptoms, (2) top-2 likely diagnoses with confidence (tinggi/sedang/rendah), (3) causes, (4) step-by-step treatment in Indonesian for beginners, (5) when to consult an expert, pesticides only as last resort.
8. Reply contains a disclaimer: diagnosis is not medical-grade certainty.
9. Follow-up messages in the same conversation reuse the image context (server re-sends image data; user does not re-upload).
10. Error cases produce Indonesian messages (see §7) and do not crash the chat.

## 4. Data Requirements

- **Storage:** Supabase Storage bucket `plant-images` — private; policy: authenticated users upload; owner-only read/delete.
- **Path convention:** `{user_id}/{timestamp}-{slug}.jpg`.
- **messages table (F-02):** assistant reply carries `metadata = { type: 'diagnosis', image_path, mime_type }`.
- **Retention:** images are kept with the conversation; deletion with conversation is out of scope (retention kept).
- **No PII:** images are not sent to third parties other than Gemini for diagnosis.

## 5. Integration

- **F-02 Chat:** upload endpoint and diagnosis reply extend the existing chat flow; follow-ups reuse stored `image_path`.
- **Gemini API:** `@google/genai` SDK, `gemini-2.5-flash` (multimodal), `generateContent` with inline image part + system prompt (§6).
- **Supabase Storage:** SDK upload with auth; signed URL or server-side fetch for image retrieval.
- **Agronomist Agent (ADR-01):** hosts Vision Agent logic in this build.

## 6. Technical Constraints

- **Prompt contract (system prompt, must be implemented verbatim in intent):** instruct the model to:
  1. Describe visible symptoms from the photo.
  2. Give top-2 likely diagnoses, each with confidence level (tinggi / sedang / rendah).
  3. List likely causes.
  4. Provide step-by-step treatment in Indonesian suitable for beginners.
  5. State when to consult an expert; recommend pesticides only as last resort.
  6. Never give medical-grade certainty — include a disclaimer that this is an AI estimate, not a laboratory diagnosis.
- **Model:** `gemini-2.5-flash` only (free tier, supports image input).
- **Upload:** max 5 MB; `image/jpeg`, `image/png`, `image/webp`; client-side compression via canvas (max 1024 px) before upload.
- **Cost/performance:** diagnosis within NFR-01 chat budget (≤ 8 s); reuse one upload per diagnosis (no duplicate uploads).
- **Privacy/security:** private bucket + RLS; no image data in client logs.

## 7. Edge Cases & Error Handling

| Case | Handling |
|------|----------|
| Unsupported file type | Reject before upload; show "Format gambar tidak didukung" |
| File > 5 MB | Reject before upload; show "Ukuran maksimal 5 MB" |
| Compression reduces below readable quality | Accept; low-quality guard covers this (next row) |
| Empty / low-quality / blurry image | Friendly message: "Foto kurang jelas, coba foto lebih dekat dan pastikan cahaya cukup" |
| Vision API failure (timeout/error) | Friendly error + retry button; chat remains usable |
| Signed URL expired during retrieval | Regenerate signed URL server-side and retry once |
| Unauthenticated upload attempt | 401; no upload allowed |
| Model returns no diagnosis | Reply asks user to resend with better photo/lighting |
| Follow-up without re-upload | Server re-sends stored image data; never requires re-upload |

## 8. Definition of Done

1. Upload works end-to-end: preview → compress → upload → stored in `plant-images` under correct path.
2. Bucket verified private with RLS: users can only access their own images.
3. Diagnosis reply produced with structured sections (symptoms, top-2 diagnoses + confidence, causes, treatment, prevention, expert guidance, disclaimer).
4. Image context reused in follow-up messages without re-upload.
5. All error paths in §7 tested and returning correct Indonesian messages.
6. Demo-ready: photo upload + diagnosis demonstrated live on production URL.

## 9. References

- PRD: `docs/PRD.md` (feature table, glossary — Vision Agent, Agronomist Agent)
- Architecture: `docs/ARCHITECTURE.md`
- Decisions: `docs/DECISION.md` (ADR-01 — agent pattern, Vision Agent within Agronomist)
- Base feature: `docs/features/F-02-chat-konsultasi.md`
- Design/data model: `docs/DESIGN.md`
