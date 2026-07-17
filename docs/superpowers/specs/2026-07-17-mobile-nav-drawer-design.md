# Mobile nav drawer — design

**Date:** 2026-07-17 · **Base:** `feature/visual-refresh` (6dfdbf4) · **Branch:** `feature/mobile-nav-drawer`

## Problem (measured, not assumed)

Below the 1280px drawer breakpoint the header row keeps the language switch
(98px), the CTA button (168px German) and the burger, next to the logo. The row
needs **497px in German / 448px in English** — at 390px the burger sits at
x 453–497, *entirely off-screen*. German phone users cannot open the menu at
all; the CTA renders clipped ("Angebot anfor…"). At 320px it is worse.

The drawer itself is a bare column of the four `inHeader` links — no language
switch, no CTA, no phone, no close affordance (the burger-turned-X is under
the opened panel, and off-screen anyway).

Two adjacent, related defects (also measured):

- Un-revealed `[data-reveal="right"]` blocks (`.about-preview__content`,
  `.contact-form-card`) sit at `translateX(50px)` and create **30px of real
  horizontal page scroll** at 390px on home + contact (18px at 768px).
- Tap targets: `.service-card__link` (~30px tall), consent checkbox (18px).

`tests/headings.spec.js` already skips the lang-switch test below 1280 with
the reason *"lang switch lives in the drawer on mobile"* — this design was
intended; the mobile half was never built.

## Goals

1. Burger always reachable; header row never overflows at any width, either language.
2. Language toggle moves out of the mobile header into the drawer.
3. Drawer redesigned as a complete mobile menu: nav + language + phone + CTA.
4. No page has horizontal scroll at mobile widths.
5. Desktop (≥1280px) rendering unchanged.

## Approaches considered

- **A. Patch the existing transform-drawer** — keep `.nav-menu`'s dual
  desktop-row/mobile-drawer CSS, append hidden extras. Least churn, but keeps
  the double-duty CSS that caused this, no focus trap, keyboard tabs escape
  into the page behind the open drawer.
- **B. Native `<dialog>` drawer (chosen)** — a separate `.nav-drawer` element;
  the desktop `.nav-menu` row goes back to being desktop-only. `showModal()`
  gives focus trapping, ESC, focus restore, top-layer stacking and `::backdrop`
  for free — the same platform-first move the rebuild already made for the
  lightbox (`<dialog>`) and FAQ (`<details>`). Costs: nav links exist twice in
  the partial (both render from the same `site.nav` loop), and exit animation
  needs a small JS hand-off.
- **C. Full-screen overlay menu** — a variant of B stylistically; rejected:
  a right sheet keeps page context visible and matches the existing pattern.

## Design

### Header behaviour by width

| Width | Header row | Language switch | CTA | Burger |
|---|---|---|---|---|
| ≥1280 | logo · nav row · lang + phone(≥1500) + CTA | header | header | hidden |
| 769–1279 | logo · CTA · burger | drawer only | header + drawer | visible |
| ≤768 | logo · burger | drawer only | drawer only | visible |

### Drawer (`<dialog class="nav-drawer" id="navDrawer">`)

Right-anchored sheet, `min(380px, 88vw)` wide, full-height flex column, solid
navy (`--color-primary`) per the refresh's "glass lives in the sections, not
the chrome" rule. Rendered by `partials/navbar.njk` directly after
`</header>`; closed by default so desktop never sees it.

- **Head** (navbar-height, hairline bottom border): logo mark + wordmark,
  44px close tile (same visual language as `.nav-toggle`).
- **Nav** (`flex: 1`, `overflow-y: auto`): all six `site.nav` entries — the
  full list the footer shows, not just the four `inHeader` pages — as
  `.nav-drawer__link` rows (`--fs-lg`, semibold, `--radius-md`, hover/focus
  white-8% fill). Active page: `aria-current="page"`, white text, 3px inset
  accent bar.
- **Foot** (hairline top border, safe-area padding): full-width `.lang-switch`
  (flex-stretched buttons, taller tap area; active keeps its gradient pill),
  `tel:` phone link with icon, full-width `btn btn--primary` CTA.

### Motion

Entry: `@starting-style` + `translate` transition (`--t-slow`), links
stagger in via `--i` custom property set per link (35ms steps); backdrop fades.
Browsers without `@starting-style` show the drawer instantly — acceptable.
Exit: JS adds `.is-closing` (slides out + backdrop fade), then `close()` after
480ms. `prefers-reduced-motion: reduce` disables all drawer transitions and
closes immediately.

### JS (`js/navigation.js` `initMobile()` rewrite)

`showModal()` on toggle; animated `close()` on: toggle, close tile, any drawer
link, ESC (`cancel` → `preventDefault` → animated), backdrop click (click
target is the dialog with coordinates outside its box). The `close` event is
the single cleanup point (aria-expanded, body scroll unlock, timer clear).
Body scroll locks via `overflow: hidden` on open; unlocked *synchronously* at
close-start so same-page anchor links (`/#faq`) can scroll while the drawer
animates out. Resize past 1279 closes instantly (`NAV_DRAWER_MAX` unchanged).
The dynamically-created `.nav-backdrop` and its CSS are deleted —
`::backdrop` replaces them.

### CSS placement

Drawer component styles live in `components.css` (new "Mobile nav drawer"
section — unconditional, since a closed dialog renders nowhere). The ≤1279
block in `responsive.css` shrinks to: hide `.nav-menu`, show `.nav-toggle`,
hide the header `.lang-switch`; ≤768 additionally hides the header CTA.
`::backdrop` gets a literal `rgba` fallback line before its `color-mix`
value — custom properties don't reach `::backdrop` in older engines (the one
sanctioned exception to the no-new-rgba rule; commented as such).

### Horizontal overflow fix

`html { overflow-x: hidden; overflow-x: clip; }` in the base styles.
`clip` (modern) forbids horizontal scrolling without creating a scroll
container; the `hidden` line is the legacy fallback. This clips the
pre-reveal `translateX(50px)` states that currently widen the page. No
`position: sticky` exists anywhere, so nothing breaks.

### Tap targets

- `.service-card__link`: `padding-block: var(--space-2)` + equal negative
  `margin-block` — hit area grows to ~38px, zero visual shift.
- Consent checkbox 18px → 22px at ≤540px.

### i18n

Two new keys in both languages (build fails if one is missing):
`nav.menuLabel` ("Menu"/"Menü") for the dialog's `aria-label`,
`nav.close` ("Close menu"/"Menü schließen") for the close tile.

## Tests

- New `tests/navbar-mobile.spec.js` (mobile project; skips ≥1280): burger
  fully inside the viewport and row not overflowing at 320/360/390/412/768/
  1024/1279 in both languages; header lang-switch hidden; drawer opens with
  6 links + lang switch (correct counterpart hrefs) + phone + CTA; closes via
  tile, ESC and backdrop; `aria-expanded` tracks; no document horizontal
  scroll on any of the 11 pages at 390px.
- `tests/i18n.spec.js`: lang-switch locator scoped to `.navbar__actions`
  (strict mode would now match two), plus the same assertion against
  `.nav-drawer`'s copy.
- Existing desktop suites unaffected (all geometry tests are ≥1280-gated;
  drawer links use `.nav-drawer__link`, not `.nav-link`).
- Visual baselines: mobile snapshots regenerate — **intentional**: the mobile
  header (logo + burger) and any ≤540 tap-target change are deliberate.
  Desktop snapshots must not change; a desktop diff fails the work.

## Out of scope

Everything already fixed on this base (footer contact block, brands contrast,
anchor offsets, breadcrumb/page i18n) and the untranslated-content issue that
exists only on `main`'s older tree. The uncommitted legal-pages work on `main`
is untouched by working in this isolated worktree.
