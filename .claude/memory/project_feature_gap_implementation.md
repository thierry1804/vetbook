---
name: project-feature-gap-implementation
description: "Status of implementing the 7 functional gaps found by auditing VetBook against its 15-item wishlist (spec/wishlist.md), excluding the social-network item — all 3 jalons (A, B, C) now done."
metadata:
  node_type: memory
  type: project
---

On 2026-09-10, audited VetBook against `spec/wishlist.md`'s 15-item wishlist. Found 7 partially-implemented items (2, 3, 4, 5, 7, 13, 15) plus a dead `monthlySummary` notification toggle and no real push-notification infrastructure. User asked to address every gap except #14 (social network — explicitly excluded). For 3 open design questions the user picked the most complete option each time (consistent with [[feedback_scope_preference]]): real OS-level push notifications, a curated breed database, and a real implementation of the monthly summary.

Full plan: `/home/thr/.claude/plans/il-faut-tout-traiter-snappy-dragonfly.md` (host-local, not in this repo) — written against Supabase, translated to Neon/Vercel during execution, see [[project_backend_migrated_to_neon]].

**All 3 jalons complete as of 2026-09-10:**

**Jalon A:** structured symptom tracking on the journal, breed-weight reference (`BREED_DB`, datalist), activity calorie estimation (`MET_TABLE`), vet-sharing export (`printVetView()`).

**Jalon B:** real push notification infrastructure — VAPID keypair, client subscribe/unsubscribe flow, `#modal-pushSettings`, `sw.js` push/notificationclick handlers, server-side sending (moved from a Supabase Edge Function to `api/cron/send-reminders.js` on Vercel Cron partway through).

**Jalon C:** medications, monthly summary, dog events — targeted the Neon/Vercel architecture directly:
- **Medications**: `medicationReminder` toggle wired into `checkBrowserNotifications()`, `renderAlerts()` (new "Médicaments" filter pill), `computeHealthStatus()`/`getNextDueItem()` (health ring reflects medications now), `renderHomeReminders()`, `exportUpcomingRemindersIcs()`. Alerts on `endDate` approaching (≤7 days, active only) — medications have no `.next` field like vaccines/dewormings do. Backend: `notification_prefs.medication_reminder` column, `api/_lib/mapping.js` NOTIF_FIELDS entry, `api/cron/send-reminders.js` query branch.
- **Monthly summary**: `computeMonthlySummary()` + `renderMonthlySummary()` (new `#modal-monthlySummary`, "Résumé du mois" button in the Rappels tab, shows the *current* month on-demand). Separately, a notification fires once per month boundary for the *previous* month via `checkMonthlySummary()` (throttled via `localStorage`, not synced — pure local UI state). Backend: `notification_prefs.last_monthly_summary_sent` + idempotent cron branch.
- **Dog events**: monthly grouped notification of `DEFAULT_DOG_EVENTS`. This toggle is **account-level, not per-pet** — a new `users.dog_events_reminder` column + `api/user/dog-events-reminder.js` endpoint (an improvement over the original Supabase-era plan, which would have ignored this toggle in the push path entirely — made easy since `users` is now an app-owned table). Toggle UI lives in `#modal-pushSettings`, not the per-pet `#notif-list`.
- `exportUpcomingRemindersIcs()` extended with both medications and dog-events VEVENT blocks.

All verified in a real browser against seeded `localStorage` fixtures — health ring, home reminders, Rappels tab, monthly summary modal (checked against hand-computed values), dog-events toggle round-trip, ICS export (Blob content intercepted before download). One thing not directly end-to-end verified: the new branches inside `checkBrowserNotifications()` itself — `Notification.permission` is a native read-only getter ('denied' in the sandbox) and the function isn't exposed outside `app.js`'s closure. Verified via code review + reuse of the exact pattern already proven for vaccines/dewormings/hygiene, plus direct verification of the data functions those branches call into.

**Nothing left from the original audit except #14 (social network), which stays explicitly out of scope.**
