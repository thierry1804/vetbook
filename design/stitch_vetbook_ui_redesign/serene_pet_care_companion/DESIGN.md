---
name: Serene Pet Care Companion
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#893a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#af4c00'
  on-tertiary-container: '#ffe6da'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783200'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system crafts a warm, calm, and reassuring digital companion dedicated to pet health and proactive wellness tracking. It bridges medical precision with emotional warmth, replacing the cold anxiety of traditional clinical veterinary interfaces with a sanctuary of quiet confidence and clarity.

The aesthetic blends **Soft Minimalist Tactility** with **Modern Organic Care**:
- **Tone:** Empathetic, orderly, protective, and gentle.
- **Visual Feel:** Airy light surfaces, tactile pill-like micro-surfaces, whisper-soft borders, and pillowy depth that makes everyday record-keeping feel effortless and uplifting.
- **Target Audience:** Modern pet parents managing medical history, vaccinations, recurring treatments, and emergency contacts across multiple pets on mobile and tablet devices.

## Colors

The color palette is built around healing herbal greens, reassuring amber accents, and clinical yet soft neutrals.

### Roles & Semantic Distribution
- **Primary (`#0F766E` Deep Teal / Sage Pine):** Used for anchor navigation, primary actions, prominent status signifiers, and key headings requiring authoritative trust.
- **Secondary (`#14B8A6` Mint / Bright Sage):** Used for supportive accents, progress rings, active toggle states, health confirmation pills, and subtle surface washes (`#F0FDFA`).
- **Tertiary / Warning (`#F97316` Warm Coral / Amber):** Highlights upcoming vaccination dates, scheduled deworming reminders, and pending checkups without inducing medical alarmism.
- **Alert / SOS (`#EF4444` Vital Red):** Reserved exclusively for urgent triage cards, critical contraindications, and 24/7 veterinary emergency calls.
- **Surface & Backgrounds:**
  - Base canvas: `#F8FAFC` (Soft Slate White)
  - Card & sheet surface: `#FFFFFF` (Pure White)
  - Subtle borders: `#E2E8F0` / `#CBD5E1` at low alpha
- **Neutrals & Typography:** Primary text sits on `#0F172A` (Ink Slate), secondary supportive text on `#475569`, and muted/timestamp metadata on `#94A3B8`.

## Typography

Typography prioritizes friendly clarity and immediate scanability. 

- **Headlines & Display:** **Plus Jakarta Sans** provides open counters, friendly terminals, and human geometry that keeps names, pet metrics, and dashboard headlines warm and approachable.
- **Body & Captions:** Also set in **Plus Jakarta Sans** for consistency across narrative medical observations, notes, and instructions.
- **Labels, Badges & Tables:** **Inter** is selectively utilized for compact tags, numerical health values (temperatures, weights, dates), and status badges to maintain crisp legibility at small sizes.

## Layout & Spacing

A mobile-first philosophy governs the structural flow, keeping tap targets generous and primary metrics within natural thumb zones.

### Grid & Breakpoints
- **Mobile (<640px):** 4-column fluid layout with `1rem` margins and `1rem` gutters. Quick-action carousels swipe horizontally past screen margins with soft snap points.
- **Tablet (640px - 1024px):** 8-column layout with `1.5rem` margins and `1.5rem` gutters. Profile information docks alongside historical medical feeds.
- **Desktop (>1024px):** 12-column layout maxed at `1200px` content width with `2.5rem` outer margins. Left rail accommodates persistent multi-pet switcher and navigation.

### Rhythm
Components adhere to an 8pt base spatial increment (subdivided to 4pt for micro-padding). Spacing around card elements remains generous (`space-md` to `space-lg`) to prevent information overload during critical veterinary consultations.

## Elevation & Depth

Visual depth is achieved through **ambient daylight diffusion** and **tonal stacking** rather than heavy drop shadows:

- **Level 0 (Canvas):** `#F8FAFC`, flat matte canvas.
- **Level 1 (Card & Section Surfaces):** `#FFFFFF` paired with an ultra-soft ambient shadow: `0 2px 8px -2px rgba(15, 118, 110, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)`, bordered by an understated outline of `1px solid #E2E8F0`.
- **Level 2 (Interactive Floating & Modals):** Elevated navigation bars, floating quick-add logs, and bottom sheets use `0 12px 24px -6px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 118, 110, 0.03)`.
- **Level 3 (Urgent / Active Overlays):** Emergency sheets and critical alerts feature soft backdrop filters (`backdrop-blur(12px) bg-white/80`) to keep the primary context softly visible while shifting immediate focus to resolution.

## Shapes

The shape system expresses tenderness and soft organic reassurance:

- **Standard Elements (Buttons, Inputs, Metric Tiles):** `1rem` (`rounded-2xl` equivalent) softens touch interaction.
- **Cards & Health Containers:** `1.5rem` (`rounded-3xl` equivalent) ensures containers feel like cushioned, welcoming enclosures.
- **Status Pills, Tags, and Pet Identity Avatars:** Fully rounded pill shapes (`9999px`) provide contrast against rectangular cards.
- **Avatar Rings:** Circular geometry accented with soft concentric rings signaling health readiness (e.g., green ring for fully up-to-date vaccinations).

## Components

### Buttons
- **Primary:** Filled in `#0F766E` with crisp white typography. Height 48px on mobile for effortless tapping. Soft active scale depression (`active:scale-[0.98]`).
- **Secondary:** Surface tint `#F0FDFA` with `#0F766E` text and border in `#CCFBF1`.
- **Emergency Action Button:** Full `#EF4444` background, bold white text, paired with phone or pulse icon.
- **Ghost / Tertiary:** Transparent background with `#475569` text, transitioning to `#F1F5F9` on hover.

### Status Badges (Veterinary Health Status)
- **À jour (Up to Date):** `#F0FDF4` background, `#15803D` text, subtle green dot indicator (`#22C55E`).
- **Bientôt (Upcoming / Reminder):** `#FFF7ED` background, `#C2410C` text, amber clock icon (`#F97316`).
- **En retard (Overdue):** `#FEF2F2` background, `#B91C1C` text, subtle alert badge (`#EF4444`).

### Quick-Action Health Cards
- White background (`#FFFFFF`), `1.5rem` border radius, micro-border `#E2E8F0`.
- Includes an icon encapsulated inside a colored circular badge (e.g., mint background for vaccines, orange for treatments, sky blue for weight logs), followed by bold title and recent timestamp.

### Inputs & Date Selectors
- Background `#FFFFFF`, border `1px solid #CBD5E1`.
- Focus ring: `2px` offset with `#14B8A6` glow (`ring-2 ring-teal-500/20`).
- Text typed in `#0F172A`, placeholder in `#94A3B8`.

### Pet Profile Switcher & Carousel
- Horizontal pill cards showing pet avatar, species icon, and quick notification badge.
- Active pet pill highlighted with teal border and soft `#F0FDFA` background.

### Lists & Timelines
- Medical milestones connected by a subtle dotted vertical line (`#E2E8F0`).
- Each timeline node highlights the veterinary clinic name, procedure, and attached PDF/record pill.