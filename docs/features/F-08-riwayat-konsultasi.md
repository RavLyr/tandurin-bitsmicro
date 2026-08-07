# F-08: Consultation History

| Field | Value |
|-------|-------|
| ID | F-08 |
| Name | Consultation History |
| Priority (MoSCoW) | Should |
| Depends on | F-02 |
| Status | Draft |

## 1. Business Description

The user reviews past consultation conversations and resumes them with full context, so follow-up chats stay contextual (proposal requirement: "riwayat konsultasi ... percakapan selanjutnya lebih kontekstual"). The `/riwayat` page (Indonesian UI) lists all past conversations with title, land name (if linked), date, message count, and last message preview. The user can search by title, open a conversation to read the full thread, continue it via a "Lanjutkan Konsultasi" button (preloaded conversation), or delete it. This feature reinforces F-02's persistence promise: the agent remembers prior sessions, making every follow-up richer than a cold start.

## 2. User Stories

- As a user, I want to see a list of my past conversations, so I can find a previous consultation quickly.
- As a user, I want to search my history by title, so I can locate a specific conversation without scrolling.
- As a user, I want to open a past conversation and read the full message thread, so I can recall what was discussed.
- As a user, I want to continue a past conversation with full context, so follow-up questions make sense to the agent.
- As a user, I want to delete a conversation, so I can clean up history I no longer need.
- As a user, I want my history to be private, so only I can see my own conversations.

## 3. Acceptance Criteria

1. Given an authenticated user on `/riwayat`, then a list of their conversations is shown ordered by `updated_at desc`, each with title, land name (if linked), date, message count, and last message preview.
2. Given a search input, when the user types a query, then the list filters by title (client-side over the loaded list, case-insensitive substring match).
3. Given a conversation row, when the user clicks it, then the full message thread opens in a conversation view; user messages and assistant messages are rendered with the same markdown renderer used in the chat (F-02), including images from photo diagnosis (F-04) and optional metadata badges (rekomendasi/diagnosis).
4. Given an open conversation, when the user clicks "Lanjutkan Konsultasi", then the chat opens with that `conversation_id` preloaded: all messages are rendered from the DB first, and new messages append to the same conversation.
5. Given a resumed conversation, when the user sends a message, then `POST /api/chat` is called with `conversation_id` and a `history[]` array containing the last 20 messages as context (per F-02).
6. Given a conversation, when the user clicks the trash icon and confirms, then the conversation and all its messages are deleted (cascade) and the conversation disappears from the history list.
7. Given a deleted conversation, then tasks created from that conversation are NOT deleted — tasks are independent work items, and removing chat history must not affect the Kanban board (F-06).
8. Given an authenticated user, then RLS restricts history reads to `user_id = auth.uid()` only.
9. Given an unauthenticated visit to `/riwayat`, then the user is redirected to login (F-01).

## 4. Data Requirements

Same tables as F-02 — reference `docs/features/F-02-chat-konsultasi.md` §4:

- `conversations(id, user_id, land_id nullable, title, created_at, updated_at)` — history list source.
- `messages(id, conversation_id, role, content, metadata, created_at)` — thread content and preview.

History list query: `select conversations where user_id = auth.uid() order by updated_at desc`, with `count(*)` of messages and last message content via lateral join.

Performance note: index `conversations(user_id, updated_at desc)` for the list query; index `messages(conversation_id, created_at)` for thread loads and the lateral join.

RLS: same as F-02 — select/insert restricted to `user_id = auth.uid()`.

## 5. Integration

- **Frontend:** Next.js 15 App Router. Page `/riwayat`; conversation view and delete UI on the same page or a sub-route. UI text Indonesian: page title "Riwayat Konsultasi"; search placeholder "Cari riwayat..."; button "Lanjutkan Konsultasi"; delete confirmation dialog; empty state "Belum ada riwayat konsultasi"; not-found message "Percakapan tidak ditemukan".
- **Endpoint:** `POST /api/chat` (per F-02) — resumed sessions pass `conversation_id` + `history[]` (last 20 messages) so the agent continues with full context.
- **Persistence:** server-side with service-role key on writes; client-side reads with user key + RLS (same split as F-02 §5).
- **Context resume:** server loads the last 20 messages as `history[]`; if the conversation is older than that window, the agent may summarize older messages itself only if needed (no extra tool call required).

## 6. Technical Constraints

- Read path goes through Supabase client with RLS; never expose another user's conversations.
- Delete uses server-side route (service-role) or RLS-guarded delete; cascade delete on `messages.conversation_id` FK (`ON DELETE CASCADE`).
- `history[]` capped at 20 messages for Gemini context (F-02 §7).
- History list must not fetch full threads — only metadata + count + last message (lateral join), to keep the page fast on the free tier.
- Same latency/NFR-01 constraints as F-02 for resumed chats.

## 7. Edge Cases & Error Handling

| Case | Behavior |
|------|----------|
| Conversation not found (deleted or owned by another user) | 404 page/message "Percakapan tidak ditemukan"; no data leak |
| No conversations yet | Empty state "Belum ada riwayat konsultasi" with a CTA to start a new chat |
| Conversation with no messages | Shown in list (0 messages, no preview); "Lanjutkan Konsultasi" opens empty chat |
| Delete in progress | Confirm dialog first; disable button during request; optimistic removal on success |
| Deleted conversation still open in another tab | Chat returns "Percakapan tidak ditemukan" and stops persisting |
| Tasks linked to a deleted conversation | Tasks remain untouched (F-06); documented as independent work items |
| Long title | Title truncated (≤ 60 chars, F-02) in list and preview |
| Unauthenticated access | Redirect to login (F-01) |

## 8. Definition of Done

- History list works: conversations ordered by `updated_at desc` with title, land name, date, message count, and last message preview.
- Open conversation works: full thread rendered with chat markdown renderer, images, and metadata badges.
- Resume works: "Lanjutkan Konsultasi" preloads `conversation_id` with all messages rendered from DB; new messages append; last 20 messages sent as `history[]`.
- Delete works: cascade delete removes conversation + messages; tasks from that conversation survive.
- Search works: title search filters the list.
- Empty state correct: "Belum ada riwayat konsultasi" for new users.
- RLS verified: no user can read or delete another user's conversations.
- UI text fully Indonesian; F-08 spec reflects built behavior (no drift between DOC/CODE).

## 9. References

- PRD: `docs/PRD.md` — §6 F-08, §9 Glossary, NFR-01/04/09
- F-02 (dependency): `docs/features/F-02-chat-konsultasi.md` — §4 tables, §5 endpoint, §7 edge cases
- F-04: `docs/features/F-04-diagnosa-foto.md` — images in threads
- F-07: `docs/features/F-07-multi-lahan.md` — land name display
- F-06: `docs/features/F-06-kanban-dashboard.md` — task independence on conversation delete
- Proposal: "riwayat konsultasi ... percakapan selanjutnya lebih kontekstual" (proposal.docx.pdf)
