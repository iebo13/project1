# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BlitzBlank — a static, multi-page marketing site for a fictional Düsseldorf cleaning company. Pure HTML5 + CSS3 + vanilla ES6. No build step, no npm, no dependencies (Google Fonts is the only external resource).

## Running

There is nothing to build, lint, or test — no test suite exists.

```bash
xdg-open index.html      # works directly over file://
python -m http.server 8000   # optional, for a hot-reload-style workflow
```

## Architecture

### Global-namespace modules (not ES modules)

Every file in [js/](js/) is an IIFE that assigns itself to `window` (`window.I18n`, `window.Animations`, `window.Navigation`, `window.Counter`, `window.FAQ`, `window.Slider`, `window.Gallery`, `window.Contact`). This is deliberate: `<script type="module">` would trip CORS over `file://`, and the site must open by double-clicking `index.html`. **Do not convert these to `import`/`export`.**

Each page loads the modules as plain `<script defer>` tags, and [js/app.js](js/app.js) — loaded last — is the single entry point. It waits for `DOMContentLoaded` and calls each module's `init()` guarded by `window.X &&`, so modules no-op on pages lacking their markup. Order matters: `I18n.init()` runs first so translated text is in the DOM before anything measures or observes it.

Adding a module means: create the IIFE, assign to `window`, add a `<script defer>` before `app.js` on every page, and add a guarded `init()` call in `app.js`.

### Pages

Six pages ([index.html](index.html), [about.html](about.html), [services.html](services.html), [gallery.html](gallery.html), [contact.html](contact.html), [404.html](404.html)) each carry their own full copy of the navbar, footer, `<head>` meta, and JSON-LD — there is no templating. Any change to shared chrome must be repeated across all six. [404.html](404.html) intentionally loads only 4 of the 9 modules.

### Translations

[js/i18n.js](js/i18n.js) holds one dictionary shared by all pages: two flat objects (`en`, `de`) of ~540 keys each, dot-namespaced by page section (`hero.title1`, `services.eyebrow`). `applyTranslations()` walks `[data-i18n]` and swaps `textContent`; `[data-i18n-placeholder]` and `[data-i18n-aria]` handle those attributes. The choice persists to `localStorage` under `blitzblank-lang` and is auto-detected from the browser on first visit.

A new key must be added to **both** `en` and `de`, or the missing language silently falls through.

### Styling

Five stylesheets load in a fixed order that encodes the cascade — `variables.css` → `animations.css` → `components.css` → `style.css` → `responsive.css`. Preserve that order when adding link tags. All design tokens (color, fluid `clamp()` type scale, spacing, radius, shadow, glassmorphism blur) live in the `:root` block of [css/variables.css](css/variables.css); components reference variables rather than literals, so palette changes should be made there and nowhere else.

### Behaviour driven by data attributes

Markup opts into JS behaviour declaratively rather than through per-element wiring: `data-reveal` (+ `data-reveal-delay`, `data-stagger`) for scroll reveal, `data-magnetic`, `data-tilt`, `data-count` for counters, `data-category`/`data-full` on gallery cards. Adding an animated element usually means adding the attribute, not touching JS.

Animation code checks `prefers-reduced-motion` and feature-detects `IntersectionObserver`, falling back to the visible end-state. Keep that pattern in new animation work.

## Notes

- The contact form in [js/contact.js](js/contact.js) is a mock — a `setTimeout` promise stands in for the request. Wiring a backend means replacing that block with `fetch()`.
- [README.md](README.md) is partly stale: its "Change brand name" section says to search-replace `Lumière`, but the brand throughout the code is `BlitzBlank`. Trust the code over the README here.
- [assets/](assets/) is empty; all imagery is hot-linked from Unsplash.
