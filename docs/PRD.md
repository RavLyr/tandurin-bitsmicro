# PRD — Tanduri: Personal Planting Assistant

| Field | Value |
|-------|-------|
| Product | Tanduri |
| Tagline | Solusi Tani Zaman Saiki |
| Competition | Bitsmikro Innovative Vibecode 2026 |
| Team | Satria Firm Vibers — Universitas Diponegoro |
| Members | Rakyan Bhumi Nagari (Ketua), Muhammad Yusuf Sintara, Ravly Bonus Ramdhani |
| Status | Draft (build phase: Day 1–3) |
| Language | English (UI is Indonesian) |

## 1. Vision

Tanduri is an interactive AI Agent agriculture platform (Personal Planting Assistant) powered by LLM and Agentic AI. It analyzes the user's micro-conditions (geographic location, land area, growing media, water availability, sunlight, budget) to deliver precise, personal crop recommendations and step-by-step care guidance, and converts agreed plans into trackable daily tasks on a Kanban dashboard.

## 2. Problem Statement

- 67% of beginner gardeners call themselves "plant killers"; average person fails 5–7 plants before raising one successfully (OnePoll/Miracle-Gro).
- 48% of failures caused by overwatering, 37% by improper lighting (OnePoll).
- Urban Indonesian interest in gardening exceeds 50%, but long-term adoption is below 15% (IPB University study).
- 52% of local gardeners are blocked by lack of daily technical knowledge; most cannot diagnose pests/diseases early.
- Existing online information is generic, fragmented, and impractical.

## 3. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Reduce beginner failure rate | ≥ 1 successful care plan generated per consultation |
| Provide precise recommendations | User confirms generated plan in ≥ 80% of consultation sessions |
| Actionable output | Every confirmed plan produces ≥ 3 Kanban tasks |
| Demo readiness | All Must features live and demonstrable on production URL by deadline |
| Performance | Single chat response ≤ 8s; complex multi-tool responses ≤ 15s |

## 4. Target Users & Personas

### Persona 1 — Beginner / Urban Farmer (primary)
- **Who:** Urban resident, limited yard/pot space, no agricultural background.
- **Needs:** Easy-to-understand language, practical daily steps, failure prevention for small-scale growing.
- **Pain points:** Overwatering, lighting mistakes, panic when plant looks sick.

### Persona 2 — Professional Farmer
- **Who:** Commercial farmer / agribusiness managing medium-to-large land.
- **Needs:** Agronomic analysis, cost allocation efficiency (fertilizer, water, labor), harvest projection, climate risk mitigation.
- **Pain points:** Data-driven decisions, crop failure from weather anomalies.

## 5. Scope

### In scope (this build)
Full-featured web application per proposal: web chat consultation, crop recommendation, photo diagnosis, task generation, Kanban dashboard with realtime sync, multi-land profiles, consultation history, email reminders, Supabase auth.

### Out of scope (documented for later, per proposal suggestions)
- Web push notifications / in-app push
- IoT sensor integration
- Native mobile app
- E-commerce ecosystem
- LLM fine-tuning & RAG knowledge base

## 6. Features Overview

| ID | Feature | Priority (MoSCoW) | Depends on | Spec |
|----|---------|-------------------|------------|------|
| F-01 | Authentication (email/password + Google OAuth) | Must | — | `docs/features/F-01-auth.md` |
| F-02 | Consultation via Web Chat | Must | F-01 | `docs/features/F-02-chat-konsultasi.md` |
| F-03 | Crop Recommendation (micro-condition analysis) | Must | F-02 | `docs/features/F-03-rekomendasi-komoditas.md` |
| F-04 | Photo Diagnosis (multimodal vision) | Must | F-02 | `docs/features/F-04-diagnosa-foto.md` |
| F-05 | Task Generator (plan → tasks with deadlines) | Must | F-03 | `docs/features/F-05-task-generator.md` |
| F-06 | Kanban Dashboard (realtime task board) | Must | F-01, F-05 | `docs/features/F-06-kanban-dashboard.md` |
| F-07 | Multi-Land Profiles | Should | F-01 | `docs/features/F-07-multi-lahan.md` |
| F-08 | Consultation History | Should | F-02 | `docs/features/F-08-riwayat-konsultasi.md` |
| F-09 | Email Reminders (cron, deadline-based) | Should | F-06 | `docs/features/F-09-email-reminder.md` |
| F-10 | User Profile | Should | F-01 | `docs/features/F-10-profil-pengguna.md` |

**Build order note (3-day deadline):** Must features are the demo core. Should features are scheduled after Must features are functional. See `docs/TASK.md`.

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Chat response ≤ 8s; complex multi-agent flow (weather + search) ≤ 15s |
| NFR-02 | Availability | Always-on via serverless hosting; no manual server management |
| NFR-03 | Scalability | Stateless backend; stable under user spikes |
| NFR-04 | Security | HTTPS everywhere; API credentials in env vars (encrypted); Supabase Row Level Security (RLS) on all tables |
| NFR-05 | Usability | Responsive, mobile-friendly UI |
| NFR-06 | Reliability | Supabase = single source of truth; chat and Kanban stay in sync in real time |
| NFR-07 | Maintainability | Agent domain separation via Orchestrator + Sub-Agents pattern; features modular |
| NFR-08 | Portability | Tool calling (weather, search, task gen) decoupled from agent core |
| NFR-09 | Cost | Free tier only: Vercel, Supabase, Render (if used), OpenWeatherMap, Gemini AI Studio, Resend |

## 8. Constraints

- **Deadline:** 3 days — build + live demo required.
- **Budget:** Free tiers only.
- **API keys:** Not yet created — setup instructions in feature specs + `docs/ARCHITECTURE.md`.
- **Language:** UI text in Indonesian; code comments/identifiers in English; docs in English.
- **LLM:** Gemini (AI Studio free tier) via `@google/genai` SDK in Next.js API routes, following the Google ADK multi-agent pattern (Orchestrator → Sub-Agents → Tools). See `docs/DECISION.md` ADR-01.
- **Timezone:** Asia/Jakarta for all task deadlines and reminders.

## 9. Glossary

| Term | Definition |
|------|------------|
| Tanduri | The product: Personal Planting Assistant web platform |
| Agent | LLM-powered unit that reasons and calls tools |
| Orchestrator Agent | Root agent; analyzes intent, delegates to sub-agents |
| Agronomist Agent | Sub-agent; land analysis, crop recommendation, photo diagnosis |
| Vision Agent | Sub-agent; multimodal photo diagnosis (part of Agronomist in this build) |
| Task Planner Agent | Sub-agent; converts agreed plan into structured tasks |
| Tool | External capability (weather API, search, task generator) callable by an agent |
| ADK Pattern | Google Agent Development Kit architectural pattern; in this build implemented via Gemini SDK JS (see DECISION.md ADR-01) |
| Kanban | Task board with columns: Belum Dikerjakan / Sedang Dikerjakan / Selesai |
| Lahan | Land profile: location, area, media, water, sunlight, budget |
| Task | Actionable step with title, description, deadline, status, order |
| Supabase | BaaS: Postgres, Auth, Storage, Realtime |
| RLS | Row Level Security — Postgres per-row access policy |
| Realtime | Supabase realtime subscription pushing DB changes to clients |
| Gemini SDK | `@google/genai` JavaScript SDK for Gemini API |

## 10. References

- Source proposal: `proposal.docx.pdf` (project root)
- `docs/DESIGN.md` — UI/UX, user flows, data model
- `docs/ARCHITECTURE.md` — system design, agent hierarchy, deployment
- `docs/TASK.md` — executable task breakdown (agent-ready, handsoff)
- `docs/DECISION.md` — ADR-01..15 decisions
- `docs/features/F-*.md` — per-feature specifications (contract for TASK.md)
