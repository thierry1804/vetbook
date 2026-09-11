---
name: project-renamed-to-applika
description: "Project was renamed from VetBook to App'lika on 2026-09-11 — what was changed and what was deliberately left as vetbook_* internally."
metadata:
  node_type: memory
  type: project
---

On 2026-09-11, the user asked to rename the project from "VetBook" to "App'lika" ("app'lika"). Updated all user-facing branding and metadata: `manifest.json` (name/short_name), `index.html` `<title>` and onboarding copy, `package.json`/`package-lock.json` name field (`applika`), README, notification titles, email subject/body, console log labels, comment headers, `sw.js` `CACHE_NAME` (now `applika-*`), download filenames (`applika-backup.json`, `applika-rappels.ics`), and the `.claude/launch.json` config name.

**Deliberately left unchanged:** all `vetbook_*` localStorage keys (`vetbook_data`, `vetbook_theme`, `vetbook_vet_directory`, `vetbook_cloud_session`, etc.), the IndexedDB name `vetbook_photo_db_v1`, and the iCal `UID` prefixes (`vetbook-vaccine-`, `vetbook-deworm-`, etc.) in `app.js` and `data-layer.js`.

**Why:** renaming those internal identifiers would silently wipe or orphan existing users' locally-stored data (localStorage/IndexedDB) on their next visit, and would duplicate calendar entries for anyone who already exported an `.ics`. None of these keys are user-visible, so there's no branding upside to changing them.

**How to apply:** the repo directory and git remote (if any) were not renamed — only ask about that if the user brings it up. If asked to fully complete the rename later (e.g. a fresh install / breaking change is acceptable), those `vetbook_*` keys are the remaining piece — see [[user_applika_owner]] for project context.

**Bug found and fixed later the same day:** the header logo in `index.html` (`Vet<span>Book</span>`) was missed by the initial `grep -rn "VetBook"` sweep because the literal string is split by an HTML tag — the two-tone brand span (`<span>` colored via `.logo span` in styles.css) meant "Vet" and "Book" were never contiguous text in the file. Fixed to `App'<span>lika</span>` (same two-tone split point kept). **Lesson: when grepping for a brand string to rename across an HTML/JS codebase, also check for the string split across markup** (`grep` won't catch `Foo<span>Bar</span>` when searching for `FooBar`) — verify visually in a real rendered page, not just by grep, especially for logos/headers that are prime candidates for this kind of markup-based styling.
