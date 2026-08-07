# Stitch UI — Design Prompt & Best Practices

How to feed `docs/DESIGN.md` into Stitch UI to generate the Tanduri design kit. Works with any AI design tool that accepts a markdown attachment + prompt (Stitch UI, v0, Lovable, etc.).

## What to attach

Attach **the whole `docs/DESIGN.md` file**, but the prompt MUST tell the tool which sections are authoritative and which to ignore:

- **READ (authoritative):** §1 Design Principles, §2 Design Tokens (exact hex values — do not invent), §3 Information Architecture & Routes (route table only), §4 Page Designs (4.1–4.6), §8 Responsive Breakpoints, §9 Accessibility.
- **IGNORE:** §5 Interaction Flows (backend behavior, not visual), §6 Data Model (database schema — not for UI), §7 State Management (implementation detail), §10 References, §11 Airtable management.

## The prompt (copy-paste)

```
You are the UI/UX designer for Tanduri, an AI-powered personal planting assistant
web app (Indonesian market). Use the attached DESIGN.md as the single source of
truth.

AUTHORITATIVE SECTIONS: §1, §2, §3 (routes), §4, §8, §9.
IGNORE SECTIONS: §5, §6, §7, §10, §11.

RULES:
1. Use the exact design tokens from §2 — colors, type scale, spacing, radius,
   shadows, breakpoints. Never invent or substitute values.
2. UI copy MUST be Indonesian, verbatim from §4 (buttons, placeholders, empty
   states, errors). Do not translate to English.
3. Mobile-first: design at 375px first, then 768px, then 1280px. Follow §8
   breakpoint behavior exactly (Kanban = horizontal scroll on mobile, chat =
   full-height single pane with fixed composer, etc.).
4. Generate these pages as separate frames: /login, /register, /dashboard
   (Kanban board — the core demo screen), /chat, /riwayat, /lahan, /profil.
5. For each page include ALL states from §4: default, empty, loading (skeleton),
   error (Indonesian message), and responsive variant.
6. Generate the reusable component set (from §4.7 + page specs):
   Button, Input, Select, Card, Dialog, Toast, Badge, Skeleton, Avatar,
   Header (with land switcher + "Chat Tanduri" button), KanbanColumn,
   TaskCard (with phase badge, due date, overdue "Terlambat X hari" state),
   MessageBubble (user/assistant), RecommendationCard, DiagnosisCard,
   TaskSummaryCard, ConversationCard, LandCard, ProfileCard, EmptyState.
7. Accessibility (§9): visible focus rings, AA contrast, keyboard fallbacks
   (move buttons for drag & drop), aria-labels in Indonesian.
8. Deliver per component: name, variants, spec (padding, radius, font size,
   tokens used), and per page: wireframe + component mapping.
9. Output format: organized by page, then components; include the exact token
   names used per element so they can be mirrored back into
   docs/DESIGN.md §4 and Airtable (Pages.StitchRef, Components.Spec).
```

## Best practices

1. **One source of truth.** Attach DESIGN.md once; never paste token values into the prompt separately (drift risk). The prompt references sections instead.
2. **Lock the palette.** The green/earth palette (§2) is the brand; explicitly forbid inventing colors. Stitch will otherwise "improve" it.
3. **Indonesian copy is binding.** Agent-rendered chat content is Indonesian too — keep voice consistent: helpful, calm, farm-friendly ("Solusi Tani Zaman Saiki").
4. **Kanban is the hero.** §4.2 is the demo screen for the competition — ask for it first / highest fidelity. Overdue card state (`Terlambat X hari`, red border + `--danger-soft`) is a demo talking point — must be visible.
5. **Mobile-first output.** Demo may run on a laptop, but judges check phones — require both breakpoints per page.
6. **Component inventory over decoration.** The team reuses primitives (T-005); ask for components, not one-off layouts.
7. **Import back:** after generation, put the wireframe/design link into Airtable `Pages.StitchRef` + `Components.Spec` (DESIGN.md §11.4, ADR-16), then mirror any new values into DESIGN.md §4 before FE tasks start (ADR-17).
8. **Iterate in rounds:** round 1 = tokens + components + dashboard; round 2 = chat + auth; round 3 = secondary pages. Avoid one-shot generation of 7 pages.
