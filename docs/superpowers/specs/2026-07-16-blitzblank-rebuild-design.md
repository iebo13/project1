# BlitzBlank — UI/UX, Code Quality, and Simplification Rebuild

**Date:** 2026-07-16
**Status:** Approved design, ready for implementation planning

## Problem

BlitzBlank is a 6-page static marketing site (8,172 lines) for a Düsseldorf cleaning
company, built with vanilla HTML/CSS/JS and no build step. Three static audits plus
browser rendering found that the site is substantially broken in ways that are invisible
from reading the source.

The site does not do its job. Its contact form — the only conversion path on a
lead-generation site — cannot be submitted. Its headline's payoff line has never rendered
for any visitor. Four of six pages display their `<h1>` in black on a near-black
background. And because translation happens at runtime via JavaScript, the German content
on a German-market site is invisible to search engines.

### Confirmed defects

Each verified firsthand, not inferred.

**The contact form cannot be submitted.** `js/contact.js:14` declares
`minLength: (v, n) => v.trim().length >= n`, but line 28 calls it as
`validator(value, input, arg)`. `n` binds to the `<input>` element, so the comparison is
`4 >= HTMLInputElement` → `NaN` → always false. The form carries `novalidate`, so there is
no fallback path. Three fields use `minLength`. Every submission fails.

**The hero's third line has never been visible.** `css/animations.css:132-136` sets
`.hero-line { opacity: 0; animation: fadeInUp … forwards }`. `css/animations.css:276` sets
`.text-gradient { animation: gradientShift 6s ease infinite }`. Equal specificity (0,1,0),
`.text-gradient` later in the same file, so it replaces the `animation` shorthand entirely.
`fadeInUp` never runs; nothing lifts the `opacity: 0`. Probed computed style confirms
`opacity: "0"` on a laid-out 648×92px box containing "obsessive care." — the payoff of the
site's main headline and its core brand positioning.

**The hero stagger fires in the wrong order.** Delays are keyed to `:nth-child`, but the
`<br>` counts as a child. Intended 200/360/520ms computes to **200ms → 520ms → 0s**; the
third line was meant to land last and lands first.

**Headings are dark navy on dark navy.** `css/style.css:96` sets
`color: var(--color-primary)` on `h1`–`h6` at specificity (0,0,1). `.page-hero` has
`background: var(--color-primary)` and sets `color: white` on itself, but the heading rule
supplies its own color so inheritance loses. Affects the `<h1>` on about/services/gallery/
contact and the `<h2>` in the CTA banner. Confirmed by screenshot. Someone already hit this
and patched one element inline at `about.html:338` rather than fixing the cascade.

**The consent checkbox is never validated.** `contact.html:186` lacks the `.field__input`
class, so `js/contact.js:20` returns `true` before reaching it. A GDPR consent checkbox
that cannot fail, next to a privacy-policy link that is `href="#"`.

**57% of text can never be translated.** `js/i18n.js` defines 270 keys per language.
`about`/`services`/`gallery`/`contact` reference exactly 24 each — navbar and footer only.
Every headline, paragraph, and form label on those four pages is hardcoded English while a
correct German translation sits unused in the dictionary. 133 of 270 keys (~24KB) are dead.
All 46.5KB ships to every page. Switching to German re-labels the nav and leaves the body
in English.

**Runtime translation is invisible to search.** Translation is a JS `textContent` swap, so
crawlers only ever index English — on a site whose `<title>` and `<meta description>` are
German and whose market is Düsseldorf.

**Zero of 49 images declare `width`/`height`.** Unbounded CLS on every page while images
load from Unsplash.

**485 lines of chrome are duplicated across 6 pages, and have already drifted.**
`index.html` is the only page whose hamburger button translates its `aria-label`; the only
one whose newsletter button does. Footer social labels differ between copies. This is a
shipped bug, not a risk, and it happened across only six pages.

**The gallery is keyboard-unreachable.** 15 `<div class="gallery-card">` with no `tabindex`
or `role`, bound to a click listener only. The lightbox ships `aria-hidden="true"` and
`js/gallery.js` never removes it — so it is permanently hidden from assistive tech while
its focusable buttons remain in an `aria-hidden` subtree. No focus move, no trap, no
restore, despite `aria-modal="true"`.

**Dead code targeting elements that do not exist.** `initLazy` (26 lines) queries
`img[data-src]` — zero exist. `initProgressBars` (22 lines) queries `.review-bar__fill` —
zero exist. `index.html` has 8 masonry items but no lightbox, so clicks do nothing.
`services.html` ships a lightbox with no cards to open it. ~180 lines of CSS are unused.

### Root cause

Nearly every structural defect traces to the absence of a build step. Without one, shared
chrome must be copy-pasted (and drifts), and translation must happen at runtime (so it is
both bloated and unindexable). The bugs are downstream of that decision.

## Decisions

Settled with the user during brainstorming:

| Question | Decision |
|---|---|
| Purpose | A real site to deploy. "No build step" is a constraint to work around, not preserve. |
| Build | **11ty (Eleventy) v3**, not Vite — multi-page HTML with partials is 11ty's native job. |
| Language | **Proper bilingual DE + EN**, resolved at build time. Not runtime switching. |
| Visual scope | **Fix and refine** the existing blue/cyan glassmorphic direction. Not a redesign. |
| Content | **Placeholder** — keep demo copy, build the slots, remove unverifiable claims. |
| Approach | Critical fixes first, then incremental migration, screenshot-verified at each step. |

## Browser support baseline

Researched against MDN browser-compat-data 8.0.6 (2026-07-10) and webstatus.dev, current
as of July 2026. **Germany-specific: Firefox is 9.8% of traffic — roughly double its global
share** — so Firefox gaps are weighted more heavily than a global average would suggest.

**Safe to build on, no fallback** (Baseline Widely available): `<dialog>` + `showModal()` +
`::backdrop`, `@layer`, CSS nesting, `color-mix()`, container size queries, `:has()`,
`:user-invalid`/`:user-valid`, `scroll-snap`, `aspect-ratio`, `loading="lazy"`,
`srcset`/`sizes`, `subgrid`.

**Safe as pure enhancement** (fails invisibly, no guard needed): `<details name>`,
`::details-content`, `text-wrap: balance`/`pretty`, `light-dark()`, `content-visibility:
auto`, View Transitions, `fetchpriority`. `backdrop-filter` belongs here **provided
`-webkit-backdrop-filter` ships alongside**.

**Explicitly rejected — do not rely on:**

- `interpolate-size` / `calc-size()` — Chromium-only. Rules out keyword height animation.
- `::scroll-button()` / `::scroll-marker()` (CSS carousels) — Chrome-only.
- Scroll-driven animations (`animation-timeline`) — **Firefox has not shipped** (Nightly
  only). Rules out replacing IntersectionObserver.
- `@container scroll-state(scrolled)` — Chrome-only.
- `field-sizing: content` — reached Baseline one month ago; no installed base.
- Anchor positioning — shipped everywhere but too recently; iOS ≤18 has none.

These constraints directly shape three decisions below: the FAQ animates via
`grid-template-rows`, the slider keeps light JS, and reveals keep their
IntersectionObserver.

## Architecture

11ty v3 + Nunjucks. Source in `src/`, output to `_site/` as plain static HTML deployable to
any host. `npm start` for dev, `npm run build` for output.

The core move: **content becomes data, pages become templates that render it.** The 10
services currently exist in triplicate — a card in `index.html`, a card and a detail
section in `services.html`, plus footer links on all six pages — which is why the README's
"add a service" procedure has three steps.

```
src/_data/
  site.js            brand, contact details, nav structure
  services.js        the 10 services (one entry each)
  gallery.js         gallery items + categories
  faq.js  team.js  timeline.js  testimonials.js
  content/de.js      page copy, German
  content/en.js      page copy, English
src/_includes/
  layouts/base.njk   <head>, chrome, script/style tags
  partials/          navbar.njk, footer.njk, service-card.njk, …
src/pages/*.njk      one template per page, rendered once per language
```

Adding a service becomes one entry in `services.js`; card, detail section, footer link, and
both languages follow. The 485 duplicated chrome lines collapse to one `navbar.njk` and one
`footer.njk`, making drift structurally impossible rather than merely fixed.

### Language mechanism

Each page is **one template rendered twice** via 11ty pagination over `["de", "en"]`,
pulling copy from `content/de.js` and `content/en.js`.

The rejected alternative — separate `src/de/` and `src/en/` page files sharing layouts — is
more pleasant to edit but reintroduces the exact failure mode that broke this site: two
copies that drift. Paginating one template guarantees structural parity and makes it
impossible for markup to say English while the dictionary holds German.

Content files are **nested objects mirroring page structure**, not the flat `'about.f1.desc'`
dotted keys that made the current dictionary unreviewable.

**This ships zero translation JavaScript.** `js/i18n.js` (746 lines, 46.5KB, 58% of all JS)
is deleted outright, not repaired. `localStorage` disappears with it — language is a URL.

### URLs

German at root (primary market; **needs no root redirect**, so it works on any static host
unchanged). English under `/en/`. Localized slugs.

| German | English |
|---|---|
| `/` | `/en/` |
| `/leistungen/` | `/en/services/` |
| `/ueber-uns/` | `/en/about/` |
| `/galerie/` | `/en/gallery/` |
| `/kontakt/` | `/en/contact/` |
| `/impressum/` | `/en/imprint/` |
| `/datenschutz/` | `/en/privacy/` |

Each page emits `hreflang` alternates + `x-default` (11ty's built-in i18n plugin), a
self-referencing `canonical` (missing sitewide today), and per-language `<title>`/
`<meta description>` — currently German meta is served under `lang="en"` on every page.

**404 handling.** Static hosts serve one error document for the whole origin, so the 404
cannot be language-negotiated without server logic. It is emitted once at `/404.html` in
German (the root language) with an English sub-heading and links to both language homes.
It stays `noindex`, as it correctly is today. This is a deliberate exception to the
one-page-per-language rule; every other page follows it.

**Tooling and repo hygiene.** `.gitignore` covers `node_modules/`, the `_site/` build
output, `.cache/` (11ty's), env files, editor/OS cruft, and the screenshot-harness
artifacts — build output must never be committed, since `_site/` is generated and would
otherwise churn every build. The project is not currently a git repository; initializing
one is a prerequisite for the first implementation step.

## CSS

Today the cascade is a hand-maintained link-tag order a contributor can silently break, and
CLAUDE.md's claim that "components reference variables so palette changes propagate" is
**false**: 128 hand-written `rgba()` literals bypass the tokens, so changing
`--color-primary` strands 31 shadows at the old hue.

- **`@layer reset, tokens, base, layout, components, utilities`** — makes the cascade
  contract explicit and enforced instead of implied by file order.
- **`:where(h1…h6)`** on the heading reset — drops specificity to (0,0,0), fixes dark-on-dark
  on 4 pages + the CTA banner, and allows deleting the inline hack at `about.html:338`.
- **Fix the invisible headline** — `.text-gradient` stops declaring `animation`. Stagger
  moves off `:nth-child` (which counts the `<br>`) onto explicit classes.
- **Gradient text contrast** — `--gradient-text` is `#2563EB → #06B6D4`, blue-on-blue over
  the hero overlay. Even once visible it would be unreadable; it needs a contrast-checked
  treatment against its actual backdrop.
- **`color-mix()`** for the 128 literals, plus the missing `--color-error` token (`#EF4444`
  hardcoded 5× beside a `--color-success` that exists). Makes the palette claim true.
- **Intrinsic layout** — `auto-fit`/`minmax(min(290px,100%),1fr)` on the 5 hardcoded grids;
  `columns: 240px` for the masonry, replacing 4 breakpoints. Per-component `clamp()` deletes
  all 23 font-size overrides. Also fixes horizontal overflow below 320px, currently masked
  by `body { overflow-x: hidden }`.
- **Container queries** for card padding — currently stepped by *viewport* width even though
  cards sit in grids whose column count already varies. Wrong signal.
- Remove `transition: all` (7×), the lone `!important` (a specificity workaround the `:is()`
  restructure makes unnecessary), the 14 raw z-index values bypassing the scale, and ~180
  lines of dead rules.
- 28 of 115 tokens are unused; prune or adopt. `--color-overlay` is unused while its exact
  value is typed by hand 31 times.

**responsive.css: 544 → ~180. Total CSS: 4,052 → ~2,400.**

## JavaScript

The theme: **most of these bugs are fixed by deleting the code that contains them.**

| Current | Becomes | Deletes | Fixes |
|---|---|---|---|
| `faq.js` (77) | `<details name>` + `::details-content` | 77 | snap-close bug, `transitionend` listener leak, unnamed `role="region"`, tabbable collapsed content |
| Lightbox (~60) | `<dialog>.showModal()` | ~60 | all 5 a11y defects — focus trap, focus restore, `inert` background, permanent `aria-hidden` |
| `slider.js` (166) | `scroll-snap` + ~35 lines | ~130 | dot desync at `perView>1`, disabled-focus loss, dead keydown handler |
| `contact.js` validators | native validation + `:user-invalid` | ~30 | **the critical `minLength` bug**, the unvalidated consent box |
| Gallery filter | one CSS `:not()` rule | ~25 | 15 forced reflows per click |
| `initLazy`, `initProgressBars` | — | 48 | dead code, zero matching elements |
| `initSmoothAnchors` | `scroll-behavior` + `scroll-margin-top` | 14 | `querySelector` SyntaxError, broken back button, lost focus |
| `initActiveNav` | `aria-current="page"` from 11ty + CSS | 9 | unreachable branch; adds missing `aria-current` |
| `i18n.js` | build-time | **746** | 133 dead keys, 46.5KB payload, entire translation-drift class |
| Console watermark | — | 11 | — |

FAQ height animates via `grid-template-rows: 0fr → 1fr` (not `interpolate-size` —
Chromium-only). Slider keeps light JS (not `::scroll-button()` — Chrome-only). Reveals keep
IntersectionObserver (scroll-driven animations absent from Firefox).

Additionally:

- Shared `rafThrottle` / `prefersReducedMotion` / **counted scroll-lock** utility. Four
  modules currently write `body.style.overflow` directly: open the lightbox, toggle the
  menu, and the page scrolls behind the open modal.
- One shared IntersectionObserver for reveals, replacing four near-identical ones.
- `Intl.NumberFormat` in `counter.js` — German must read `12.500`, not `12,500`.
- `app.js` guards each `init()` so one throw cannot kill the remaining seven modules.
- Cache `getBoundingClientRect()` in the magnetic/tilt handlers — currently read on every
  `mousemove` with an immediate `style.transform` write, forcing synchronous reflow 60–120×/sec
  across 10 tilt targets on `services.html`.
- Reduced-motion guards on the six animated surfaces that ignore it (counter, FAQ, slider
  autoplay, gallery re-trigger, lightbox fade, ripple).

**JS: 1,813 → ~450.**

## Size

Honest accounting, not a flattering number. Both languages must be written in full, and
today German exists only as a 746-line dictionary covering a single page — so doing i18n
properly *adds* content even as it removes code.

| | Current | After |
|---|---|---|
| CSS | 4,052 | ~2,400 |
| JS | 1,813 | ~450 |
| HTML / templates | 2,307 | ~450 (layouts + partials + 8 page templates) |
| Structured data (services, gallery, faq, team, …) | — | ~250 |
| Content copy, DE + EN | (in the 746 JS lines) | ~600 |
| Config (`.eleventy.js`, `package.json`) | — | ~40 |
| **Total authored** | **8,172** | **~4,200** |

A ~49% reduction. The more useful comparison: 8,172 lines currently deliver **one**
translated page and a broken contact form; ~4,200 deliver **16 fully translated page
outputs** (8 pages × 2 languages) with the defects above fixed.

## UI/UX, accessibility, SEO

**Rendering bugs:** invisible headline; dark-on-dark `<h1>` on 4 pages + CTA banner; navbar
phone wrapping to three ragged lines at 1440px; hero stagger order.

**Refinement** (within the existing visual direction): type scale and spacing rhythm;
`focus-visible` states; 57 inline styles become classes — including
`style="…animation: none;"` repeated on five pages purely to *undo* a stylesheet rule, and
full component styling in markup at `contact.html:185-190` and `404.html:63-70`.

**Images:** all 49 get `width`/`height` + `srcset`/`sizes` + `decoding`. Unsplash URLs are
already parameterized, so responsive variants are free. Unbounded CLS → zero. Also fix
contradictory alt text from image reuse — `photo-1484101403633` is "Polished hardwood
floors" on two pages and "Floor-to-ceiling windows sparkling" on a third.

**Accessibility:** gallery becomes keyboard-operable (`<button>`/`<figure>`, not `<div>`);
slider gets a real pause control (WCAG 2.2.2 — 6s autoplay currently has none) and
`aria-hidden` on off-screen slides; the two fake `role="tablist"` widgets (gallery filters,
slider dots) are either completed or dropped — both currently announce a contract they do
not honor; `aria-label` moves off generic `<div>`s where it is silently ignored (all four
testimonial star ratings announce nothing); heading-order skips resolved (h2→h4 and h2→h5,
every page); `lang` attribute correct per language.

**SEO:** remove the invented `aggregateRating` (4.9/528) — fabricated review data violates
Google's structured-data policy and, in Germany, UWG §5. Add `FAQPage` (6 Q&As currently
unmarked — the biggest missed rich result here) and `BreadcrumbList` (4 pages have breadcrumb
nav, no markup). Add `url` to the LocalBusiness node. Drop `<meta name="title">` (not a real
tag) and `keywords` (ignored since 2009). Per-page OG/Twitter parity — 5 of 6 pages
currently have no `og:image`.

**Legal slots:** Impressum and Datenschutz page templates with clearly-marked `TODO` content
(§5 DDG requires an Impressum on German commercial sites; its absence invites Abmahnung).
Wire the consent checkbox's privacy link, currently `href="#"` on a form collecting personal
data. Placeholder stats and testimonials stay but move into data files as marked slots.

## Verification

A **screenshot harness** (Chrome headless, already installed) captures every page × 2
viewport widths before and after each structural step, so "this refactor changed nothing
visually" is a checked claim rather than a hope. This is what makes incremental migration
safe, and it is load-bearing: three static audits read `animations.css` and none caught the
invisible headline — only rendering did.

Also: axe-core for accessibility regressions, HTML validation, and a computed-style probe
harness (the technique that found the `opacity: 0`).

**Acceptance criteria:**

1. Contact form submits successfully with valid input; rejects invalid input; consent
   checkbox blocks submission when unchecked.
2. "obsessive care." renders visible, with contrast checked against the hero backdrop.
3. Every `<h1>` and CTA `<h2>` passes WCAG AA contrast against its actual background.
4. All 6 (now 8) pages render in both DE and EN with **no untranslated text**, verified by
   scanning output HTML for known-English strings under `/`.
5. Every page has correct `lang`, `canonical`, `hreflang` + `x-default`.
6. Zero images without `width`/`height`. CLS ≈ 0.
7. Gallery fully operable by keyboard; lightbox traps and restores focus.
8. axe-core reports no violations on any page.
9. No fabricated `aggregateRating` in output.
10. Authored line count ≈ 4,200, down from 8,172, while going from 1 translated page to 16
    translated page outputs.
11. `npm run build` produces a `_site/` folder deployable to any static host with no server
    configuration.

## Out of scope

- Redesigning the visual direction (explicitly decided: refine, don't reinvent).
- Writing real content, real photography, or real legal text — slots are built, content is
  the user's to supply.
- A CMS or admin interface.
- A real form backend. The mock is replaced with a documented single integration point.
- Dark mode.

## Risks

- **German copy.** ~30% of content has no German written. I will draft it; a native speaker
  must review before launch. Flagged, not solved.
- **Content parity.** One-template-per-language guarantees structure but means a missing
  translation is a build-visible gap. That is intended — it is the fix for silent drift.
- **Scope.** Five workstreams (build, CSS, JS, i18n, UI/UX). The screenshot harness and
  incremental sequencing are the mitigation; each step ships working.
- **Placeholder content on a "deployable" site.** The site will be structurally deployable
  but not launch-ready until stats, photography, and legal text are real. This must stay
  explicit in the README.
