---
version: 1
slug: "admin"
primary_target: "admin"
related_targets: []
---

## Scope

Surface: the App'lika admin backoffice (`admin/`, React-Admin + MUI), separate app/host from the pet-owner product. Mode: Operate. Audience: internal staff (support, content editors, billing) working the tool daily — category-fluent, values speed and trust over personality.

Job: find/edit records (users, content, reference data, directory, plans), act on accounts with an audit trail, read the dashboard as a status report. Frequent, repetitive use; density and scanability outrank expression.

Constraints: French copy throughout; keep existing navigation structure (grouped sidebar + Ctrl+K palette), existing data/permission logic, and the custom sidebar scrollbar (the native one does not paint reliably here). Redesign the visual system, not the information architecture, though individual screens may be restructured where it serves clarity.

## Direction contract

THESIS: a precision instrument panel for App'lika's data, not a generic MUI admin kit wearing icon-tile KPI cards and a rainbow of per-metric colors. Numbers and lists carry their own weight.

OWN-WORLD: Restrained palette — warm-neutral gray scale (not MUI's cold gray) plus the single App'lika pine green (#1f5c4b light / #5fc2a5 dark) as the only accent, used for selection, primary actions, links and chart series, never decoration. A small fixed status vocabulary (success / warning / error / neutral) in that same hue family, not per-card rainbow tones. Inter throughout, fixed rem scale (~1.15 ratio), tabular numerals on every number and table. Hairline borders define regions; shadows reserved for true overlays (menus, dialogs, popovers). 8px corners everywhere, consistently.

STORY: staff opens the tool, reads where the product stands at a glance (the dashboard as a status report, not a trophy case), finds any record in under a few seconds via nav or ⌘K, and every consequential action states its effect and requires a motif before committing.

FIRST VIEWPORT (dashboard): greeting + date line, one dense bordered metrics strip (numbers in a row with hairline dividers, ledger-like) replacing the eight separate icon-tile cards, two distribution breakdowns below as inline bar-lists (label — bar — value) in the single accent color.

FORM: Operate, Restrained — chosen directly from the mode's own default plus the user's explicit confirmation ("sobre et pro"); the open world-exploration step is skipped because the form is already converged on an admin-console lineage (Linear / Stripe Dashboard / Vercel's internal tooling register).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

None outstanding for this pass; later screens (payments/invoices tables, import dialog) inherit the system without a separate decision.
