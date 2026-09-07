---
name: user-vetbook-owner
description: "Who the user is on the VetBook project — solo developer, French speaker, comfortable delegating technical/design decisions."
metadata: 
  node_type: memory
  type: user
  originSessionId: 8961cc69-88ef-4caa-bbd5-d20774894ccf
  modified: 2026-08-31T20:03:38.619Z
---

Solo developer building VetBook, a French-language PWA "carnet de santé" (health record) app for pet owners — vaccines, deworming, weight, consultations, reminders, vet directory. Vanilla JS/HTML/CSS, no framework, deliberately (see [[project_frontend_redesign]] for why that's not being changed).

- Communicates in French; project content, commit messages, and UI copy are all French. Reply in French.
- Comfortable letting the assistant make and execute technical/architectural decisions autonomously (dead dependency removal, schema design, refactors) without asking approval on every sub-step — see [[feedback_scope_preference]] for the pattern of picking the most thorough option when asked.
- Has a working Supabase project wired up for optional cloud sync (Phase B of a larger plan — auth, manual+automatic push/pull, RLS schema in `supabase/schema.sql`). Phase C (real Web Push notifications) was scoped but not started as of 2026-08-31.
- Explicitly asked once for a commit message with no mention of Anthropic/Claude — treat that as a standing preference for this repo's commits unless told otherwise, i.e. omit the usual Co-Authored-By trailer here.
