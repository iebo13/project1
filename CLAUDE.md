# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BlitzBlank — a static, multi-page marketing site for a fictional Düsseldorf cleaning company. Built with **Eleventy (11ty) 3.1.6 + Nunjucks**. The site is structurally deployable (builds clean, tests pass, deploys to GitHub Pages) but **not launch-ready** — see [README.md](README.md) for what's still missing before this could go live.

Rebuild status: the HTML is a templated 11ty build, the JS is platform-first
(native `<details>`, `<dialog>`, and constraint validation), and translation
resolves at build time. **Still outstanding:** the CSS restructure (`@layer`,
`color-mix()`, intrinsic layout), image `width`/`height` + `srcset`, the
remaining accessibility gaps (slider pause control, the two fake
`role="tablist"` widgets), and the Impressum/Datenschutz pages. Anything
described below as a known gap is deliberately deferred, not forgotten.

## Running

```bash
npm start                     # dev server on http://localhost:8080, rebuilds on change
npm run build                 # writes static output to _site/
npm test                      # 3 build-output tests + 136 Playwright tests
npm run test:build            # just the build-output tests (fast, no browser)
npm run test:update-snapshots # regenerate visual baselines for *intentional* visual changes only
```

`package.json` has `"type": "module"` — this applies to `.eleventy.js` and files under `src/_data/`, which use `export default`. It does **not** apply to `js/*.js` (see below).

**Never edit `_site/`.** It's Eleventy's build output, is gitignored, and gets clobbered on every build.

## Architecture

### Source layout

```
src/
  _includes/
    layouts/base.njk       # <head>, preloader, navbar include, footer include, script tags
    partials/
      navbar.njk
      footer.njk
      service-card.njk
  _data/
    site.js                # brand, origin, contact details, nav structure
    langs.js               # language codes + per-language slugs
    dict.js                # the 287-key EN/DE translation table
    meta.js                # per-page <title>/<meta description>, per language
    services.js            # the 10 services (see below)
    faq.js                 # 6 FAQ entries
    testimonials.js        # 4 testimonial slides
  index.njk, services.njk, gallery.njk, contact.njk, 404.njk
```

The former `about.njk` was merged into the contact page in July 2026: the About
content (mission, vision, the five values) now renders as the `#about` section
on `/kontakt/` (and `/en/contact/#about`). There is no standalone About page or
route.

### Deploying to a subpath

GitHub Pages serves this repo at `https://<user>.github.io/<repo>/`, not a
domain root. Two env vars handle that, both set by the deploy workflow from
`actions/configure-pages`:

- `BASE_PATH` (e.g. `/project1`) — prefixed onto every href by the `url` and
  `asset` filters.
- `SITE_ORIGIN` — the scheme+host for `canonical`/`hreflang`/`og:url`.

Unset, both default to the root, so `npm start` and the tests are unaffected.

**Do not add 11ty's `pathPrefix`.** It rewrites permalinks too, and combined
with the `url` filter it writes `_site/project1/kontakt/` — which Pages then
serves at `/project1/project1/`. Permalinks use `permalinkFor` (never
prefixed; Pages already serves `_site/` *at* the subpath), hrefs use `url`
(always prefixed). [tests/pathprefix.test.mjs](tests/pathprefix.test.mjs)
asserts both.

Each `.njk` page sets `layout: layouts/base.njk` in its front matter and supplies only its `<main>` content — the navbar, footer, `<head>` meta, and script tags live once in the layout and its partials. Output lands at localized paths — German at the root, English under `/en/`: `_site/index.html`, `_site/leistungen/`, `_site/galerie/`, `_site/kontakt/` and their `_site/en/{index.html,services,gallery,contact}/` counterparts, plus a single `_site/404.html`.

`css/` and `js/` are passed through unmodified by `.eleventy.js` (`addPassthroughCopy`) — they are not part of the `src/` template tree and Eleventy does not process them.

### Content lives in data, not markup

Adding a service means adding one entry to `src/_data/services.js` — the services-page card, its detail section, the footer link, and (if `onHome: true`) the homepage card all render from that one entry. Two things about the shape of a service entry are intentional, not bugs to "fix":

- Services carry both `blurb`/`icon` **and** `homeBlurb`/`homeIcon`. The homepage and the services page were hand-authored independently before the migration and genuinely use different copy (and, for three services, a different icon) for the same service. `homeBlurb`/`homeIcon` preserve that disagreement rather than silently unifying it.
- `onHome` and `homeOrder` exist because the homepage shows a hand-picked, reordered subset of six of the ten services — not the first six in catalogue order.

The same pattern applies to `faq.js` (6 entries → the homepage FAQ accordion) and `testimonials.js` (4 entries → the homepage reviews slider).

### Stylesheet order encodes the cascade — preserve it

`base.njk` links five stylesheets in this exact order:

```
variables.css → animations.css → components.css → style.css → responsive.css
```

Later files rely on cascade position, not specificity, to override earlier ones. Reordering these links changes rendering. If you add a new stylesheet, decide deliberately where in this chain it belongs.

The palette is real: `variables.css`'s alpha variants, overlays, glass tiers, and gradients are all derived from the base color tokens via `color-mix()` rather than spelled out as hand-written `rgba()` literals. Changing `--color-primary` propagates through every overlay, shadow, and glass surface that references it. `variables.css` remains the source of truth — don't add a new hand-written `rgba()`/hex literal when a token or a `color-mix()` derived from one already exists.

Glassmorphism is a deliberate 3-tier system (see
docs/superpowers/specs/2026-07-16-visual-refresh-design.md): `.glass-strong`
(navy tint over photos/dark bands, carries its own white text + shadow),
soft-tier card surfaces (`.card`, `.service-card`, `.mv-card`, `.value-card`
over `.section--blobs` backgrounds), and `.glass-backdrop` (max one large
frosted container per page). All tiers collapse to solid surfaces under
`prefers-reduced-transparency` and when `backdrop-filter` is unsupported. The
navbar is deliberately NOT glass — solid navy at top, solid white when
scrolled, no per-page variants.

### Script order encodes init order — preserve it

`base.njk` loads seven `<script defer>` tags in this exact order, with `app.js` last:

```
animations.js → navigation.js → counter.js → slider.js → gallery.js → contact.js → app.js
```

`js/app.js` is the single entry point: it waits for `DOMContentLoaded` and calls each module's `init()` guarded by `window.X &&`, so a module no-ops on a page lacking its markup. It must load last. Paths are root-relative (`/js/...`) because pages now live at varying depths (`/kontakt/`, `/en/contact/`).

### Global-namespace modules — not Node/ES modules

Every file in [js/](js/) is an IIFE assigned to `window` (`window.Animations`, `window.Navigation`, `window.Counter`, `window.Slider`, `window.Gallery`, `window.Contact`). These are plain `<script defer>` tags loaded by the browser, not `<script type="module">` and not processed by Eleventy or any bundler. The `"type": "module"` field in `package.json` governs Node's treatment of `.eleventy.js` and `src/_data/*.js` — it has no effect on `js/*.js`. Do not convert `js/*.js` to `import`/`export`; there is no build step that would resolve those imports before the browser loads the file.

Adding a module means: create the IIFE, assign it to `window`, add a `<script defer>` tag before `app.js` in `base.njk`, and add a guarded `init()` call in `app.js`.

### Translation happens at build time — there is no runtime i18n

Every page except `404.njk` paginates over `langs.codes` and renders once per
language. `js/i18n.js` (746 lines, 46.5KB) was deleted: no dictionary ships to
the browser, and there is no `localStorage` language preference to go stale.

```njk
---
pagination: { data: langs.codes, size: 1, alias: lang }
eleventyComputed:
  permalink: "{{ 'contact' | url(lang) }}index.html"
  pageKey: 'contact'
---
{% set d = dict[lang] %}
<h1>{{ 'page.contact.title' | t(d) }}</h1>
```

Two filters do the work, both defined in `.eleventy.js`:

- `{{ 'key' | t(d) }}` looks a key up. **It throws at build time on a missing
  key** rather than rendering the raw key string into the page — which is
  exactly how the old runtime switcher failed silently.
- `{{ 'services' | url(lang) }}` resolves a page key to `/leistungen/` or
  `/en/services/`. Never hardcode a page href.

URLs are localized, German at the root (it is the primary market, and rooting
it means no redirect at `/` — which a static host cannot do without server
config):

| key | de | en |
|---|---|---|
| home | `/` | `/en/` |
| services | `/leistungen/` | `/en/services/` |
| gallery | `/galerie/` | `/en/gallery/` |
| contact | `/kontakt/` | `/en/contact/` |

Adding a string means adding it to **both** `en` and `de` in `dict.js` — but
unlike the old system, forgetting one breaks the build instead of silently
falling back. `tests/i18n.spec.js` additionally scans every German page for
English strings and asserts no i18n dictionary is ever requested.

**`404.njk` is the deliberate exception**: it is not paginated. A static host
serves one error document per origin and cannot negotiate its language, so it
is emitted once in German with links to both language homes.

### Behaviour driven by data attributes

Markup opts into JS behaviour declaratively: `data-reveal` (+ `data-reveal-delay`, `data-stagger`) for scroll reveal, `data-magnetic`, `data-tilt`, `data-count`/`data-counter` for counters, `data-category`/`data-full` on gallery cards. Adding an animated element usually means adding the attribute, not touching JS. Animation code checks `prefers-reduced-motion` and feature-detects `IntersectionObserver`, falling back to the visible end-state — keep that pattern in new animation work.

## Testing

Playwright ([playwright.config.js](playwright.config.js)) is both the test runner and the visual-regression harness, run across two projects (`desktop`, `mobile`). 136 tests, covering smoke checks, hero content, heading contrast, native form validation, navbar geometry in both languages, translation coverage ([tests/i18n.spec.js](tests/i18n.spec.js)), and 10 committed visual baselines under `tests/visual.spec.js-snapshots/`.

[tests/i18n.spec.js](tests/i18n.spec.js) is worth knowing about: it scans every German page for English strings that appeared in the pre-migration markup, so the "only the nav translates" bug cannot come back silently.

**The visual baselines are the migration's proof of correctness — never update them just to make a failure go away.** `npm run test:update-snapshots` exists for *intentional* visual changes only; running it to silence an unexplained diff destroys the thing it exists to catch. If a visual test fails, find out why the render changed before touching the baseline.

CI (`.github/workflows/deploy.yml`) deliberately runs only the functional tests (`smoke`, `hero`, `headings`, `contact-form`, `i18n`, `navbar`) with `--ignore-snapshots`, skipping the visual suite — a GitHub Actions runner's font stack and GPU differ enough from a dev machine that every visual test would fail for reasons unrelated to the change. The visual suite is a local/dev-machine safety net, not a deploy gate.

## Fixed bugs worth knowing about

Four real, user-facing bugs were found and fixed during the migration (see git history for the individual commits):

- The contact form could never be submitted — a validator signature bug in `js/contact.js` (`minLength`) rejected every submission regardless of input.
- The consent checkbox was never actually validated before submission.
- The hero headline's third line ("obsessive care.") had `opacity: 0` from a CSS cascade collision and had never been visible to any visitor.
- Headings rendered dark navy on dark navy across four page heroes (about, services, gallery, contact) and the CTA banner. The per-page `navbarSolid`/`.navbar--solid` variant that enabled this bug class was later removed entirely — navbar styling is scroll-state-driven only.

## Notes

- `assets/` is empty; all imagery is hot-linked from Unsplash.
- The contact form in [js/contact.js](js/contact.js) is a mock — a `setTimeout` promise stands in for the request. Wiring a backend means replacing that block with `fetch()`.
- There is no Impressum or Datenschutz (privacy policy) page yet, and the consent checkbox and footer "Privacy" link both point to `href="#"`. See [README.md](README.md) for why this matters before deploying for real.
- Deploy is [.github/workflows/deploy.yml](.github/workflows/deploy.yml): builds and publishes `_site/` to GitHub Pages on push to `main`. All site links are relative, so Pages' `/<repo>/` subpath works with no `pathPrefix` configured.
