# Memory Index

- [Account, security & sharing](project_account_security_sharing.md) — 2026-09-25: full account/password/session/share/household feature verified end-to-end (79 smoke checks green), 2 latent pg concurrent-query bugs fixed
- [Backend migrated to Neon](project_backend_migrated_to_neon.md) — Supabase → Neon+Vercel API, what changed vs. stayed the same, stale supabase/ leftovers (now superseded by Docker/VPS, see the account/security memory)
- [Feature gap implementation](project_feature_gap_implementation.md) — Jalon A+B done (symptoms/breed/calories/vet-export/push), Jalon C next (medications/monthly-summary/dog-events)
- [Pedigree & reproduction](project_pedigree_reproduction.md) — 2026-09-25: saillie/mise bas/déclarations LOF-LOMAD tracking + pedigree health/registry fields, verified end-to-end; found+fixed a pre-existing sync/push crash on missing notification-pref keys
- [Pedigree race + charts](project_pedigree_race_charts.md) — 2026-09-25: breed standard PDF link (390 races scraped), LOF Select deep-link, SVG pedigree tree connectors, Chart.js replacing 4 duplicate SVG charts; found+fixed #pedigree-card missing from redesigned markup (same class of bug as editPedigree)
- [Frontend redesign status](project_frontend_redesign.md) — home screen done (health ring signature), ~14 screens left, resume with fiche animal
- [Playwright verification workflow](feedback_playwright_verification.md) — temp-install/test/uninstall pattern, screenshots before claiming success
- [Scope preference](feedback_scope_preference.md) — user picks the comprehensive option when offered a choice, but likes milestone checkpoints
- [App'lika owner](user_applika_owner.md) — solo dev, French, delegates decisions, backend is now Neon not Supabase
- [Project renamed to App'lika](project_renamed_to_applika.md) — 2026-09-11 branding rename from VetBook; vetbook_* storage keys kept as-is
- [Google auth + isolation audit](project_google_auth_and_isolation_audit.md) — 2026-09-11: isolation was already correct; added Google Sign-In via jose+JWKS, links to existing email accounts
