# F-02: Consultation via Web Chat

| Field | Value |
|-------|-------|
| ID | F-02 |
| Name | Consultation via Web Chat |
| Priority (MoSCoW) | Must |
| Depends on | F-01 |
| Status | Draft |

## 1. Business Description

The user consults about planting planning in natural language (Indonesian) through a web chat widget. An agent composed of the Orchestrator + Agronomist Agent analyzes intent and responds with practical guidance — crop selection, planting steps, and care advice. Conversations are persisted so the agent can carry context across turns and sessions (see F-08). This feature is the primary interaction surface of Tanduri and the entry point for F-03 (recommendation) and F-04 (photo diagnosis).

## 2. User Stories

- As a beginner urban farmer, I want to ask questions in everyday Indonesian, so I can get answers without agricultural jargon.
- As a user, I want the assistant to remember what was already discussed, so follow-up questions stay in context.
- As a user, I want live streaming responses, so I get the first feedback quickly.
- As a user with a receding network, I want a retry option when a response fails, so I can resume without losing the message.
- As a user, I want my conversation history to be private, so only I can read my own chats.

## 3. Acceptance Criteria

1. Given an authenticated user, when they send a message (no `conversation_id`), then a new conversation is auto-created and the first user message becomes the title (truncated to 60 characters).
2. Given an authenticated user, when they send a message with `conversation_id`, then the message and assistant reply are appended to that conversation.
3. Given a user message, when the agent starts replying, then the client displays streamed partial tokens (SSE, `text/event-stream`) and a typing indicator "Sedang menulis...".
4. Given the response stream, when it completes successfully, then the full assistant message is persisted and rendered as markdown in the chat UI.
5. Given the response stream, when it fails (API key missing, 429 rate limit, or network timeout > 20 s), then the stream aborts and the client shows a friendly Indonesian error and a "Coba lagi" retry button; the server logs the error server-side.
6. Given an empty agent response, when the stream finishes, then the fallback message "Layanan AI sedang tidak tersedia, coba lagi nanti" is shown and persisted as the assistant message.
7. Given any chat API call, when it is unauthenticated, then the server returns 401 and no data is persisted or returned.
8. Given persisted messages, then RLS restricts select/insert to `user_id = auth.uid()` only.
9. Given a message referencing the user's land, when `land_id` is passed, then the agent can ground context on that land profile (see F-07).
10. Given a complex question (weather or external facts needed), when the Orchestrator delegates to the Agronomist, then the Weather Tool (OpenWeatherMap) and Search Tool (google_search grounding) run and their output/metadata is stored in the message `metadata` column.

## 4. Data Requirements

Tables (Supabase Postgres):

- `conversations(id uuid pk default gen_random_uuid(), user_id uuid not null, land_id uuid nullable, title text not null, created_at timestamptz default now(), updated_at timestamptz default now())`
  - `user_id` FK → `profiles(id)`; `land_id` FK → `lands(id)` nullable.
  - `updated_at` bumped on every new message.
- `messages(id uuid pk default gen_random_uuid(), conversation_id uuid not null, role text check (role in ('user','assistant')), content text not null, metadata jsonb default '{}', created_at timestamptz default now())`
  - `metadata` holds tool calls, weather data (current weather + 5-day forecast), and search sources.

RLS: on both tables, for `authenticated` role — `USING (user_id = auth.uid())` for select, `WITH CHECK (user_id = auth.uid())` for insert/update. Writes go through the API route with the service-role key; reads happen client-side with the user's key plus RLS.

## 5. Integration

- **Frontend:** Next.js 15 App Router. Chat widget on `/dashboard` and a dedicated `/chat` page. UI text in Indonesian: input placeholder "Tanyakan tentang lahanmu..."; typing indicator "Sedang menulis..."; send button "Kirim"; empty state example prompts — "Recommended plants for a 10 m² plot in Semarang", "My chili plants are wilting, why?", "Create a weekly care schedule".
- **Endpoint:** `POST /api/chat` — body `{ conversation_id?, land_id?, message, history[] }`; respond SSE `text/event-stream` while Gemini streams tokens.
- **Agent:** Orchestrator analyzes intent → delegates to Agronomist Agent (crop planning / care questions); Agronomist calls Weather Tool (OpenWeatherMap) and Search Tool (google_search grounding). Model `gemini-2.5-flash`, default via env `GEMINI_MODEL`.
- **Persistence:** service-role, server-side only (see §6).

## 6. Technical Constraints

- `@google/genai` SDK (Gemini) with streaming; `GEMINI_API_KEY` and other keys server-side only, never in the client.
- All chat routes require an authenticated session (Supabase Auth, F-01); per-route auth check before anything else.
- Streaming client reads SSE; on error/timeout aborts and shows retry.
- Network timeout 20 s on the Gemini stream.
- NFR-01 latency: single response ≤ 8 s; complex multi-tool flow (weather + search) ≤ 15 s.
- Free tiers only: Vercel, Supabase, OpenWeatherMap, Gemini AI Studio.

## 7. Edge Cases & Error Handling

| Case | Behavior |
|------|----------|
| Missing `GEMINI_API_KEY` | Log server-side; Indonesian message "Layanan AI sedang tidak tersedia, coba lagi nanti" |
| Rate limit (429) | Same friendly message, log server-side, client retry "Coba lagi" |
| Network timeout (> 20 s) | Abort stream, show error, retry |
| Empty Gemini response | Fallback message "Layanan AI sedang tidak tersedia, coba lagi nanti" |
| Unauthenticated request | 401, no persistence |
| Empty `message` body | 400, client keeps message in the input — never cleared |
| Oversize `history` | Trim to the last 20 messages before sending to Gemini |
| Duplicate tab / double submit | Button disabled during streaming request |

## 8. Definition of Done

- Message round-trip works with SSE streaming on staging/prod.
- Conversation and messages persisted; `history` sent back as context on subsequent turns.
- Title auto-generated from first message (≤ 60 chars).
- RLS verified (user cannot read/insert another user's rows).
- UI text fully Indonesian.
- Latency check passes: single response ≤ 8 s, multi-tool ≤ 15 s.
- F-02 spec reflects built behavior (no drift between DOC/CODE).

## 9. References

- PRD: `docs/PRD.md` — §6 F-02, §9 Glossary, NFR-01/04/09
- Structure: `docs/ARCHITECTURE.md`, `docs/DECISION.md` (ADR-01 ADK pattern), `docs/DESIGN.md`
- F-01 Auth (dependency), F-03 Recommendation, F-04 Photo Diagnosis, F-08 History
- Supabase: conversations / messages RLS pattern (`user_id = auth.uid()`)