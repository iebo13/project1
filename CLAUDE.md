# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BlitzBlank — a static, multi-page marketing site for a fictional Düsseldorf cleaning company. Built with **Eleventy (11ty) 3.1.6 + Nunjucks**. The site is structurally deployable (builds clean, tests pass, deploys to GitHub Pages) but **not launch-ready** — see [README.md](README.md) for what's still missing before this could go live.

This is Part 1 of a two-part rebuild: the HTML went from six hand-duplicated pages to a templated build. Part 2 (CSS restructure, JS platform-first rewrite, build-time i18n, legal pages, accessibility fixes) has not started. Anything described below as a known gap is deliberately deferred, not forgotten.

## Running

```bash
npm start                     # dev server on http://localhost:8080, rebuilds on change
npm run build                 # writes static output to _site/
npm test                      # Playwright: functional + visual regression, 42 tests
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
    site.js                # brand, contact details, nav links
    services.js             # the 10 services (see below)
    faq.js                  # 6 FAQ entries
    testimonials.js         # 4 testimonial slides
  index.njk, about.njk, services.njk, gallery.njk, contact.njk, 404.njk
```

Each `.njk` page sets `layout: layouts/base.njk` in its front matter and supplies only its `<main>` content — the navbar, footer, `<head>` meta, and script tags live once in the layout and its partials. Output URLs are unchanged from the pre-migration site: `_site/{index,about,services,gallery,contact,404}.html`.

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

**Do not** trust the older claim that "components reference variables, so palette changes only need to happen in `variables.css`." That is currently false: `css/*.css` contains 128 hand-written `rgba()` literals (about 45 of them the literal navy `rgba(15, 23, 42, …)`, i.e. `--color-primary` spelled out by hand). Roughly 31 box-shadows are pinned to that hardcoded hue. Changing `--color-primary` today will *not* repaint those shadows — they'll silently stay the old color. This is fixed in Part 2 via `color-mix()`; until then, treat `variables.css` as the source of truth for new code but don't assume existing code obeys it.

### Script order encodes init order — preserve it

`base.njk` loads nine `<script defer>` tags in this exact order, with `app.js` last:

```
i18n.js → animations.js → navigation.js → counter.js → faq.js → slider.js → gallery.js → contact.js → app.js
```

`js/app.js` is the single entry point: it waits for `DOMContentLoaded` and calls each module's `init()` guarded by `window.X &&`, so a module no-ops on a page lacking its markup (e.g. `404.html` only has markup for a subset of modules). `I18n.init()` must run before anything that measures or observes translated text, which is why `i18n.js` loads first and `app.js` — which triggers all the `init()` calls — loads last.

### Global-namespace modules — not Node/ES modules

Every file in [js/](js/) is an IIFE assigned to `window` (`window.I18n`, `window.Animations`, `window.Navigation`, `window.Counter`, `window.FAQ`, `window.Slider`, `window.Gallery`, `window.Contact`). These are plain `<script defer>` tags loaded by the browser, not `<script type="module">` and not processed by Eleventy or any bundler. The `"type": "module"` field in `package.json` governs Node's treatment of `.eleventy.js` and `src/_data/*.js` — it has no effect on `js/*.js`. Do not convert `js/*.js` to `import`/`export`; there is no build step that would resolve those imports before the browser loads the file.

Adding a module means: create the IIFE, assign it to `window`, add a `<script defer>` tag before `app.js` in `base.njk`, and add a guarded `init()` call in `app.js`.

### `js/i18n.js` is scheduled for deletion

[js/i18n.js](js/i18n.js) (746 lines, ~46.5KB) holds one dictionary shared by all pages: two flat objects (`en`, `de`) of ~540 keys each, dot-namespaced by page section (`hero.title1`, `services.eyebrow`). `applyTranslations()` walks `[data-i18n]` and swaps `textContent`; `[data-i18n-placeholder]` and `[data-i18n-aria]` handle those attributes. The choice persists to `localStorage` under `blitzblank-lang` and is auto-detected from the browser on first visit. A new key must be added to **both** `en` and `de`, or the missing language silently falls through.

This file still exists and is still load-bearing today, but Part 2 replaces it with build-time bilingual generation (localized URLs like `/leistungen/`) and deletes it. Don't invest in growing this system further — extend it if you must, but treat it as on its way out.

### Behaviour driven by data attributes

Markup opts into JS behaviour declaratively: `data-reveal` (+ `data-reveal-delay`, `data-stagger`) for scroll reveal, `data-magnetic`, `data-tilt`, `data-count`/`data-counter` for counters, `data-category`/`data-full` on gallery cards. Adding an animated element usually means adding the attribute, not touching JS. Animation code checks `prefers-reduced-motion` and feature-detects `IntersectionObserver`, falling back to the visible end-state — keep that pattern in new animation work.

## Testing

Playwright ([playwright.config.js](playwright.config.js)) is both the test runner and the visual-regression harness, run across two projects (`desktop`, `mobile`). 42 tests total, covering smoke checks, hero content, heading contrast, contact-form validation, and 12 committed visual baselines under `tests/visual.spec.js-snapshots/`.

**The visual baselines are the migration's proof of correctness — never update them just to make a failure go away.** `npm run test:update-snapshots` exists for *intentional* visual changes only; running it to silence an unexplained diff destroys the thing it exists to catch. If a visual test fails, find out why the render changed before touching the baseline.

CI (`.github/workflows/deploy.yml`) deliberately runs only the functional tests (`smoke`, `hero`, `headings`, `contact-form`) with `--ignore-snapshots`, skipping the visual suite — a GitHub Actions runner's font stack and GPU differ enough from a dev machine that every visual test would fail for reasons unrelated to the change. The visual suite is a local/dev-machine safety net, not a deploy gate.

## Fixed bugs worth knowing about

Four real, user-facing bugs were found and fixed during the migration (see git history for the individual commits):

- The contact form could never be submitted — a validator signature bug in `js/contact.js` (`minLength`) rejected every submission regardless of input.
- The consent checkbox was never actually validated before submission.
- The hero headline's third line ("obsessive care.") had `opacity: 0` from a CSS cascade collision and had never been visible to any visitor.
- Headings rendered dark navy on dark navy across four page heroes (about, services, gallery, contact) and the CTA banner.

## Notes

- `assets/` is empty; all imagery is hot-linked from Unsplash. Two of the photo IDs currently used (`photo-1556909114-44e3e9399a2e`, `photo-1567548083313-04c67ac2f4f0`) 404.
- The contact form in [js/contact.js](js/contact.js) is a mock — a `setTimeout` promise stands in for the request. Wiring a backend means replacing that block with `fetch()`.
- There is no Impressum or Datenschutz (privacy policy) page yet, and the consent checkbox and footer "Privacy" link both point to `href="#"`. See [README.md](README.md) for why this matters before deploying for real.
- Deploy is [.github/workflows/deploy.yml](.github/workflows/deploy.yml): builds and publishes `_site/` to GitHub Pages on push to `main`. All site links are relative, so Pages' `/<repo>/` subpath works with no `pathPrefix` configured.
