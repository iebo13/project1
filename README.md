# BlitzBlank — Premium Reinigung Düsseldorf

A multi-page marketing website for a fictional boutique cleaning company based in Düsseldorf. Built with **Eleventy (11ty) 3.1.6 + Nunjucks**, vanilla CSS3, and vanilla JavaScript (ES6+, global-namespace pattern — see [CLAUDE.md](CLAUDE.md)). Six pages render from one shared layout; content (services, FAQ, testimonials) is data-driven.

> **Status: structurally deployable, not launch-ready.** The build is clean, the test suite is green, and it deploys to GitHub Pages on every push to `main`. But: the stats (500+ clients, 12,500+ cleans, the 4.9★/528-review rating in the homepage JSON-LD) and all four testimonials are placeholder content, not real customer data; every image is hot-linked from Unsplash rather than hosted locally (and two of the current photo IDs already 404); and there is **no Impressum or Datenschutz (privacy policy) page** — the consent checkbox and the footer's "Privacy" link both point to `href="#"`. For a commercial site actually operating in Germany, an Impressum is a legal requirement (§5 DDG), not a nice-to-have. All of this is scoped for Part 2 of the rebuild; see [CLAUDE.md](CLAUDE.md) for what Part 2 covers.

---

## ✨ Highlights

- **Bilingual EN/DE, resolved at build time** — every page is rendered twice with localized URLs (German at the root, English under `/en/`), correct `lang`/`canonical`/`hreflang`, and per-language `<title>`/`<meta description>`. No translation JavaScript ships to the browser.
- **Deliberate glassmorphism** — a restrained 3-tier glass system in the page sections (glass stat chips, frosted cards, one backdrop panel per page); the navbar is deliberately solid, not glass
- **Awwwards-grade design** — soft shadows, large whitespace, fluid typography via `clamp()`
- **5 pages, 1 layout** — Home, Services, Gallery, Contact, 404, all rendered from `src/_includes/layouts/base.njk`
- **10 services, data-driven** — each with its own dedicated detail section; adding one is a single entry in `src/_data/services.js`
- **Premium interactions** — scroll reveal, parallax hero, magnetic buttons, ripple effect, tilt cards, animated counters, testimonial slider, lightbox, accordion FAQ
- **Fully responsive** — fluid layout from 320px to 4K via CSS Grid + Flexbox
- **SEO tags present** — semantic HTML, meta tags, Open Graph, Twitter Cards, JSON-LD (note: the JSON-LD's `aggregateRating` is placeholder data, not a real review count — see the status note above)
- **Performance-conscious** — `loading="lazy"` images, IntersectionObserver-driven animations, `requestAnimationFrame` parallax
- **Zero runtime dependencies** — the built site loads only Google Fonts externally; Eleventy, Playwright, and axe-core are dev-time tooling only, not shipped to the browser

---

## 📁 File Structure

```
project1/
├── src/                          # Eleventy source — never edit _site/, it's generated
│   ├── index.njk                 # Home page
│   ├── services.njk              # All 10 services + detail sections + process
│   ├── gallery.njk                # Filterable grid + lightbox
│   ├── contact.njk               # Contact form with validation + map placeholder
│   ├── 404.njk                   # Custom error page (loads a reduced set of scripts)
│   ├── _includes/
│   │   ├── layouts/
│   │   │   └── base.njk          # <head>, preloader, stylesheet + script tags, navbar/footer includes
│   │   └── partials/
│   │       ├── navbar.njk
│   │       ├── footer.njk
│   │       └── service-card.njk
│   └── _data/
│       ├── site.js               # brand, tagline, phone, email, address, nav links
│       ├── services.js           # the 10 services (card + detail copy, homepage subset)
│       ├── faq.js                # 6 FAQ entries
│       └── testimonials.js       # 4 testimonial slides
│
├── css/                          # Passed through unmodified by Eleventy — not templated
│   ├── variables.css             # Design tokens (colors, typography, spacing, shadows)
│   ├── animations.css            # Keyframes, scroll-reveal, decorative animations
│   ├── components.css            # Reusable UI components (buttons, cards, slider, lightbox, FAQ)
│   ├── style.css                 # Base reset + main layout + section styles
│   └── responsive.css            # Breakpoints: 1200 / 1024 / 768 / 540 / 380 + print
│
├── js/                            # Passed through unmodified — browser scripts, NOT Node modules
│   ├── app.js                    # Entry point — orchestrates all modules, loaded last
│   ├── animations.js             # Scroll reveal, parallax, ripple, magnetic, tilt
│   ├── navigation.js              # Sticky navbar, mobile menu, preloader, back-to-top
│   ├── counter.js                # Animated stat counters (IntersectionObserver + rAF)
│   ├── slider.js                 # Testimonials slider with autoplay + swipe + keyboard
│   ├── gallery.js                # Filtering + lightbox + lazy loading
│   ├── faq.js                    # Accessible accordion
│   └── contact.js                # Form validation + submission (mock) + toast
│
├── assets/                       # Reserved for local images/icons/fonts — currently empty; all imagery is hot-linked
├── tests/                        # Playwright: functional tests + visual-regression baselines
│   ├── *.spec.js
│   └── visual.spec.js-snapshots/ # 12 committed PNGs — never update these to make a failure disappear
├── .github/workflows/deploy.yml  # Builds + deploys _site/ to GitHub Pages on push to main
├── .eleventy.js                  # Eleventy config: src/ → _site/, passthrough copy for css/js/assets
├── playwright.config.js
├── package.json
└── _site/                        # Build output — gitignored, regenerated by `npm run build`
```

---

## 🎨 Design System

### Color Palette
| Token        | Hex       | Usage                              |
|--------------|-----------|------------------------------------|
| Primary      | `#0F172A` | Dark text, dark sections, navbar   |
| Secondary    | `#2563EB` | Primary accent, CTAs, gradients    |
| Accent       | `#06B6D4` | Highlights, gradient partner       |
| Success      | `#10B981` | Checkmarks, success states         |
| Background   | `#F8FAFC` | Page background                    |
| Cards        | `#FFFFFF` | Card surfaces                      |
| Text         | `#0F172A` | Body text                          |
| Muted        | `#64748B` | Secondary text                     |
| Borders      | `#E2E8F0` | Card borders, dividers             |

**These tokens live in `css/variables.css`, but changing them does not currently repaint the whole site.** `css/*.css` contains 128 hand-written `rgba()` literals that bypass the tokens entirely — including the primary navy spelled out by hand in roughly 31 box-shadow declarations. Editing `--color-primary` will not update those shadows; they'll silently stay the old hue. This is fixed in Part 2 via `color-mix()`. Until then, treat the token list above as the intended palette, not a guarantee of what every pixel currently uses.

### Typography
- **Family:** Inter (Google Fonts), weights 300–800
- **Fluid scale:** `clamp()`-based, scales smoothly across viewports (`--fs-xs` at ~12px up to `--fs-6xl` at ~88px)

### Spacing & Radius
- Spacing scale: `--space-1` (0.25rem) → `--space-40` (10rem)
- Radius scale: `--radius-sm` (8px) → `--radius-2xl` (44px) + `--radius-pill`

---

## 🚀 Usage

```bash
npm install         # installs Eleventy, Playwright, axe-core (dev dependencies only)
npm start            # dev server at http://localhost:8080, rebuilds on change
npm run build         # writes static output to _site/
npm test             # Playwright: 97 tests — functional checks + visual regression
```

Playwright's config auto-starts `npm start` for you when you run `npm test`, so you don't need to run the dev server separately first. There is no `file://`-based workflow anymore — Eleventy needs its dev server (or a build) to resolve templates and passthrough assets correctly.

---

## ⚙️ Customisation

### Change brand name
The brand and tagline shown in the navbar and footer come from `site.brand` / `site.tagline` in `src/_data/site.js` — start there. That said, `BlitzBlank` is **not** centralized: it also appears as a literal string in `src/_includes/layouts/base.njk` (page titles, meta tags, JSON-LD `name`), in page copy across `src/*.njk` (e.g. "Königsallee-Zentrale" references in `contact.njk`), and in `package.json`. A full rebrand still means searching the project for `BlitzBlank` and reviewing each hit — there's no single source of truth for it yet. Also update the logo SVG path in `src/_includes/partials/navbar.njk` and `footer.njk`.

### Change color palette
Edit `css/variables.css` → `:root` block for new work. But see the Design System note above: 128 hardcoded `rgba()` literals elsewhere in `css/*.css` do **not** reference these tokens, so a token change alone will not repaint everything. Finding and converting those literals is Part 2 scope.

### Add a service
Add one entry to the array in `src/_data/services.js`. That single entry drives the services-page card, its detail section further down `services.njk`, the footer's "Services" column link, and — if you set `onHome: true` and a `homeOrder` — a card on the homepage. If the service should read differently on the homepage than on the services page (common — the two pages were originally written independently), also set `homeBlurb` and/or `homeIcon`; otherwise the homepage falls back to `blurb`/`icon`.

### Add a gallery image
Add a new `.gallery-card` to the grid in `src/gallery.njk` (there's no data file for gallery images yet — this one's still manual markup). Set `data-category` to one of the filter values (`residential`, `commercial`, `industrial`, `deep`, `hospitality`, `medical`). Set `data-full` to a higher-resolution URL for the lightbox.

### Update contact details
`site.phone`, `site.phoneHref`, `site.email`, and `site.address` in `src/_data/site.js` drive the footer and navbar. `src/contact.njk`, however, still hardcodes the same phone/email/address as literals in its contact-info list and map section — update those by hand too, or they'll drift from `site.js`.

### Add or edit translations
Open `src/_data/dict.js` and add the key to **both** `en` and `de`. Then use it
in a template:

```njk
{% set d = dict[lang] %}
<h1>{{ 'your.new.key' | t(d) }}</h1>
```

Forgetting one language **breaks the build** — `t` throws on a missing key
rather than silently rendering the raw key string into the page.

For links, never hardcode an href — `{{ 'services' | url(lang) }}` resolves to
`/leistungen/` or `/en/services/` depending on the page's language.

Per-page `<title>` and `<meta description>` live in `src/_data/meta.js`, not the
dictionary.

### Wire the contact form to a backend
Open `js/contact.js` and replace the mock `await new Promise(...)` block in the submit handler with a real `fetch()` call to your endpoint.

---

## ♿ Accessibility

What's actually true today:

- **Skip link** to main content on every page
- **ARIA labels** on icon-only buttons (nav toggle, back-to-top, social icons, lightbox controls, slider prev/next/dots)
- **FAQ accordion** is fully accessible: native `<button>` triggers with `aria-expanded`/`aria-controls`, keyboard-operable by default
- **Testimonial slider** supports arrow-key navigation and pauses autoplay on hover, focus, and when the tab is hidden
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables animations
- **High contrast** — `@media (prefers-contrast: high)` strengthens borders and muted text
- **Form validation** — `aria-live="polite"` on every field error and the form status message; focus moves to the first invalid field on submit
- **Dark-hero heading contrast** — `<h1>`/`<h2>` on the three dark-hero pages (services, gallery, contact) and the CTA banner were fixed to clear 4.5:1 contrast and are covered by an automated test (`tests/headings.spec.js`)

What's **not** true yet, despite earlier claims — both deferred to Part 2:

- **Gallery cards are not keyboard-reachable.** They're plain `<div class="gallery-card">` elements with a click listener, no `tabindex`, and no keydown handler — a keyboard-only user cannot open the lightbox at all.
- **The lightbox is permanently `aria-hidden="true"`.** The markup sets `aria-hidden="true"` once and the JS only ever toggles an `is-open` class — it never flips `aria-hidden` when the dialog opens, so assistive technology is told the open dialog doesn't exist.

We're not claiming full WCAG AA sitewide — only the specific contrast fix above has automated coverage.

---

## 🖥️ Browser / Environment Notes

Automated testing runs against Chromium only (Playwright's `desktop` project uses Desktop Chrome; `mobile` emulates a Pixel 7, also Chromium-based). The CSS uses progressive-enhancement patterns (`@supports`-free fallbacks for `backdrop-filter`, feature-detected `IntersectionObserver`) that should degrade reasonably elsewhere, but there's no current automated or manual verification in Firefox or Safari.

---

## 📦 What's Inside the Box

### Animations
- Scroll-reveal with `IntersectionObserver` (stagger support via `data-stagger`)
- Hero parallax via `requestAnimationFrame`
- Button ripple effect (delegated click listener)
- Magnetic hover on `[data-magnetic]` elements
- 3D tilt on `[data-tilt]` cards (mouse / pointer only — disabled on touch)
- Animated counters with `easeOutExpo` easing
- Marquee strip with pause-on-hover
- Floating decorative blobs

### Components
- Glassmorphic sticky navbar with scroll state + mobile drawer
- Hero with background image, gradient overlay, staggered text reveal
- Stat cards with animated counters
- Service cards with hover lift, gradient top-bar, icon rotation
- Testimonial slider with autoplay, swipe, keyboard nav, dots, prev/next
- Filterable grid gallery + lightbox (mouse/pointer only — see Accessibility)
- FAQ accordion (single-open, smooth height animation, ARIA-compliant)
- Contact form with live validation, loading state, toast feedback
- Footer with 4 columns + newsletter signup
- Back-to-top button + preloader

---

## 📝 License

This is a demonstration project. All Unsplash images are royalty-free under the Unsplash License. Replace branding, copy, and imagery with your own before deploying — and see the status note at the top of this file before deploying at all.

---

## 🛠️ Built With

- [Eleventy (11ty)](https://www.11ty.dev/) 3.1.6 + Nunjucks templating
- HTML5 (semantic landmarks)
- CSS3 (custom properties, Grid, Flexbox, `clamp()`, `backdrop-filter`)
- Vanilla JavaScript ES6+ (global-namespace modules, IntersectionObserver, requestAnimationFrame) — see [CLAUDE.md](CLAUDE.md) for why these aren't ES modules
- [Playwright](https://playwright.dev/) for functional and visual-regression testing
- Google Fonts — Inter

---

**Crafted with obsessive attention to detail — exactly how we'd clean your space.**
