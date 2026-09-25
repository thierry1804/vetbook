# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Confirmed by the owner (answer to the init interview: all three audiences apply):

- Pet owners in France, mostly dog and cat owners with one or several animals. They record and check care on a phone day to day (quick entries, weights, reminders) and use a computer to review the whole record.
- Personal and family use: the owner and close relations use the app themselves.
- Pet owners and veterinarians: owners enter data, a vet may read a shared record or an export.

The interface is in French. Multi-animal households are a first-class case.

## Product Purpose

App'lika is a digital health record ("carnet de santé") for companion animals. It keeps vaccines, deworming, hygiene, treatments, consultations and costs, weight and growth, nutrition, activities, heat cycles, photos and notes in one place, and turns due dates into reminders so no vaccine or antiparasitic is missed. Success is an owner who always knows what their animal needs next, and who can hand a clear record to a vet.

## Positioning

Inferred from the code, not yet confirmed as a market claim: a pet health record that works locally in the browser, syncs to a server the owner can run themselves (Docker stack: Nginx, Express API, Postgres, MinIO), and exports the owner's data (JSON, calendar .ics). Emergency access (national vet emergency line 3115, clinic directory) sits next to the everyday record.

## Operating Context

- Installable web app (PWA) with a service worker; data lives in the browser (localStorage, IndexedDB for photos) and syncs through the API when signed in.
- Sign-in by email and password, Google OAuth optional; session in an httpOnly cookie.
- Web push notifications for reminders, plus a .ics export of upcoming reminders.
- Used on phone (bottom tab bar) and on desktop (left navigation), in light and dark themes.
- Diffusion, per the owner: self-hosted first, a public launch is planned, and it also serves as a showcase or test bed. The order and timing are undecided.

## Capabilities and Constraints

Built (verified in code): animal profiles with identity and owner sheet, QR identity code, vaccines, deworming, hygiene, treatments, consultations with costs, weight and height history, nutrition and a calorie calculator, activities, heat cycles, photo album, notes and check-up, reminders (done / snooze), calendar and agenda, vet directory and emergency contacts, community events and tips, JSON backup and import, multi-animal switching.

Terminology to keep: "carnet", "soin", "rappel", "frise", "agenda", "fiche".

Undecided or not built: `design/product.md` (insurance reimbursement tracking, certified PDF export, AES-256 end-to-end encryption, chip OCR/barcode scanning, and similar) is a long-range specification. The owner's answer on its status was ambiguous (target, near-term plan and obsolete were all selected), so none of these is treated as existing or as committed. Future work must not present them as features.

## Brand Commitments

- Name: App'lika. Tagline in the app: "Santé & bien-être animal".
- Language: French.
- The design system already recorded in `design/DESIGN.md` is the visual authority; init does not extend it.

## Evidence on Hand

- Real product spec and screen mockups in `design/` (`product.md`, `DESIGN.md`, `stitch_vetbook_ui_redesign`), aspirational as noted above.
- No testimonials, usage metrics, press, or customer cases exist in the repository; future work must not invent any.

## Product Principles

- The next action comes first. Each screen leads with what the animal needs now (a due care, a reminder), then the record.
- One record, many entry points. Recording something takes as few taps as possible from anywhere, and desktop and phone are designed as different experiences, not one squeezed into the other.
- The owner's data stays theirs: local first, exportable, self-hostable.
- Be reassuring, never alarmist. State health status plainly with words and shape, not colour alone; keep the emergency route always reachable but calm.
- Only claim what the product does. Planned features are labelled as planned.

## Accessibility & Inclusion

No formal standard was confirmed by the owner. The redesign work applied WCAG AA text contrast in light and dark themes and 44 px touch targets on mobile as its working bar. French-language content throughout.
