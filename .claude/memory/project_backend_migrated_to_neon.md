---
name: project-backend-migrated-to-neon
description: "VetBook's cloud backend: Supabase → Neon+Vercel → Neon + self-hosted VPS (Express). Current architecture and what changed each pivot."
metadata:
  node_type: memory
  type: project
---

Two backend pivots happened in the same session (2026-09-10): Supabase → Neon+Vercel, then Neon+Vercel → **Neon + a self-hosted VPS running Express** (user: "oublie vercel car ce sera sur un VPS"). This describes the CURRENT (VPS) architecture.

**Current architecture:**
- `server.js` (root) — Express entry point. Serves static files from `dist/` (or project root if unbuilt), mounts every `api/*.js` handler via `app.all(path, handler)`.
- `api/*.js` handlers are **unchanged from the Vercel era** — their `(req, res)` / `res.status().json()` signature is Express-compatible as-is, zero rewrite needed.
- `api/_lib/reminders.js` — daily reminders logic, extracted from the old Vercel-Cron HTTP handler into a plain `runReminders()` export.
- `scripts/send-reminders.mjs` — CLI wrapper for the VPS's system crontab (`0 8 * * * node scripts/send-reminders.mjs`), not an HTTP endpoint anymore (more secure — no auth-bypass surface exposed).
- `scripts/apply-schema.mjs` — permanent utility (`npm run apply-schema`) to (re-)apply `db/schema.sql`, idempotent.
- New deps: `express`, `dotenv`, `undici` (only used by `apply-schema.mjs` for an optional IPv4-forcing fix, see below).
- Deleted: `vercel.json`, `api/cron/`.
- Env vars now via `.env` (dotenv) instead of a platform dashboard: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, VAPID keys, `PORT`, `APP_URL`, `DB_FORCE_IPV4` — see README's VPS section (includes a systemd unit example + reverse-proxy/HTTPS note).

**What stayed the same both pivots:** `window.cloudSync` public API untouched, app-level `user_id` scoping (no RLS), `db/schema.sql` itself.

**Verified 2026-09-10:** full round trip against the real Neon DB through a real running `server.js` — push/pull/subscription/dog-events-pref endpoints all correct (including Jalon A/C fields). `scripts/send-reminders.mjs` runs cleanly against the real DB. Not verified: real email delivery, reverse-proxy/HTTPS setup, crontab actually firing (needs the user's real VPS).

**`DB_FORCE_IPV4`**: opt-in env var added because the dev sandbox used for this work has no outbound IPv6 route (Node hangs on IPv6 before falling back to IPv4, looks like "no network"). Two different fixes for two different Neon drivers: a `ws`-subclass for the WebSocket `Pool` (`api/_lib/db.js`), an `undici` global dispatcher for the HTTP `neon()` driver (`apply-schema.mjs`). Left off by default — only enable on the real VPS if it shows the same symptom.
