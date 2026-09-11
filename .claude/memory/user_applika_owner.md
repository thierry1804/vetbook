---
name: user-applika-owner
description: "Who the user is on the App'lika (formerly VetBook) project — solo developer, French speaker, comfortable delegating technical/design decisions."
metadata:
  node_type: memory
  type: user
---

Solo developer building App'lika (renamed from VetBook on 2026-09-11 — see [[project_renamed_to_applika]]), a French-language PWA "carnet de santé" (health record) app for pet owners — vaccines, deworming, weight, consultations, reminders, vet directory. Vanilla JS/HTML/CSS, no framework, deliberately (see [[project_frontend_redesign]] for why that's not being changed).

- Communicates in French; project content, commit messages, and UI copy are all French. Reply in French.
- Comfortable letting the assistant make and execute technical/architectural decisions autonomously (dead dependency removal, schema design, refactors) without asking approval on every sub-step — see [[feedback_scope_preference]] for the pattern of picking the most thorough option when asked.
- **Backend is Neon (Postgres) + a small Vercel serverless API (`api/`), not Supabase** (migrated 2026-09-10) — see [[project_backend_migrated_to_neon]]. Cloud sync, magic-link auth, and Web Push all go through this custom API now.
- Note: this file lives in the repo itself (`.claude/memory/`, committed to git) rather than only in a host-local memory store — useful since this project has been worked on from more than one working-directory path/machine. Keep it in sync with the host-local memory when either one changes.
