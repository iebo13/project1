# BlitzBlank visual & navigation refresh — design

**Date:** 2026-07-16
**Status:** approved direction (homepage hero V5, interior heroes C — see mockups:
https://claude.ai/code/artifact/04d3d728-a563-49be-b660-30e41a8b0147)

## Problem

Four user-reported findings, all verified in code:

1. **Header link inconsistency** — `site.nav` mixes 5 page links with 2
   homepage anchors (`/#reviews`, `/#faq`). From an interior page, clicking
   Reviews/FAQ unexpectedly navigates back to the homepage.
2. **Glass navbar** — the header is glassmorphic in all three states
   (`css/style.css` §navbar). Over busy hero photos, legibility depends on the
   photo behind it; a whole class of "dark-on-dark" bugs (see commit b085240)
   exists only because navbar styling varies per page.
3. **Scroll hint nearly invisible** — `.scroll-indicator` is white at 70%/50%
   opacity over a photo, small, at `bottom: 36px` (`css/animations.css`).
4. **Hero contrast feels wrong** — the homepage overlay fades to 30–40% tint on
   the right, so text contrast depends on the photo; interior `page-hero`s use
   a 70→90% navy wash that muddies the photo without guaranteeing contrast.

Additional debt folded in: two Unsplash photo IDs 404
(`photo-1556909114-44e3e9399a2e`, `photo-1567548083313-04c67ac2f4f0`), used in
4 places.

## Design decisions

### 1. Navigation: 5 pages in the header, everything in the footer

- Nav items in `src/_data/site.js` gain an `inHeader` boolean (same idiom as
  `onHome` on services). Reviews and FAQ get `inHeader: false`.
- `navbar.njk` renders only `inHeader` items (5: home, about, services,
  gallery, contact). `footer.njk` keeps rendering all 7.
- No dictionary keys, URLs, or permalinks change.

### 2. Navbar: solid navy → solid white on scroll; variants deleted

- One behavior on every page. Default: fully opaque `--color-primary` bar,
  white text, **no backdrop-filter**. After 40px scroll (`.is-scrolled`, the
  existing threshold in `js/navigation.js`): solid white, navy text, soft
  shadow.
- The `navbarSolid` front-matter flag and `.navbar--solid` CSS variant are
  **removed** from all pages and CSS — per-page navbar styling is the root
  cause of the dark-on-dark bug class.
- Mobile menu panel stays solid (already is); loses any blur.
- At the top of the homepage the navy bar sits flush on the hero's navy panel
  (V5) — deliberate, reads as one surface.

### 3. Glass moves into sections: a named 3-tier system

New tokens in `variables.css`, utility classes in `components.css`:

- **`.glass-strong`** — only over photos/dark gradients. Navy tint ≥55% +
  blur, white text with subtle text-shadow (`0 1px 3px rgba(0,0,0,.3)`).
  Used on: hero stat badges (over the photo half of the V5 hero), testimonial
  cards on the dark reviews band (`#reviews`), and the CTA banner panel
  (`#contact-cta`).
- **`.glass-soft`** — light frosted cards: white ~65% tint, gentle blur,
  hairline border. Used on service cards (homepage + services page) and the
  about page's mission/value cards (`.mv-card`, `.value-card`); the sections
  behind those grids get soft decorative gradient blobs (existing `.blob`
  pattern) so the blur has content to diffuse.
- **`.glass-backdrop`** — one large frosted section container, **max one per
  page**: the homepage FAQ panel over a soft gradient wash.
- All three collapse to solid equivalents under
  `@media (prefers-reduced-transparency: reduce)`; the same solid values serve
  as the no-`backdrop-filter` fallback.
- Contrast floors are non-negotiable: AA minimum for all text on glass, AAA
  where the text is small.

### 4. Heroes: dark premium, contrast by construction

- **Homepage (variant V5 — dark split):** a solid navy panel occupies the left
  ~55% of the hero (with a subtle blue radial glow), fading into the photo
  which stands fully untinted on the right. Headline white with the
  white→cyan gradient accent word; eyebrow pill; existing CTAs. Stat badges
  become `.glass-strong` over the photo side. Text never overlaps the photo:
  contrast is guaranteed by the solid panel, and the photo is finally actually
  visible.
- **Interior pages (variant C — dark, fixed):** keep full-bleed photos, but
  replace the uniform 70→90% wash with a horizontal gradient: ≥82% navy behind
  the text (left), clearing to ~35% on the right so the photo reads. Add a
  small breadcrumb (`Start / Kontakt` style) above the h1. Slimmer band than
  today.
- Replace the two 404ing Unsplash photos everywhere they appear
  (`src/gallery.njk` ×2, `src/_data/services.js`, `src/index.njk`) with
  working, brighter equivalents.

### 5. Scroll hint (homepage hero)

- Replace the faded mouse outline with a pill: "Scrollen"/"Scroll" label +
  chevron, white text on `rgba(15,23,42,.45)` glass with a visible border
  (on-dark variant from the mockup).
- Real hit area (padding, `border-radius: 99px`), still an `<a href="#stats">`.
- Gentle chevron dip animation, disabled under `prefers-reduced-motion`.
- Hidden below 700px viewport height (`@media (max-height: 700px)`) where it
  collides with hero content.

## Mobile design

The Playwright `mobile` project makes these first-class requirements, not
afterthoughts:

- **Navbar / drawer:** the mobile drawer (`.nav-menu` under
  `max-width: 1279px`) becomes fully solid navy — the `blur(20px)` goes (it's
  already 98% opaque; blur costs mobile GPU for nothing). The hamburger bars
  must be visible in both navbar states: white on the navy bar, navy on the
  scrolled white bar. The 1279px breakpoint is *measured* and synced across
  `css/responsive.css`, `NAV_DRAWER_MAX` in `js/navigation.js`, and
  `tests/navbar.spec.js`; with two links removed it may be re-measured and
  lowered, but only by updating all three together.
- **Homepage hero (V5) below ~768px:** the horizontal split doesn't fit, so it
  stacks — full-width solid navy panel with the text content on top, the
  untinted photo as a band (~40vh) below it, with the stat badges rendered as
  a compact horizontal row of `.glass-strong` chips overlapping the photo. No
  text ever sits on the photo on mobile either.
- **Interior heroes (C) below ~768px:** the left-to-right gradient becomes a
  uniform ≥82% navy overlay (text spans the full width, so there is no "clear"
  side to preserve). Breadcrumb and h1 stay left-aligned.
- **Scroll hint:** hidden under `max-height: 700px` (covers landscape phones);
  on portrait phones it stays, with a ≥44px touch target.
- **Glass performance:** mobile gets a reduced blur radius (a smaller
  `--glass-blur` value under the mobile breakpoint), and `.glass-backdrop`
  falls back to its solid equivalent on mobile — large blurred surfaces are
  the main scroll-jank risk on mid-range phones.
- **Tap targets:** all new interactive elements (scroll-hint pill, footer
  links, lang switch) keep ≥44px effective touch targets.

## Error handling / graceful degradation

- No `backdrop-filter` support → solid fallbacks (same values as
  reduced-transparency).
- `prefers-reduced-motion` → no chevron animation, existing reveal fallbacks
  unchanged.
- Translation keys unchanged → `t` filter's build-time throw keeps protecting
  both languages.

## Testing

- Update functional tests that assert nav geometry/link counts (navbar tests
  cover both languages) to the 5-link header.
- `tests/i18n.spec.js` untouched — no keys added or removed (breadcrumb reuses
  existing `nav.*` keys; if a new key is needed it's added to both languages).
- Visual baselines (`tests/visual.spec.js-snapshots/`) are regenerated **once,
  at the end, deliberately** via `npm run test:update-snapshots` — this is the
  intentional-change case the script exists for. Before regenerating, every
  diff is eyeballed against the approved mockups.
- CI unaffected (functional tests only, `--ignore-snapshots`).

## Out of scope

- Impressum/Datenschutz pages, form backend, image `srcset`/dimensions, the
  remaining a11y gaps (slider pause, fake tablists) — tracked in README/CLAUDE
  as known gaps.
- The `@layer` CSS restructure ("Part 2") — this design works within the
  existing five-file cascade order.
