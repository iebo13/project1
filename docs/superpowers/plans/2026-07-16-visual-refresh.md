# BlitzBlank Visual & Navigation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved spec ([docs/superpowers/specs/2026-07-16-visual-refresh-design.md](../specs/2026-07-16-visual-refresh-design.md)): trim the header nav to real pages, replace the glass navbar with solid navy→white states, move glassmorphism into a named 3-tier system inside page sections, rebuild the homepage hero as a dark split (V5) and interior heroes as fixed-contrast photo bands (C), redesign the scroll hint, and replace two 404ing photos.

**Architecture:** Static 11ty 3.1.6 + Nunjucks site. Content lives in `src/_data/*.js`; pages paginate over languages; CSS is five plain files loaded in cascade order (`variables → animations → components → style → responsive`); JS is global-namespace IIFEs. All changes are data/template/CSS-level — no new JS modules, no build-pipeline changes.

**Tech Stack:** Eleventy 3.1.6, Nunjucks, plain CSS (`color-mix()`, `backdrop-filter`), Playwright 1.61 (2 projects: `desktop` 1440×1000, `mobile` Pixel 7), `node --test` build-output tests.

## Global Constraints

- Never edit `_site/` — it is build output.
- Stylesheet link order in `base.njk` encodes the cascade: `variables.css → animations.css → components.css → style.css → responsive.css`. Do not reorder; put new rules in the file the section says.
- New colors use `color-mix()` on the `--color-*` tokens, never hand-written `rgba()` literals.
- Never hardcode a page href in templates — use `{{ 'key' | url(lang) }}`.
- Any new user-visible string must be added to BOTH `en` and `de` in `src/_data/dict.js` (a missing key fails the build). This plan adds none.
- Visual baselines (`tests/visual.spec.js-snapshots/`) are regenerated exactly once, in Task 9, after eyeballing every diff. Never run `npm run test:update-snapshots` in any earlier task.
- Playwright runs each spec in BOTH projects. Desktop-only assertions must skip below 1280px: `test.skip(({ viewport }) => !viewport || viewport.width < 1280, '...')`.
- `git stash list` contains `stash@{0}` (user's WIP touching `css/animations.css`). Do not pop, drop, or otherwise touch the stash.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Full Playwright suite: `npx playwright test` (auto-starts the dev server). Single file: `npx playwright test tests/hero.spec.js`. Build-output tests only: `npm run test:build`.

---

### Task 1: Trim the header nav to real pages (`inHeader` flag)

**Files:**
- Modify: `package.json:10-12` (serialize `node --test` files)
- Create: `tests/nav-structure.test.mjs`
- Modify: `src/_data/site.js:28-36`
- Modify: `src/_includes/partials/navbar.njk:17`
- Modify: `tests/navbar.spec.js:3` (stale comment)

**Interfaces:**
- Consumes: nothing.
- Produces: `site.nav[*].inHeader: boolean` — navbar renders only `inHeader` items; `footer.njk` continues to render all 7 items unchanged (it iterates `site.nav` without a filter — do not touch it).

- [ ] **Step 1: Serialize the build-output tests**

`node --test` runs test files in parallel processes, and both this new test and `tests/pathprefix.test.mjs` rebuild `_site/` with `rmSync` — racing them corrupts both. In `package.json`, change the two scripts:

```json
    "test": "node --test --test-concurrency=1 tests/*.test.mjs && playwright test",
    "test:build": "node --test --test-concurrency=1 tests/*.test.mjs"
```

- [ ] **Step 2: Write the failing test**

Create `tests/nav-structure.test.mjs`:

```js
// The header nav lists only real pages. Reviews and FAQ are homepage
// *sections* (/#reviews, /#faq) — from an interior page a header link to them
// unexpectedly navigates back to the homepage, so they live in the footer
// only. Guards both directions: header stays at 5, footer keeps all 7.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

test('header nav lists only real pages; footer keeps the anchor links', () => {
  rmSync('_site', { recursive: true, force: true });
  execFileSync('npx', ['@11ty/eleventy'], {
    env: { ...process.env, BASE_PATH: '', SITE_ORIGIN: '' },
    stdio: 'pipe',
  });
  const html = readFileSync('_site/index.html', 'utf8');

  const header = html.match(/<nav class="nav-menu"[\s\S]*?<\/nav>/)[0];
  assert.equal((header.match(/class="nav-link"/g) || []).length, 5,
    'header should show exactly the 5 real pages');
  assert.ok(!header.includes('#reviews') && !header.includes('#faq'),
    'homepage anchors must not appear in the header');

  const footer = html.match(/<footer[\s\S]*<\/footer>/)[0];
  assert.ok(footer.includes('href="/#reviews"'), 'Reviews must stay reachable from the footer');
  assert.ok(footer.includes('href="/#faq"'), 'FAQ must stay reachable from the footer');
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test:build`
Expected: the new test FAILS with `header should show exactly the 5 real pages` (actual: 7). The two pathprefix tests still pass.

- [ ] **Step 4: Add the `inHeader` flag to the nav data**

In `src/_data/site.js`, replace the `nav:` array and extend the comment above it:

```js
  // `inHeader` mirrors the `onHome` idiom on services: the header shows only
  // real pages; the footer renders the full list including the two homepage
  // anchors. `hash` appends an in-page anchor to the home page (Reviews and
  // FAQ are sections of the homepage, not pages of their own).
  nav: [
    { key: 'nav.home', page: 'home', inHeader: true },
    { key: 'nav.about', page: 'about', inHeader: true },
    { key: 'nav.services', page: 'services', inHeader: true },
    { key: 'nav.gallery', page: 'gallery', inHeader: true },
    { key: 'nav.reviews', page: 'home', hash: '#reviews', inHeader: false },
    { key: 'nav.faq', page: 'home', hash: '#faq', inHeader: false },
    { key: 'nav.contact', page: 'contact', inHeader: true },
  ],
```

Also delete the now-stale sentence in the file's top comment: remove the line "`hash` appends an in-page anchor to the home page (Reviews and FAQ are sections of the homepage, not pages of their own)." (it moved into the nav comment above).

- [ ] **Step 5: Filter in the navbar partial**

In `src/_includes/partials/navbar.njk`, change line 17 from:

```njk
        {% for item in site.nav %}
```

to:

```njk
        {% for item in site.nav | selectattr('inHeader') %}
```

(`footer.njk` keeps its unfiltered `{% for item in site.nav %}` — that is the point.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:build`
Expected: all 3 tests PASS.

- [ ] **Step 7: Fix the stale comment in navbar.spec.js**

In `tests/navbar.spec.js` line 3, change "seven nav links" to "five nav links".

- [ ] **Step 8: Run the navbar geometry suite**

Run: `npx playwright test tests/navbar.spec.js`
Expected: PASS (fewer links can only make the geometry easier).

- [ ] **Step 9: Commit**

```bash
git add package.json tests/nav-structure.test.mjs src/_data/site.js src/_includes/partials/navbar.njk tests/navbar.spec.js
git commit -m "feat: header nav shows only real pages; anchors stay in the footer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Solid navy→white navbar; delete the `navbarSolid` variant

**Files:**
- Modify: `tests/headings.spec.js:54-77` (rewrite the navbar block)
- Modify: `css/style.css:171-216` (navbar states), `css/style.css:342-355` (underline/active groups), `css/style.css:380-394` (phone groups), `css/style.css:410-415` (toggle group)
- Modify: `src/_includes/partials/navbar.njk:2`
- Modify: `src/index.njk:13`, `src/about.njk:12`, `src/services.njk:12`, `src/gallery.njk:12`, `src/contact.njk:12`, `src/404.njk:5` (remove `navbarSolid` front matter)
- Modify: `css/responsive.css:40-41` (drawer blur)

**Interfaces:**
- Consumes: nothing new.
- Produces: the navbar has exactly two visual states everywhere: default (solid `--color-primary`, light text) and `.is-scrolled` (solid white, dark text — toggled at `window.scrollY > 40` by `js/navigation.js`, unchanged). The `navbarSolid` page flag and `.navbar--solid` class cease to exist. Tasks 4–9 may assume the top-of-page navbar is opaque navy.

- [ ] **Step 1: Rewrite the navbar test to the new invariant (failing first)**

In `tests/headings.spec.js`, replace everything from the comment on line 54 (`// The navbar on interior pages is .navbar--solid...`) through the end of the file with:

```js
// The navbar is state-driven, not page-driven: solid navy (light text) at the
// top of EVERY page, solid white (dark text) once scrolled. The old per-page
// .navbar--solid variant caused a whole class of dark-on-dark bugs (invisible
// logo/links, and a phone number that was still dark-on-navy when it was
// visible) — deleting the variant deletes the bug class.
const allPages = ['/', '/ueber-uns/', '/leistungen/', '/galerie/', '/kontakt/'];

function lightness01(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number);
  // color() syntax reports 0-1, rgb() reports 0-255 — normalise.
  const max = Math.max(r, g, b) <= 1 ? 1 : 255;
  return (r + g + b) / 3 / max;
}

for (const path of allPages) {
  test(`navbar on ${path} is light-on-navy at top, dark-on-white when scrolled`, async ({ page, viewport }) => {
    // Below the drawer breakpoint .nav-link is forced white for the navy
    // drawer panel, so the scrolled dark-text half only holds on desktop.
    test.skip(!viewport || viewport.width < 1280, 'drawer styles own the link colors on mobile');

    await page.goto(path);
    const navbar = page.locator('.navbar');
    await expect(navbar).not.toHaveClass(/is-scrolled/);
    for (const sel of ['.navbar .logo', '.navbar .nav-link']) {
      const rgb = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
      expect(lightness01(rgb), `${sel} on ${path} is ${rgb} — too dark for the navy bar`)
        .toBeGreaterThan(0.6);
    }

    await page.evaluate(() => window.scrollTo(0, 300));
    await expect(navbar).toHaveClass(/is-scrolled/);
    for (const sel of ['.navbar .logo', '.navbar .nav-link']) {
      const rgb = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
      expect(lightness01(rgb), `${sel} on ${path} is ${rgb} — too light for the white bar`)
        .toBeLessThan(0.4);
    }
  });
}
```

- [ ] **Step 2: Run it to verify the new expectation fails**

Run: `npx playwright test tests/headings.spec.js --project=desktop`
Expected: the new navbar tests FAIL on `/` (homepage navbar is currently 18%-tint glass, but the real failure signal is on scrolled state colors — is-scrolled is currently translucent white at 72%, text checks may pass; the `/` top-state check fails because... the top-state text IS white). If everything passes before the CSS change, that's acceptable — the tests' job is to hold the invariant after the change; continue.

- [ ] **Step 3: Replace the navbar state CSS**

In `css/style.css`, replace lines 171–216 (the `.navbar`, `.navbar.is-scrolled`, `.navbar:not(.is-scrolled):not(.navbar--solid)`, and `.navbar--solid` blocks) with:

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--navbar-height);
  z-index: var(--z-navbar);
  display: flex;
  align-items: center;
  transition: height var(--t-base) var(--ease-out),
              background var(--t-base) var(--ease-out),
              box-shadow var(--t-base) var(--ease-out),
              border-color var(--t-base) var(--ease-out);
  /* Two states only, both fully opaque: navy at the top of every page, white
     once scrolled. No blur — glass lives in the page sections now, and an
     opaque bar cannot produce photo-dependent (il)legibility. */
  background: var(--color-primary);
  border-bottom: 1px solid color-mix(in srgb, var(--color-white) 8%, transparent);
}

.navbar.is-scrolled {
  height: var(--navbar-height-scrolled);
  background: var(--color-white);
  border-bottom-color: var(--color-border);
  box-shadow: 0 6px 24px color-mix(in srgb, var(--color-primary) 8%, transparent);
}
```

- [ ] **Step 4: Delete every remaining `.navbar--solid` selector**

Still in `css/style.css`, four grouped rules pair `.navbar--solid` with `.is-scrolled`. Keep the `.is-scrolled` half, delete the `.navbar--solid` line (and its trailing comma):

- Line ~342: `.navbar.is-scrolled .nav-link__underline, .navbar--solid .nav-link__underline` → `.navbar.is-scrolled .nav-link__underline`
- Line ~351: `.navbar.is-scrolled .nav-link.is-active, .navbar--solid .nav-link.is-active` → `.navbar.is-scrolled .nav-link.is-active`
- Line ~380: `.navbar.is-scrolled .navbar__phone, .navbar--solid .navbar__phone` → `.navbar.is-scrolled .navbar__phone`
- Line ~391: `.navbar.is-scrolled .navbar__phone svg, .navbar--solid .navbar__phone svg` → `.navbar.is-scrolled .navbar__phone svg`
- Line ~410: `.navbar.is-scrolled .nav-toggle, .navbar--solid .nav-toggle` → `.navbar.is-scrolled .nav-toggle`

Then verify none remain: `grep -rn "navbar--solid" css/ src/` must output nothing after Step 5.

- [ ] **Step 5: Remove the flag from templates**

- `src/_includes/partials/navbar.njk` line 2: `<header class="navbar{% if navbarSolid %} navbar--solid{% endif %}" id="navbar">` → `<header class="navbar" id="navbar">`
- Delete the entire `navbarSolid: ...` front-matter line from: `src/index.njk` (line 13), `src/about.njk` (12), `src/services.njk` (12), `src/gallery.njk` (12), `src/contact.njk` (12), `src/404.njk` (5).

- [ ] **Step 6: Drop the drawer blur**

In `css/responsive.css` lines 39–41, the mobile drawer is already 98% opaque navy; the blur costs mobile GPU for nothing. Change:

```css
    background: color-mix(in srgb, var(--color-primary) 98%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
```

to:

```css
    background: var(--color-primary);
```

- [ ] **Step 7: Run the tests**

Run: `grep -rn "navbar--solid\|navbarSolid" css/ src/ tests/` → expected: no output.
Run: `npx playwright test tests/headings.spec.js tests/navbar.spec.js tests/smoke.spec.js`
Expected: PASS on both projects.

- [ ] **Step 8: Commit**

```bash
git add css/style.css css/responsive.css src/ tests/headings.spec.js
git commit -m "feat: solid navy/white navbar; delete the navbarSolid variant

Two opaque states driven by scroll only. Removing the per-page variant
removes the dark-on-dark bug class for good (the phone number was still
dark-on-navy on interior pages).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Glass tier tokens, utilities, and fallbacks

**Files:**
- Modify: `css/variables.css:38-46` (extend the Glassmorphism token block)
- Modify: `css/components.css` (new "Glass tiers" section directly above the `/* ---------- Cards ---------- */` comment at line ~182)
- Modify: `css/responsive.css` (add to the `@media (max-width: 768px)` block that starts at line ~176)

**Interfaces:**
- Consumes: existing tokens `--color-primary`, `--color-white`, `--glass-blur`, `--glass-saturate`, `--color-glass-border`, `--color-glass-border-strong`, `--radius-xl`, `--space-8`.
- Produces (used by Tasks 4, 5, 7):
  - Tokens: `--glass-strong-bg`, `--glass-soft-bg`, `--glass-backdrop-bg`, `--glass-blur-soft`
  - Utility classes: `.glass-strong` (navy tint ≥55%, white text, text-shadow), `.glass-backdrop` (large frosted container)
  - The soft tier is applied by restyling existing card classes in Task 7, not via a class.

- [ ] **Step 1: Add the tier tokens**

In `css/variables.css`, after line 46 (`--glass-saturate: 180%;`), add:

```css
  /* Glass tiers — see docs/superpowers/specs/2026-07-16-visual-refresh-design.md.
     strong: over photos/dark surfaces, carries white text. soft: light cards
     over colour blobs. backdrop: one large frosted section container per page.
     Tint floors are contrast guarantees — do not lower them. */
  --glass-strong-bg: color-mix(in srgb, var(--color-primary) 58%, transparent);
  --glass-soft-bg: color-mix(in srgb, var(--color-white) 65%, transparent);
  --glass-backdrop-bg: color-mix(in srgb, var(--color-white) 55%, transparent);
  --glass-blur-soft: 12px;
```

- [ ] **Step 2: Add the utilities and fallbacks**

In `css/components.css`, directly above the `/* ---------- Cards ---------- */` comment, add:

```css
/* ---------- Glass tiers ----------
   Glass only where something visual sits behind it. The solid fallbacks serve
   both missing backdrop-filter support and the user's reduced-transparency
   preference — same values on purpose. */
.glass-strong {
  background: var(--glass-strong-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-glass-border-strong);
  color: var(--color-white);
  text-shadow: 0 1px 3px color-mix(in srgb, var(--color-black) 30%, transparent);
}

.glass-backdrop {
  background: var(--glass-backdrop-bg);
  backdrop-filter: blur(var(--glass-blur-soft));
  -webkit-backdrop-filter: blur(var(--glass-blur-soft));
  border: 1px solid color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
}

@supports not (backdrop-filter: blur(1px)) {
  .glass-strong { background: color-mix(in srgb, var(--color-primary) 92%, transparent); }
  .glass-backdrop { background: color-mix(in srgb, var(--color-white) 92%, transparent); }
}

@media (prefers-reduced-transparency: reduce) {
  .glass-strong {
    background: var(--color-primary-soft);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .glass-backdrop {
    background: var(--color-white);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

- [ ] **Step 3: Mobile blur budget**

In `css/responsive.css`, inside the `@media (max-width: 768px)` block (after the `:root` rule at its top), add:

```css
  /* Blur is the main scroll-jank risk on mid-range phones: shrink the radius
     and turn the one large frosted surface solid. */
  :root {
    --glass-blur: 14px;
  }

  .glass-backdrop {
    /* Solid white, matching the reduced-transparency value — a 92% tint here
       would win the specificity tie against components.css's solid fallback
       (same specificity, later file) and break the collapse-to-solid promise. */
    background: var(--color-white);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
```

(Note: `:root` appears twice inside this media query after the edit — merge the two custom-property lists into the existing `:root` rule instead of adding a second one.)

- [ ] **Step 4: Verify the build and existing tests**

Run: `npm run test:build && npx playwright test tests/smoke.spec.js`
Expected: PASS. (The tiers have no consumers yet — this task must not change any rendering.)

- [ ] **Step 5: Commit**

```bash
git add css/variables.css css/components.css css/responsive.css
git commit -m "feat: named glass tiers with solid fallbacks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Homepage hero — V5 dark split

**Files:**
- Modify: `tests/hero.spec.js` (add two tests first)
- Modify: `src/index.njk:18-75` (hero markup)
- Modify: `css/style.css:446-584` (hero styles)
- Modify: `css/responsive.css` (hero rules at lines ~114-122 and ~182-211)

**Interfaces:**
- Consumes: `.glass-strong` from Task 3; opaque navy navbar from Task 2 (the hero panel is the same navy — they read as one surface).
- Produces: hero DOM order `hero__bg, hero__overlay, hero__content (eyebrow/title/subtitle/cta), hero__stats (3 × .hero__stat.glass-strong), a.scroll-indicator`. `.hero__stats` is a direct child of `.hero` (moved out of `.hero__content`) — Task 5 and the visual baselines depend on this structure.

- [ ] **Step 1: Write the failing tests**

Append to `tests/hero.spec.js`:

```js
test('hero copy never sits on the photo (desktop split)', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1280, 'the split is a desktop layout');
  await page.goto('/');
  // The solid navy panel covers the left 46% and stays ≥82% tint to 58%;
  // holding every headline line inside 60% of the viewport guarantees
  // contrast regardless of which photo Unsplash serves. Measure the inline
  // .hero-line spans, not the h1 — a block box spans the full column width
  // whether or not there are glyphs in it.
  const edges = await page.$$eval('.hero__title .hero-line', (els) =>
    els.map((el) => el.getBoundingClientRect().right)
  );
  expect(Math.max(...edges)).toBeLessThanOrEqual(viewport.width * 0.6);
});

test('hero stats are individual glass chips', async ({ page }) => {
  await page.goto('/');
  const stats = page.locator('.hero__stat');
  await expect(stats).toHaveCount(3);
  expect(await stats.first().getAttribute('class')).toContain('glass-strong');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test tests/hero.spec.js --project=desktop`
Expected: the two new tests FAIL (`glass-strong` missing; title box may already fit — the class assertion is the hard failure). The three existing hero tests still PASS.

- [ ] **Step 3: Rework the hero markup**

In `src/index.njk`, replace lines 18–75 (the whole `<section class="hero">`) with:

```njk
    <section class="hero" aria-label="Hero">
      <div class="hero__bg" aria-hidden="true">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
             alt=""
             loading="eager"
             fetchpriority="high" />
      </div>
      <div class="hero__overlay" aria-hidden="true"></div>

      <div class="hero__content">
        <span class="eyebrow eyebrow--light hero__eyebrow">
          <span class="eyebrow__dot"></span>
          <span>{{ 'hero.eyebrow' | t(d) }}</span>
        </span>

        <h1 class="hero__title">
          <span class="hero-line hero-line--1">{{ 'hero.title1' | t(d) }}</span><br />
          <span class="hero-line hero-line--2">{{ 'hero.title2' | t(d) }}</span>
          <span class="hero-line hero-line--3 text-gradient">{{ 'hero.title3' | t(d) }}</span>
        </h1>

        <p class="hero__subtitle">{{ 'hero.subtitle' | t(d) }}</p>

        <div class="hero__cta">
          <a href="{{ 'contact' | url(lang) }}" class="btn btn--primary btn--lg" data-magnetic>
            <span>{{ 'hero.cta1' | t(d) }}</span>
            <svg class="icon icon--arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
          <a href="{{ 'services' | url(lang) }}" class="btn btn--ghost-light btn--lg"><span>{{ 'hero.cta2' | t(d) }}</span></a>
        </div>
      </div>

      <div class="hero__stats">
        <div class="hero__stat glass-strong">
          <div class="hero__stat-num"><span data-counter="500" data-suffix="+">0</span></div>
          <div class="hero__stat-label">{{ 'hero.stat1.label' | t(d) }}</div>
        </div>
        <div class="hero__stat glass-strong">
          <div class="hero__stat-num"><span data-counter="15" data-suffix="+">0</span></div>
          <div class="hero__stat-label">{{ 'hero.stat2.label' | t(d) }}</div>
        </div>
        <div class="hero__stat glass-strong">
          <div class="hero__stat-num"><span data-counter="100" data-suffix="%">0</span></div>
          <div class="hero__stat-label">{{ 'hero.stat3.label' | t(d) }}</div>
        </div>
      </div>

      <a href="#stats" class="scroll-indicator" aria-label="{{ 'hero.scroll' | t(d) }}">
        <span>{{ 'hero.scroll' | t(d) }}</span>
        <span class="scroll-indicator__mouse" aria-hidden="true"></span>
      </a>
    </section>
```

Changes: the two decorative `.blob` divs are gone (the V5 glow replaces them), `.hero__stats` moved out of `.hero__content`, each `.hero__stat` gains `glass-strong`, and the scroll link's hardcoded English `aria-label="Scroll down"` becomes the translated label. The scroll indicator's inner markup is Task 5's job — leave it as-is here.

- [ ] **Step 4: Restyle the hero in style.css**

Replace the `.hero__overlay` block (lines ~470–478) with:

```css
/* V5 dark split: a solid navy panel owns the left ~half (guaranteed white-text
   contrast), clearing to a fully untinted photo on the right. The glow is the
   only decoration — it stays inside the panel side. */
.hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    var(--color-primary) 0%,
    var(--color-primary) 46%,
    color-mix(in srgb, var(--color-primary) 82%, transparent) 58%,
    color-mix(in srgb, var(--color-primary) 20%, transparent) 74%,
    transparent 100%);
  z-index: 1;
}

.hero__overlay::before {
  content: '';
  position: absolute;
  left: 16%;
  top: -22%;
  width: 620px;
  height: 620px;
  border-radius: var(--radius-full);
  background: radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 30%, transparent) 0%, transparent 70%);
}
```

In the `.hero__bg img` block (lines ~462–468), add `object-position: 72% center;` so the photo's subject stays on the visible right side.

In the `.hero__title` block (line ~497), change `font-size: var(--fs-6xl);` to `font-size: var(--fs-5xl);` — at 1440px the 6xl headline (~88px) is wider than the 46% panel; 5xl keeps the longest German line ("liebevoller Sorgfalt.") inside the guaranteed-contrast zone.

Replace the `.hero__stats` block (lines ~537–553) and the `.hero__stat` + `.hero__stat::before` blocks (lines ~555–569) with:

```css
/* Stat chips float over the photo side; each chip is its own glass-strong
   surface (the tint guarantees the numbers stay readable on any photo). */
.hero__stats {
  position: absolute;
  z-index: 2;
  right: max(var(--container-pad), calc((100% - var(--container-max)) / 2 + var(--container-pad)));
  bottom: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  opacity: 0;
  animation: fadeInUp 800ms var(--ease-out) 1100ms forwards;
}

.hero__stat {
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-6);
}
```

(`.hero__stat-num` and `.hero__stat-label` stay unchanged.)

- [ ] **Step 5: Responsive behavior**

In `css/responsive.css`:

In the `@media (max-width: 1024px)` block, replace the `.hero__stats` rule (lines ~119–122) with:

```css
  .hero__stats {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    max-width: var(--container-max);
    margin: var(--space-10) auto 0;
    padding-inline: var(--container-pad);
  }
```

and add a `.hero` rule to the same block so the static stats flow below the content (both are children of the flex `.hero`):

```css
  .hero {
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  }
```

In the `@media (max-width: 768px)` block, replace the `.hero`, `.hero__title`, `.hero__subtitle`, `.hero__stats`, `.hero__cta`, `.hero__cta .btn` rules (lines ~182–211) with:

```css
  /* V5 stacks on phones: navy text block first, untinted photo band below,
     stat chips overlapping the seam. Text never sits on the photo. */
  .hero {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-primary);
  }

  .hero__content {
    order: 1;
    padding-block: var(--space-16) var(--space-12);
  }

  .hero__bg {
    order: 2;
    position: relative;
    height: 46vh;
  }

  .hero__bg img {
    transform: none;
    animation: none;
  }

  .hero__overlay {
    display: none;
  }

  .hero__stats {
    order: 3;
    position: relative;
    z-index: 2;
    margin: calc(-1 * var(--space-16)) 0 0;
    padding-inline: var(--container-pad);
    gap: var(--space-3);
  }

  .hero__stat {
    flex: 1 1 40%;
    padding: var(--space-3) var(--space-4);
  }

  .hero__title {
    font-size: var(--fs-5xl);
    max-width: 12ch;
  }

  .hero__subtitle {
    font-size: var(--fs-lg);
  }

  .hero__cta {
    flex-direction: column;
    width: 100%;
    max-width: 360px;
  }

  .hero__cta .btn {
    width: 100%;
  }
```

- [ ] **Step 6: Run the hero tests**

Run: `npx playwright test tests/hero.spec.js`
Expected: all PASS on both projects (the existing three guard the title lines, stagger, and white-ramp gradient — V5 keeps white text on the navy panel, so they must stay green).

- [ ] **Step 7: Sanity-check the full functional suite**

Run: `npx playwright test tests/smoke.spec.js tests/headings.spec.js tests/contact-form.spec.js tests/i18n.spec.js`
Expected: PASS. (Visual tests are expected to fail from here until Task 9 — do not run or update them.)

- [ ] **Step 8: Commit**

```bash
git add src/index.njk css/style.css css/responsive.css tests/hero.spec.js
git commit -m "feat: V5 dark-split homepage hero with glass stat chips

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Scroll hint redesign

**Files:**
- Modify: `tests/hero.spec.js` (two tests first)
- Modify: `src/index.njk` (scroll indicator markup, inside the hero from Task 4)
- Modify: `css/animations.css:210-246` (indicator styles; NOTE `stash@{0}` touches this file — do not touch the stash)
- Modify: `css/responsive.css:537` (reduced-motion selector) and add a `max-height` rule

**Interfaces:**
- Consumes: hero DOM from Task 4; `hero.scroll` dict key (exists in both languages).
- Produces: `.scroll-indicator` is a pill link (label + `.scroll-indicator__chevron` svg); `.scroll-indicator__mouse` and the `scrollIndicator` keyframes cease to exist.

- [ ] **Step 1: Write the failing tests**

Append to `tests/hero.spec.js`:

```js
test('scroll hint is visible with a real touch target', async ({ page }) => {
  await page.goto('/');
  const hint = page.locator('.scroll-indicator');
  await expect(hint).toBeVisible();
  const box = await hint.boundingBox();
  expect(box.height, 'touch target must be at least 44px').toBeGreaterThanOrEqual(44);
});

test('scroll hint hides on short viewports instead of overlapping content', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1280, 'short-viewport rule is checked once, on desktop');
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto('/');
  await expect(page.locator('.scroll-indicator')).toBeHidden();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test tests/hero.spec.js --project=desktop`
Expected: both new tests FAIL (current hint is ~60px tall but has no min-height guarantee — if the first happens to pass, the second must fail: nothing hides the hint today).

- [ ] **Step 3: Update the markup**

In `src/index.njk`, replace the scroll indicator element (from Task 4's markup) with:

```njk
      <a href="#stats" class="scroll-indicator" aria-label="{{ 'hero.scroll' | t(d) }}">
        <span>{{ 'hero.scroll' | t(d) }}</span>
        <svg class="scroll-indicator__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </a>
```

- [ ] **Step 4: Replace the styles**

In `css/animations.css`, replace the whole scroll-indicator section (lines 210–246: `.scroll-indicator`, `.scroll-indicator__mouse`, `.scroll-indicator__mouse::after`) with:

```css
/* ---------- Scroll indicator (hero) ---------- */
.scroll-indicator {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-primary) 45%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--color-white) 35%, transparent);
  color: var(--color-white);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-widest);
  text-transform: uppercase;
  text-decoration: none;
  animation: fadeIn 1200ms var(--ease-out) 1200ms backwards;
}

.scroll-indicator__chevron {
  width: 14px;
  height: 14px;
  animation: scrollDip 1.6s var(--ease-in-out) infinite;
}

@keyframes scrollDip {
  0%, 100% { transform: translateY(-2px); }
  50% { transform: translateY(2px); }
}
```

Then search `css/animations.css` for `@keyframes scrollIndicator` and delete that keyframes block (it animated the old mouse dot).

- [ ] **Step 5: Responsive + reduced motion**

In `css/responsive.css`:
- Line ~537: change `.scroll-indicator__mouse::after,` to `.scroll-indicator__chevron,` (inside the `prefers-reduced-motion` animation-none list).
- (RESOLVED DURING TASK 4's REVIEW: the static-flow positioning rule for `.scroll-indicator` lives in the `@media (max-width: 1024px)` block — not ≤768px — because the absolutely-positioned hint overlapped the stat chips across the whole ≤1024px range once the hero content became a centered flex column. Task 4's fix round added it; this task only restyles the indicator's own appearance.)

- After the print block (line ~527), add:

```css
/* On short viewports the hint overlaps hero content — hide it there. */
@media (max-height: 700px) {
  .scroll-indicator {
    display: none;
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `npx playwright test tests/hero.spec.js`
Expected: all PASS on both projects.

- [ ] **Step 7: Commit**

```bash
git add src/index.njk css/animations.css css/responsive.css tests/hero.spec.js
git commit -m "feat: scroll hint is a high-contrast pill with a real touch target

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Interior page heroes — variant C (3 pages after Task 10)

**Files:**
- Modify: `tests/headings.spec.js` (one test first)
- Modify: `src/services.njk`, `src/gallery.njk`, `src/contact.njk` (page-hero content block; the about page no longer exists — Task 10 merged it into contact)
- Modify: `css/components.css:1118-1190` (page-hero + breadcrumb)
- Modify: `css/responsive.css` (page-hero mobile overlay, in the `max-width: 768px` block near the existing `.page-hero h1` rules at ~427-433)

**Interfaces:**
- Consumes: solid navy navbar (Task 2).
- Produces: page-hero content order is `breadcrumb → h1 → p`, left-aligned; `.page-hero__bg::after` is a left-heavy horizontal wash (≥88% navy behind text, 35% at the right edge). The `page.*.eyebrow` dict keys become unused but stay in `dict.js` (removing keys is not worth touching 2×274 lines).

- [ ] **Step 1: Write the failing test**

Append to `tests/headings.spec.js`:

```js
test('interior heroes lead with the breadcrumb, left-aligned', async ({ page }) => {
  await page.goto('/kontakt/');
  const first = page.locator('.page-hero__content > *').first();
  expect(await first.getAttribute('class')).toContain('breadcrumb');
  const align = await page.locator('.page-hero__content').evaluate((el) => getComputedStyle(el).textAlign);
  expect(align).toBe('left');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/headings.spec.js --project=desktop`
Expected: the new test FAILS (first child is currently the eyebrow `span`, alignment is `center`).

- [ ] **Step 3: Update the four page templates**

In each of `src/services.njk`, `src/gallery.njk`, `src/contact.njk`, the `.page-hero__content` div currently holds `eyebrow span → h1 → p → breadcrumb nav`. Reorder to `breadcrumb nav → h1 → p` and delete the eyebrow span (it duplicates the breadcrumb's role). Using contact as the model — the other three differ only in their `page.*`/`nav.*` keys, keep each page's own keys:

```njk
      <div class="container page-hero__content">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="{{ 'home' | url(lang) }}">{{ 'crumb.home' | t(d) }}</a><span class="breadcrumb__sep">/</span><span>{{ 'nav.contact' | t(d) }}</span></nav>
        <h1>{{ 'page.contact.title' | t(d) }}</h1>
        <p>{{ 'page.contact.subtitle' | t(d) }}</p>
      </div>
```

- [ ] **Step 4: Restyle the page hero**

In `css/components.css`:

`.page-hero` (line ~1118): change the padding line to `padding: calc(var(--navbar-height) + var(--space-16)) 0 var(--space-16);` (slimmer band).

`.page-hero__bg img` (line ~1132): change `opacity: 0.35;` to `opacity: 1;` — the wash below now does the contrast work, and the photo is finally visible on the right.

`.page-hero__bg::after` (line ~1139): replace the background with:

```css
  /* ≥88% navy where the text sits, clearing rightward so the photo reads.
     Contrast comes from this wash, never from the photo. */
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--color-primary) 88%, transparent) 0%,
    color-mix(in srgb, var(--color-primary) 62%, transparent) 55%,
    color-mix(in srgb, var(--color-primary) 35%, transparent) 100%);
```

`.page-hero__content` (line ~1146): replace with:

```css
.page-hero__content {
  position: relative;
  z-index: 1;
  text-align: left;
}
```

`.page-hero p` (line ~1167): add `max-width: 60ch;`.

`.breadcrumb` (line ~1173): change `justify-content: center;` to `justify-content: flex-start;` and `margin-top: var(--space-8);` to `margin: 0 0 var(--space-4);`.

- [ ] **Step 5: Mobile overlay**

In `css/responsive.css`, in the `@media (max-width: 768px)` block near the existing `.page-hero h1` rule (~line 427), add:

```css
  /* Full-width text on phones — no clear side to preserve, tint uniformly. */
  .page-hero__bg::after {
    background: color-mix(in srgb, var(--color-primary) 88%, transparent);
  }
```

- [ ] **Step 6: Run the tests**

Run: `npx playwright test tests/headings.spec.js tests/i18n.spec.js`
Expected: PASS on both projects — including the four existing `h1 ... readable against the dark hero` contrast tests (white on ≥88% navy) and the i18n scans.

- [ ] **Step 7: Commit**

```bash
git add src/about.njk src/services.njk src/gallery.njk src/contact.njk css/components.css css/responsive.css tests/headings.spec.js
git commit -m "feat: interior heroes get a fixed-contrast wash and lead with the breadcrumb

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Apply the glass tiers to sections

**Files:**
- Modify: `css/components.css` (`.card` ~183, `.service-card` ~221, testimonials ~371-440, `.promo-banner__content` ~914, glass-tiers section from Task 3, new `.mv-card`/`.value-card` overrides)
- Modify: `css/style.css` (new `.section--blobs` helper near the section styles at ~143-148)
- Modify: `src/index.njk` (`#services` section ~128, `#faq` section ~340)

**Interfaces:**
- Consumes: tier tokens and utilities from Task 3; existing `.blob`, `.blob--blue`, `.blob--cyan` (css/animations.css:184-207).
- Produces: `.section--blobs` helper (relative + hidden overflow + z-raised container). Soft tier lives on `.card`/`.service-card`/`.mv-card`/`.value-card` directly; `#faq`'s `.faq-wrap` carries `.glass-backdrop` — the only backdrop on the homepage.

- [ ] **Step 1: Soft-tier the light cards**

In `css/components.css`:

`.card` (line ~184): change `background: color-mix(in srgb, var(--color-white) 72%, transparent);` to `background: var(--glass-soft-bg);` and both backdrop-filter lines from `blur(var(--glass-blur))` to `blur(var(--glass-blur-soft))`.

`.service-card` (line ~222): same two changes (background → `var(--glass-soft-bg)`, blur → `var(--glass-blur-soft)`).

At the end of the glass-tiers section (from Task 3), add:

```css
/* Soft tier for the about page's mission/value cards. Appended here (same
   specificity, later in the file) so it wins over their base declarations. */
.mv-card,
.value-card {
  background: var(--glass-soft-bg);
  backdrop-filter: blur(var(--glass-blur-soft)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-soft)) saturate(var(--glass-saturate));
  border: 1px solid color-mix(in srgb, var(--color-white) 55%, transparent);
}
```

And extend the `prefers-reduced-transparency` block from Task 3 with the soft-tier consumers:

```css
  .card,
  .service-card,
  .mv-card,
  .value-card {
    background: var(--color-white);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
```

- [ ] **Step 2: Strong-tier the dark-band surfaces**

In `css/components.css`, after the `.testimonial__role` block (~line 440), add:

```css
/* Reviews band: over the dark gradient the cards go glass-strong — the blur
   finally has the band's glow to diffuse, and white text is guaranteed by
   the tint, not the slide behind it. */
.section--dark .testimonial {
  background: var(--glass-strong-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-color: var(--color-glass-border);
}

.section--dark .testimonial__text,
.section--dark .testimonial__name {
  color: var(--color-white);
}

.section--dark .testimonial__role {
  color: color-mix(in srgb, var(--color-white) 70%, transparent);
}

.section--dark .testimonial::before {
  color: color-mix(in srgb, var(--color-white) 10%, transparent);
}
```

In the `.promo-banner__content` block (~line 914), add the panel treatment (the banner keeps its navy ground and blurred color orbs — the content becomes the glass panel over them):

```css
.promo-banner__content {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
  background: var(--glass-strong-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-xl);
  padding: clamp(2rem, 1.25rem + 3vw, 3.5rem);
}
```

Extend the `prefers-reduced-transparency` block with:

```css
  .section--dark .testimonial,
  .promo-banner__content {
    background: var(--color-primary-soft);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
```

- [ ] **Step 3: Add the `.section--blobs` helper**

In `css/style.css`, after the `.section--tinted` block (~line 146-148), add:

```css
/* Sections that host decorative blobs behind glass cards: contain the blobs
   and raise the content above them. */
.section--blobs {
  position: relative;
  overflow: hidden;
}

.section--blobs > .container {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Give the homepage glass something to blur**

In `src/index.njk`:

`#services` section (line ~128): change the opening tag to `<section class="section section--blobs" id="services" aria-label="Our services">` and immediately after it add:

```njk
      <div class="blob blob--blue" style="width: 420px; height: 420px; top: -60px; right: -120px;" aria-hidden="true"></div>
      <div class="blob blob--cyan" style="width: 360px; height: 360px; bottom: -80px; left: -100px;" aria-hidden="true"></div>
```

`#faq` section (line ~340): change the opening tag to `<section class="section section--tinted section--blobs" id="faq" aria-label="Frequently asked questions">`, add after it:

```njk
      <div class="blob blob--blue" style="width: 380px; height: 380px; top: -40px; left: -120px;" aria-hidden="true"></div>
      <div class="blob blob--cyan" style="width: 340px; height: 340px; bottom: -60px; right: -100px;" aria-hidden="true"></div>
```

and change `<div class="faq-wrap" data-reveal>` (line ~348) to `<div class="faq-wrap glass-backdrop" data-reveal>`.

- [ ] **Step 5: Run the functional suites**

Run: `npx playwright test tests/smoke.spec.js tests/headings.spec.js tests/hero.spec.js tests/contact-form.spec.js tests/i18n.spec.js`
Expected: PASS on both projects. The `CTA banner h2` contrast test keeps passing — white text now sits on the glass panel over the same navy ground.

- [ ] **Step 6: Commit**

```bash
git add css/components.css css/style.css src/index.njk
git commit -m "feat: glass moves into the sections — strong/soft/backdrop tiers applied

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Replace the two 404ing Unsplash photos

**Files:**
- Modify: `src/gallery.njk:78,141`, `src/_data/services.js:117`, `src/index.njk:241`
- Modify: `CLAUDE.md` (Notes bullet about the 404ing IDs)

**Interfaces:**
- Consumes: nothing.
- Produces: every Unsplash URL in the built site returns HTTP 200. Replacement IDs (both verified 200 on 2026-07-16): bathroom `photo-1620626011761-996317b8d101`, bedroom `photo-1505693416388-ac5ce068fe85`.

- [ ] **Step 1: Replace the IDs**

Substitute `photo-1567548083313-04c67ac2f4f0` → `photo-1620626011761-996317b8d101` (bathroom; keep each URL's own query string) in:
- `src/gallery.njk:78` — both `src` and `data-full`
- `src/_data/services.js:117`
- `src/index.njk:241`

Substitute `photo-1556909114-44e3e9399a2e` → `photo-1505693416388-ac5ce068fe85` (bedroom) in:
- `src/gallery.njk:141` — both `src` and `data-full`

```bash
grep -rln 'photo-1567548083313-04c67ac2f4f0\|photo-1556909114-44e3e9399a2e' src/ \
  | xargs sed -i 's/photo-1567548083313-04c67ac2f4f0/photo-1620626011761-996317b8d101/g; s/photo-1556909114-44e3e9399a2e/photo-1505693416388-ac5ce068fe85/g'
```

- [ ] **Step 2: Verify every image URL in the built site resolves**

```bash
npm run build && grep -rho 'https://images\.unsplash\.com/photo-[a-zA-Z0-9]*-[a-zA-Z0-9]*' _site --include='*.html' | sort -u \
  | while read -r u; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u?w=50")" "$u"; done | sort | uniq -c
```

Expected: every line starts with `200`; no `404` anywhere.

- [ ] **Step 3: Update CLAUDE.md**

In the Notes section, replace the bullet "`assets/` is empty; all imagery is hot-linked from Unsplash. Two of the photo IDs currently used (...) 404." with:

```markdown
- `assets/` is empty; all imagery is hot-linked from Unsplash.
```

- [ ] **Step 4: Commit**

```bash
git add src/gallery.njk src/_data/services.js src/index.njk CLAUDE.md
git commit -m "fix: replace the two 404ing Unsplash photos

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Full verification, deliberate baseline regeneration, docs

**Files:**
- Modify: `tests/visual.spec.js-snapshots/` (regenerated once)
- Modify: `CLAUDE.md` (glass system + navbar notes)

**Interfaces:**
- Consumes: everything above.
- Produces: a fully green `npm test`; docs matching reality.

- [ ] **Step 1: Run the complete suite**

Run: `npm test`
Expected: build-output tests and all functional Playwright tests PASS; ONLY tests in `tests/visual.spec.js` FAIL with pixel diffs. If any functional test fails, STOP and fix it — do not proceed to baselines with a functional failure.

- [ ] **Step 2: Eyeball every visual diff before touching baselines**

Run: `npx playwright show-report` and inspect each failing snapshot's actual/expected/diff triple. Every diff must be explained by the approved design (mockups: https://claude.ai/code/artifact/04d3d728-a563-49be-b660-30e41a8b0147):
- navbar: opaque navy (top) / opaque white (scrolled), no translucency
- homepage hero: navy left panel, untinted photo right, 3 glass chips bottom-right (desktop) / stacked text→photo→chips (mobile)
- scroll hint: pill with chevron
- interior heroes: breadcrumb-first, left-aligned, photo visible on the right
- services/FAQ/reviews/CTA: glass tiers per the spec

Anything NOT explained by the design (layout breakage, overflowing text, missing elements) gets fixed first.

- [ ] **Step 3: Regenerate baselines once**

Run: `npm run test:update-snapshots`
Then: `npm test`
Expected: everything PASSES, including visual.

- [ ] **Step 4: Update CLAUDE.md**

- In the "Stylesheet order" section, after the paragraph about `variables.css`, add:

```markdown
Glassmorphism is a deliberate 3-tier system (see
docs/superpowers/specs/2026-07-16-visual-refresh-design.md): `.glass-strong`
(navy tint over photos/dark bands, carries its own white text + shadow),
soft-tier card surfaces (`.card`, `.service-card`, `.mv-card`, `.value-card`
over `.section--blobs` backgrounds), and `.glass-backdrop` (max one large
frosted container per page). All tiers collapse to solid surfaces under
`prefers-reduced-transparency` and when `backdrop-filter` is unsupported. The
navbar is deliberately NOT glass — solid navy at top, solid white when
scrolled, no per-page variants.
```

- In "Fixed bugs worth knowing about", the fourth bullet describes the dark-on-dark heading bug; append a sentence: "The per-page `navbarSolid`/`.navbar--solid` variant that enabled this bug class was later removed entirely — navbar styling is scroll-state-driven only."

- [ ] **Step 5: Final commit**

```bash
git add tests/visual.spec.js-snapshots/ CLAUDE.md
git commit -m "test: regenerate visual baselines for the approved redesign

All 12 diffs eyeballed against the approved mockups before regenerating.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Report**

Summarize to the user: what changed per finding, test totals, and a reminder that `stash@{0}` (their WIP on `css/animations.css`) still exists and may need rebasing onto the rewritten scroll-indicator styles.

---

### Task 10: User revisions — lang-toggle active state, nav order, merge About into Kontakt

(User-requested mid-execution; runs BEFORE Task 6. After this task the site has 5 pages:
home, services, gallery, contact, 404 — Task 6 applies to services/gallery/contact only.)

**Files:**
- Modify: `css/components.css` (lang-switch block ~1324-1378; new sibling-spacing rule near mv/values styles)
- Modify: `tests/headings.spec.js` (new lang-toggle test; page lists; delete the orphaned about-page test)
- Modify: `src/_data/site.js` (nav order + drop the about entry)
- Modify: `src/contact.njk` (insert the merged About section after the page-hero)
- Modify: `src/_data/dict.js` (17 new key pairs in BOTH en and de — exact strings below)
- Delete: `src/about.njk` (copy its 7 icon SVGs into contact.njk first)
- Modify: `src/_data/langs.js` (remove the about slug row), `src/_data/meta.js` (remove both about entries)
- Modify: `src/index.njk` (~line 189: about-preview CTA retarget), `src/404.njk` (~line 44: suggestion retarget)
- Modify: `tests/nav-structure.test.mjs`, `tests/i18n.spec.js`, `tests/pathprefix.test.mjs`, `tests/visual.spec.js`, `tests/navbar.spec.js` (comment only)
- Modify: `CLAUDE.md` (URL table + src file list only)

**Interfaces:**
- Consumes: solid navbar states (Task 2), `.is-scrolled` behavior.
- Produces: header nav = Start · Leistungen · Galerie · Kontakt (4 links); footer = those 4 + the two anchors (6); `/kontakt/#about` (and `/en/contact/#about`) is the About anchor; `src/about.njk`, the `about` slug, and both meta.about entries cease to exist. Task 6 and later tasks may assume 3 interior pages.

- [ ] **Step 1: Failing test for the lang toggle (append to tests/headings.spec.js)**

```js
test('active language button is visibly highlighted in both navbar states', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1280, 'lang switch lives in the drawer on mobile');
  await page.goto('/');
  const active = page.locator('.lang-switch__btn.is-active');
  expect(await active.evaluate((el) => getComputedStyle(el).backgroundImage),
    'active chip needs its gradient pill on the navy bar too').toContain('gradient');
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(page.locator('.navbar')).toHaveClass(/is-scrolled/);
  expect(await active.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('gradient');
});
```

Run: `npx playwright test tests/headings.spec.js --project=desktop` — the new test FAILS at the first assertion (`backgroundImage` is `none` at top of page).

- [ ] **Step 2: Fix the lang switch in css/components.css**

In the `.lang-switch` block (~1324): delete the two `backdrop-filter` lines (the bar behind it is opaque now — the blur is a no-op that costs GPU).

Replace the `.lang-switch__btn.is-active` block, and REDUCE the `.navbar.is-scrolled .lang-switch__btn.is-active` block to a color-only override — it must NOT be deleted: `.navbar.is-scrolled .lang-switch__btn` (3 classes) sets muted text and would beat the 2-class active rule on `color` in the scrolled state (found by Task 10's review):

```css
/* The active pill is state-independent: on the navy bar the old white-text-only
   treatment was indistinguishable from the inactive button. */
.lang-switch__btn.is-active {
  color: var(--color-white);
  background: var(--gradient-primary);
  box-shadow: var(--shadow-glow);
}

/* Specificity: the scrolled state's 3-class muted-text rule would otherwise
   beat the 2-class active rule on `color`. */
.navbar.is-scrolled .lang-switch__btn.is-active {
  color: var(--color-white);
}
```

Re-run the headings suite: new test PASSES.

- [ ] **Step 3: Nav order + drop about (src/_data/site.js)**

Replace the nav array (services directly after home — what you sell comes first; about is gone, merged into contact):

```js
  nav: [
    { key: 'nav.home', page: 'home', inHeader: true },
    { key: 'nav.services', page: 'services', inHeader: true },
    { key: 'nav.gallery', page: 'gallery', inHeader: true },
    { key: 'nav.reviews', page: 'home', hash: '#reviews', inHeader: false },
    { key: 'nav.faq', page: 'home', hash: '#faq', inHeader: false },
    { key: 'nav.contact', page: 'contact', inHeader: true },
  ],
```

Also fix the file's top comment: "the same seven links" → "the same six links".

- [ ] **Step 4: New dictionary keys (src/_data/dict.js, BOTH languages, alphabetical position)**

First `grep -n "about.mission\|about.vision\|about.value\|about.head" src/_data/dict.js` — must return nothing (no collisions). Then add to **en**:

```js
    "about.head.eyebrow": "About Us",
    "about.head.title": "The team behind the shine",
    "about.head.subtitle": "Our mission, our vision, and the five values we measure every decision against.",
    "about.mission.title": "Our Mission",
    "about.mission.text": "To elevate the standard of cleaning in every home and business we touch — proving that a spotless space is not a luxury, but a foundation for clearer thinking, calmer living, and more productive work. We exist to give people their time back, and a space they're proud of.",
    "about.vision.title": "Our Vision",
    "about.vision.text": "To become the Rhein-Ruhr region's most quietly trusted cleaning studio — known not for marketing volume, but for the calibre of our crews, the rigour of our training, and the relationships we build with each client.",
    "about.value.1.title": "Integrity",
    "about.value.1.text": "We do what we said we'd do, exactly when we said we'd do it. If we mess up, we say so — and we fix it, fast, no excuses.",
    "about.value.2.title": "Craft",
    "about.value.2.text": "Cleaning is not a chore to us — it's a craft. We study tools, techniques, and chemistry so you don't have to think about any of it.",
    "about.value.3.title": "Care",
    "about.value.3.text": "We treat every space as if it were our own. Your home, your office, your restaurant — it matters to us because it matters to you.",
    "about.value.4.title": "Reliability",
    "about.value.4.text": "You'll never have to wonder if we're showing up. Same crew, same time, same spotless result — visit after visit, year after year.",
    "about.value.5.title": "Sustainability",
    "about.value.5.text": "Plant-based products, refillable bottles, electric vehicles. We obsess over our environmental footprint as much as your dust bunnies.",
```

And to **de**:

```js
    "about.head.eyebrow": "Über uns",
    "about.head.title": "Das Team hinter dem Glanz",
    "about.head.subtitle": "Unsere Mission, unsere Vision und die fünf Werte, an denen wir jede Entscheidung messen.",
    "about.mission.title": "Unsere Mission",
    "about.mission.text": "Wir heben den Standard der Reinigung in jedem Zuhause und jedem Unternehmen, das wir betreuen — ein makelloser Raum ist kein Luxus, sondern die Grundlage für klareres Denken, ruhigeres Wohnen und produktiveres Arbeiten. Wir geben Menschen ihre Zeit zurück — und einen Raum, auf den sie stolz sind.",
    "about.vision.title": "Unsere Vision",
    "about.vision.text": "Die leise vertrauteste Reinigungsmanufaktur der Rhein-Ruhr-Region zu werden — bekannt nicht durch lautes Marketing, sondern durch das Können unserer Teams, die Gründlichkeit unserer Ausbildung und die Beziehungen zu unseren Kunden.",
    "about.value.1.title": "Integrität",
    "about.value.1.text": "Wir tun, was wir zugesagt haben — genau dann, wann wir es zugesagt haben. Machen wir einen Fehler, sagen wir es und beheben ihn sofort, ohne Ausreden.",
    "about.value.2.title": "Handwerk",
    "about.value.2.text": "Reinigung ist für uns keine Pflicht, sondern ein Handwerk. Wir studieren Werkzeuge, Techniken und Chemie, damit Sie an nichts davon denken müssen.",
    "about.value.3.title": "Sorgfalt",
    "about.value.3.text": "Wir behandeln jeden Raum, als wäre er unser eigener. Ihr Zuhause, Ihr Büro, Ihr Restaurant — es ist uns wichtig, weil es Ihnen wichtig ist.",
    "about.value.4.title": "Verlässlichkeit",
    "about.value.4.text": "Sie müssen sich nie fragen, ob wir kommen. Gleiches Team, gleiche Zeit, gleiches makelloses Ergebnis — Besuch für Besuch, Jahr für Jahr.",
    "about.value.5.title": "Nachhaltigkeit",
    "about.value.5.text": "Pflanzenbasierte Produkte, nachfüllbare Flaschen, Elektrofahrzeuge. Unser ökologischer Fußabdruck beschäftigt uns genauso wie Ihr Staub.",
```

(The former about page's mission/values body copy was hardcoded English even on the German page — these keys fix that gap for the merged content. The five value texts above are the about page's originals; mission/vision are lightly trimmed. Timeline/team/certifications/stats sections are deliberately NOT carried over — the homepage already tells that story.)

- [ ] **Step 5: Insert the merged About section into src/contact.njk**

Directly after the closing `</section>` of the page-hero, insert — copying each icon SVG **verbatim** from `src/about.njk` (mission: compass icon at ~line 44, vision: eye icon at ~line 51, values 1-5: the five icons at ~lines 72, 79, 86, 93, 100, 107):

```njk
    <!-- ===== ABOUT (merged from the former about page) ===== -->
    <section class="section section--tinted" id="about">
      <div class="container">
        <div class="section-head" data-reveal>
          <span class="eyebrow"><span class="eyebrow__dot"></span>{{ 'about.head.eyebrow' | t(d) }}</span>
          <h2 class="section-title">{{ 'about.head.title' | t(d) }}</h2>
          <p class="section-subtitle">{{ 'about.head.subtitle' | t(d) }}</p>
        </div>

        <div class="mv-grid" data-stagger="180">
          <article class="mv-card">
            <div class="mv-card__icon" aria-hidden="true">[compass SVG verbatim]</div>
            <h3>{{ 'about.mission.title' | t(d) }}</h3>
            <p>{{ 'about.mission.text' | t(d) }}</p>
          </article>
          <article class="mv-card">
            <div class="mv-card__icon" aria-hidden="true">[eye SVG verbatim]</div>
            <h3>{{ 'about.vision.title' | t(d) }}</h3>
            <p>{{ 'about.vision.text' | t(d) }}</p>
          </article>
        </div>

        <div class="values-grid" data-stagger="120">
          <article class="value-card">
            <div class="value-card__icon" aria-hidden="true">[value-1 SVG verbatim]</div>
            <h4>{{ 'about.value.1.title' | t(d) }}</h4>
            <p>{{ 'about.value.1.text' | t(d) }}</p>
          </article>
          [… value-cards 2-5, same shape, each with its verbatim SVG …]
        </div>
      </div>
    </section>
```

And in `css/components.css`, next to the existing mv/values styles, add the stacking gap:

```css
/* On the merged contact page the values grid follows the mission/vision grid
   inside one section. */
.mv-grid + .values-grid,
.section-head ~ .values-grid {
  margin-top: var(--space-12);
}
```

(Use just `.mv-grid + .values-grid` if `.values-grid` already carries top spacing from its own section elsewhere — check `grep -n "values-grid" css/*.css` and keep whichever selector doesn't double-space the standalone use. There is no other standalone use after about.njk is deleted, so `.mv-grid + .values-grid` alone is correct.)

- [ ] **Step 6: Delete the about page and every reference**

1. Delete `src/about.njk`.
2. `src/_data/langs.js`: remove the `about: { de: 'ueber-uns', en: 'about' },` row.
3. `src/_data/meta.js`: remove the `about:` entry from BOTH language objects.
4. `src/index.njk` (~189): `href="{{ 'about' | url(lang) }}"` → `href="{{ 'contact' | url(lang) }}#about"` (the `about.cta` label text stays).
5. `src/404.njk` (~44): `href="{{ 'about' | url('de') }}"` → `href="{{ 'contact' | url('de') }}#about"`.
6. Verify: `grep -rn "'about' | url\|ueber-uns" src/` returns nothing; `npm run build` succeeds (the `url` filter throws on an unknown page key, so any missed reference fails the build loudly).

- [ ] **Step 7: Update the tests that reference the about page**

- `tests/nav-structure.test.mjs`: header count `5` → `4`; update the comment ("4 real pages").
- `tests/headings.spec.js`: remove `'/ueber-uns/'` from `darkHeroPages` AND from `allPages`; DELETE the `no inline colour workaround remains on the about section title` test entirely (its subject page no longer exists; the homepage's own inline-style debt is pre-existing and out of scope).
- `tests/i18n.spec.js`: remove `'/ueber-uns/'` from `DE_PAGES`.
- `tests/pathprefix.test.mjs`: remove `'ueber-uns'` from the pages array.
- `tests/visual.spec.js`: remove the `['about', '/ueber-uns/']` entry (the orphaned baseline PNGs are cleaned up in Task 9, which owns the snapshot dir).
- `tests/navbar.spec.js`: comment "five nav links" → "four nav links".

- [ ] **Step 8: CLAUDE.md minimal accuracy fixes**

- URL table: delete the `| about | /ueber-uns/ | /en/about/ |` row.
- Source-layout listing: `index.njk, about.njk, services.njk, …` → drop `about.njk`.
(The fuller docs pass happens in Task 9.)

- [ ] **Step 9: Run everything functional**

Run: `npm run test:build && npx playwright test tests/smoke.spec.js tests/headings.spec.js tests/hero.spec.js tests/navbar.spec.js tests/contact-form.spec.js tests/i18n.spec.js`
Expected: all pass on both projects. Do NOT run the visual suite.

- [ ] **Step 10: Commit (two commits, NO attribution trailer — user rule)**

```bash
git add css/components.css tests/headings.spec.js src/_data/site.js tests/navbar.spec.js tests/nav-structure.test.mjs
git commit -m "fix: lang-toggle active pill works on the navy bar; nav reordered services-first"

git add -A
git commit -m "feat: merge the About page into Kontakt

/kontakt/#about carries mission, vision and values (newly translated —
the old about page's body copy was hardcoded English even on /ueber-uns/).
The timeline/team/certification sections are retired; the homepage keeps
the stats and about-preview. Header nav is now 4 links."
```
