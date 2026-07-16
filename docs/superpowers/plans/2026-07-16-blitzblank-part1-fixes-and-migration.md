# BlitzBlank Part 1 — Critical Fixes & 11ty Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four defects that make the site non-functional, then migrate it to 11ty with a screenshot-verified guarantee that the migration changed nothing visually.

**Architecture:** Playwright is both the test runner and the visual-regression harness — it renders in a real browser, which is the only thing that catches these bugs (three static source audits missed the invisible headline; only rendering found it). Phase 0 fixes bugs in the existing flat files under TDD. Phase 1 introduces 11ty *preserving the exact same output URLs* (`/index.html`, `/about.html`, …), so the Phase 0 screenshot baselines remain valid and prove the migration is visually neutral. URL localization comes in Part 2.

**Tech Stack:** Node 22, Eleventy 3.1.6 (Nunjucks), @playwright/test 1.61.1, @axe-core/playwright 4.12.1. No other runtime dependencies; output is plain static HTML.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-16-blitzblank-rebuild-design.md`. Read it before starting.
- **Branch:** `rebuild/ui-ux-and-code-quality`. Baseline commit `f1a4f5b`.
- **Part 1 preserves output URLs exactly** — `_site/index.html`, `_site/about.html`, `_site/services.html`, `_site/gallery.html`, `_site/contact.html`, `_site/404.html`. Renaming to `/leistungen/` is Part 2. This is what keeps the visual baselines meaningful.
- **Part 1 changes no visual design beyond the four bug fixes.** Any other pixel change is a regression, and the screenshot tests will fail it. Refinement is Part 2.
- **Browser floor:** features must be Baseline Widely available. Firefox is 9.8% of German traffic — do NOT use `interpolate-size`, `::scroll-button()`, `animation-timeline`, or `@container scroll-state()`. (Full analysis in the spec.)
- **Do not delete `js/i18n.js` in Part 1.** It is replaced by build-time i18n in Part 2. Part 1 only fixes its `minLength` message string.
- **Never commit `_site/`.** It is in `.gitignore`.
- **Commit after every task.** Each task ends green.

---

### Task 1: Playwright harness

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Create: `tests/smoke.spec.js`

**Interfaces:**
- Produces: an `npm test` command running Playwright against a static server on port 8080 serving the repo root. Later tasks add specs under `tests/`. Task 7 repoints the server at 11ty.

- [ ] **Step 1: Create `package.json`**

`"type": "module"` is required: `playwright.config.js`, `.eleventy.js`, and every
`src/_data/*.js` file use `export default`. Node 22 would otherwise reparse each of them as
ESM after failing to parse as CommonJS, emitting a `MODULE_TYPELESS_PACKAGE_JSON` warning on
every build. It does not affect `js/*.js` — those are browser scripts loaded via `<script>`,
never imported by Node.

```json
{
  "name": "blitzblank",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "BlitzBlank — Premium Reinigung Düsseldorf",
  "scripts": {
    "test": "playwright test",
    "test:update-snapshots": "playwright test --update-snapshots"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.12.1",
    "@playwright/test": "1.61.1"
  }
}
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes, creates `node_modules/` and `package-lock.json`. `node_modules/` is already gitignored.

- [ ] **Step 3: Ensure the browser binary is present**

Run: `npx playwright install chromium`
Expected: either downloads Chromium, or reports it is already installed. Both are success.

- [ ] **Step 4: Create `playwright.config.js`**

Note `webServer.command` serves the repo root. Task 7 changes this one line to run 11ty.

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
```

- [ ] **Step 5: Create `tests/smoke.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('homepage loads and shows the brand', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.navbar .logo__name')).toHaveText('BlitzBlank');
});
```

- [ ] **Step 6: Run it**

Run: `npm test -- tests/smoke.spec.js`
Expected: 2 passed (one per project). If the `.logo__name` selector does not match, run `grep -n 'logo__name\|logo__' index.html` and use the actual class — do not change the test's intent.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json playwright.config.js tests/smoke.spec.js
git commit -m "test: add Playwright harness with static server"
```

---

### Task 2: Fix the contact form — `minLength` always fails

**Files:**
- Modify: `js/contact.js:14` (validator signature), `js/contact.js:41-51` (error message)
- Modify: `js/i18n.js:263` (EN message), `js/i18n.js:595` (DE message)
- Test: `tests/contact-form.spec.js`

**Interfaces:**
- Consumes: the Playwright harness from Task 1.
- Produces: a working `#contact-form`. Task 3 extends the same spec file with the consent case.

**Background:** `js/contact.js:14` declares `minLength: (v, n) => v.trim().length >= n` but `js/contact.js:28` calls `validator(value, input, arg)`. `n` binds to the `<input>`, so `2 >= HTMLInputElement` → `NaN` → always false. Every submit fails. Fix the signature to match the call site. Note `checked: (_, el) => el.checked` at line 15 already relies on the 2nd arg being the element — so the 3rd-arg convention is the correct one to standardise on.

- [ ] **Step 1: Write the failing test**

Create `tests/contact-form.spec.js`:

```js
import { test, expect } from '@playwright/test';

// #service carries data-rules="required" and its first option is value="" —
// omitting it makes every "valid" submission fail on that field instead.
async function fillValidForm(page) {
  await page.fill('#firstName', 'Anna');
  await page.fill('#lastName', 'Schmidt');
  await page.fill('#email', 'anna.schmidt@example.de');
  await page.selectOption('#service', 'office');
  await page.fill('#message', 'I would like a quote for a weekly office clean, roughly 200sqm.');
  await page.check('#consent');
}

test('submits successfully with valid input', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('.form-message')).toHaveClass(/form-message--success/, { timeout: 5000 });
});

test('shows an error for too-short input', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.fill('#firstName', 'A');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('#firstName').locator('xpath=ancestor::div[contains(@class,"field")][1]'))
    .toHaveClass(/field--error/);
});

test('error message states the real minimum, not a hardcoded 3', async ({ page }) => {
  await page.goto('/contact.html');
  await page.fill('#firstName', 'A');
  await page.click('#contact-form [type="submit"]');
  const msg = await page.locator('#firstName ~ .field__error').textContent();
  expect(msg).toContain('2');
  expect(msg).not.toContain('3');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/contact-form.spec.js --project=desktop`
Expected: FAIL. Test 1 fails because `.form-message--success` never appears (the bug). Test 3 fails because the message reads "at least 3 characters".

- [ ] **Step 3: Fix the validator signature**

In `js/contact.js`, replace line 14:

```js
    minLength: (v, n) => v.trim().length >= n,
```

with:

```js
    minLength: (v, _el, n) => v.trim().length >= n,
```

- [ ] **Step 4: Pass the rule argument into the error message**

In `js/contact.js`, replace line 32:

```js
        if (errEl) errEl.textContent = getErrorMessage(name, input);
```

with:

```js
        if (errEl) errEl.textContent = getErrorMessage(name, arg);
```

Then replace the whole `getErrorMessage` function (lines 41-51):

```js
  function getErrorMessage(name, arg) {
    const t = (window.I18n && window.I18n.t) ? window.I18n.t.bind(window.I18n) : (k) => k;
    const messages = {
      required: t('form.required'),
      email: t('form.email'),
      phone: t('form.phone'),
      minLength: t('form.minLength').replace('{n}', arg),
      checked: t('form.checked'),
    };
    return messages[name] || t('form.required');
  }
```

- [ ] **Step 5: Make the message interpolable in both languages**

In `js/i18n.js`, replace line 263:

```js
      'form.minLength': 'Please enter at least 3 characters.',
```

with:

```js
      'form.minLength': 'Please enter at least {n} characters.',
```

and replace line 595:

```js
      'form.minLength': 'Bitte mindestens 3 Zeichen eingeben.',
```

with:

```js
      'form.minLength': 'Bitte mindestens {n} Zeichen eingeben.',
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- tests/contact-form.spec.js --project=desktop`
Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add js/contact.js js/i18n.js tests/contact-form.spec.js
git commit -m "fix: contact form could never be submitted

minLength was declared (v, n) but called as (value, input, arg), so n bound
to the input element and every comparison evaluated to NaN. The form carries
novalidate, so this was the only validation path — no submission has ever
succeeded.

Also interpolate the real minimum into the message, which was hardcoded to
'at least 3 characters' while the rules are minLength:2 and minLength:10."
```

---

### Task 3: Fix the unvalidated consent checkbox

**Files:**
- Modify: `contact.html:185-190`
- Test: `tests/contact-form.spec.js` (extend)

**Interfaces:**
- Consumes: the working validator from Task 2.
- Produces: a consent field that blocks submission. Its `.field__error` span follows the same structure as every other field, so Part 2's native-validation rewrite can treat it uniformly.

**Background:** `js/contact.js:19` looks for `.field__input, .field__textarea, .field__select`. The consent checkbox has no class, so `js/contact.js:20` returns `true` before the `checked` rule is ever consulted. The field also has no `.field__error` span, so even a failing rule would have nowhere to render. GDPR consent that cannot fail.

Keep the inline styles for now — moving 57 inline styles to classes is Part 2, and doing it here would trip the visual baselines.

- [ ] **Step 1: Write the failing test**

Append to `tests/contact-form.spec.js`:

```js
test('blocks submission when consent is unchecked', async ({ page }) => {
  await page.goto('/contact.html');
  await page.fill('#firstName', 'Anna');
  await page.fill('#lastName', 'Schmidt');
  await page.fill('#email', 'anna.schmidt@example.de');
  await page.fill('#message', 'I would like a quote for a weekly office clean, roughly 200sqm.');
  // deliberately do NOT check #consent
  await page.click('#contact-form [type="submit"]');

  await expect(page.locator('.form-message')).not.toHaveClass(/form-message--success/);
  await expect(page.locator('#consent').locator('xpath=ancestor::div[contains(@class,"field")][1]'))
    .toHaveClass(/field--error/);
});

test('consent field renders an error message', async ({ page }) => {
  await page.goto('/contact.html');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('#consent ~ .field__error')).not.toBeEmpty();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/contact-form.spec.js --project=desktop`
Expected: FAIL — the consent field never gets `field--error`, and there is no `.field__error` element to assert on.

- [ ] **Step 3: Give the checkbox a recognised class and an error slot**

In `contact.html`, replace lines 185-190:

```html
                <div class="field" style="display:flex; align-items:flex-start; gap: var(--space-3); background: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md);">
                  <input type="checkbox" id="consent" name="consent" data-rules="checked" style="margin-top:4px; width:18px; height:18px; accent-color: var(--color-secondary);" required />
                  <label for="consent" style="font-size: var(--fs-sm); color: var(--color-muted); margin: 0; line-height: var(--lh-normal);">
                    I agree to be contacted about my request and accept the <a href="#" style="color: var(--color-secondary); text-decoration: underline;">privacy policy</a>. We never share your data.
                  </label>
                </div>
```

with:

```html
                <div class="field" style="display:flex; align-items:flex-start; gap: var(--space-3); background: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); flex-wrap: wrap;">
                  <input class="field__input" type="checkbox" id="consent" name="consent" data-rules="checked" style="margin-top:4px; width:18px; height:18px; flex: 0 0 auto; accent-color: var(--color-secondary);" required />
                  <label for="consent" style="font-size: var(--fs-sm); color: var(--color-muted); margin: 0; line-height: var(--lh-normal); flex: 1;">
                    I agree to be contacted about my request and accept the <a href="#" style="color: var(--color-secondary); text-decoration: underline;">privacy policy</a>. We never share your data.
                  </label>
                  <span class="field__error" aria-live="polite" style="flex: 0 0 100%;"></span>
                </div>
```

Note: `.field__input` is a text-input style rule. Verify the checkbox does not visibly change — the inline `width`/`height` should still win. Step 5 checks this.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- tests/contact-form.spec.js --project=desktop`
Expected: 5 passed.

- [ ] **Step 5: Confirm the checkbox did not change appearance**

Run:
```bash
npx playwright screenshot --viewport-size=1440,1000 \
  --selector='#consent' http://localhost:8080/contact.html /tmp/consent-check.png
```
Open `/tmp/consent-check.png`. Expected: an 18×18 checkbox, unchanged. If `.field__input` has overridden its size or border, add the minimal inline override needed and re-check. Do not restyle it.

- [ ] **Step 6: Commit**

```bash
git add contact.html tests/contact-form.spec.js
git commit -m "fix: consent checkbox was never validated

The checkbox had no .field__input class, so validateField() returned true
before reaching the 'checked' rule — a GDPR consent box that could not fail.
It also had no .field__error slot to render a message into."
```

---

### Task 4: Fix the invisible hero headline

**Files:**
- Modify: `css/animations.css:132-141` (stagger), `css/animations.css:269-277` (`.text-gradient`)
- Modify: `css/variables.css` (add on-dark gradient token)
- Modify: `index.html:150-153` (explicit stagger classes)
- Test: `tests/hero.spec.js`

**Interfaces:**
- Produces: `.hero-line--1/2/3` stagger classes replacing `:nth-child`, and `--gradient-text-on-dark`.

**Background — three bugs in one element:**

1. `css/animations.css:132-136` sets `.hero-line { opacity: 0; animation: fadeInUp … forwards }`. `css/animations.css:276` sets `.text-gradient { animation: gradientShift 6s ease infinite }`. Equal specificity (0,1,0); `.text-gradient` is later in the same file, so it **replaces the `animation` shorthand**. `fadeInUp` never runs and nothing lifts `opacity: 0`. Verified: computed `opacity: "0"` on a laid-out 648×92 box reading "obsessive care." — the payoff of the site's main headline. It has never been seen.
2. Delays key off `:nth-child`, but the `<br>` at `index.html:151` counts as a child. Children are span(1), br(2), span(3), span(4); the third span matches no rule. Intended 200/360/520ms computes to **200 → 520 → 0s**.
3. `--gradient-text` is `#2563EB → #06B6D4` — blue-on-blue over the hero overlay. Visible would still be unreadable.

`.text-gradient` is used exactly once in the codebase (`index.html:153`), so removing its `animation` affects nothing else. (`var(--gradient-text)` is used elsewhere but on different selectors.)

- [ ] **Step 1: Write the failing test**

Create `tests/hero.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('the third hero line is actually visible', async ({ page }) => {
  await page.goto('/index.html');
  const line = page.locator('.hero__title .text-gradient');
  await expect(line).toHaveText('obsessive care.');
  await expect(line).toBeVisible();
  await expect(async () => {
    const opacity = await line.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.99);
  }).toPass({ timeout: 5000 });
});

test('hero lines stagger in reading order', async ({ page }) => {
  await page.goto('/index.html');
  const delays = await page.$$eval('.hero__title .hero-line', (els) =>
    els.map((el) => parseFloat(getComputedStyle(el).animationDelay))
  );
  expect(delays).toHaveLength(3);
  expect(delays[0]).toBeLessThan(delays[1]);
  expect(delays[1]).toBeLessThan(delays[2]);
});

test('hero gradient text uses the on-dark ramp, not blue-on-blue', async ({ page }) => {
  await page.goto('/index.html');
  const bg = await page.locator('.hero__title .text-gradient')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toContain('255, 255, 255');
  expect(bg).not.toContain('37, 99, 235');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/hero.spec.js --project=desktop`
Expected: all 3 FAIL. Test 1 reports opacity `0`; test 2 reports delays `[0.2, 0.52, 0]`; test 3 finds the blue ramp.

- [ ] **Step 3: Add the on-dark gradient token**

In `css/variables.css`, after line 45 (`--gradient-text: …`), add:

```css
  --gradient-text-on-dark: linear-gradient(135deg, #FFFFFF 0%, #A5F3FC 100%);
```

- [ ] **Step 4: Replace `:nth-child` stagger with explicit classes**

In `css/animations.css`, replace lines 132-141:

```css
.hero-line {
  display: inline-block;
  opacity: 0;
  transform: translateY(40px);
  animation: fadeInUp 900ms var(--ease-out) forwards;
}

.hero-line:nth-child(1) { animation-delay: 200ms; }
.hero-line:nth-child(2) { animation-delay: 360ms; }
.hero-line:nth-child(3) { animation-delay: 520ms; }
```

with:

```css
/* Stagger is keyed to explicit classes, not :nth-child — the <br> inside
   .hero__title counts as a child and silently shifted every delay. */
.hero-line {
  display: inline-block;
  opacity: 0;
  transform: translateY(40px);
  animation: fadeInUp 900ms var(--ease-out) forwards;
}

.hero-line--1 { animation-delay: 200ms; }
.hero-line--2 { animation-delay: 360ms; }
.hero-line--3 { animation-delay: 520ms; }
```

- [ ] **Step 5: Stop `.text-gradient` clobbering the entrance animation**

In `css/animations.css`, replace lines 269-277:

```css
.text-gradient {
  background: var(--gradient-text);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: gradientShift 6s ease infinite;
}
```

with:

```css
/* Carries no `animation` of its own: as an equal-specificity rule later in
   the cascade it replaced the `animation` shorthand on anything it was
   combined with. On .hero-line that cancelled fadeInUp and left the text at
   opacity 0 permanently. Shimmer is opt-in via .text-gradient--shimmer. */
.text-gradient {
  background-image: var(--gradient-text);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.text-gradient--shimmer {
  animation: gradientShift 6s ease infinite;
}

/* Hero sits on a dark blue overlay; the default blue→cyan ramp is
   effectively invisible there. Entrance first, then shimmer. */
.hero__title .text-gradient {
  background-image: var(--gradient-text-on-dark);
  animation:
    fadeInUp 900ms var(--ease-out) 520ms forwards,
    gradientShift 6s ease 1420ms infinite;
}
```

- [ ] **Step 6: Add the stagger classes to the markup**

In `index.html`, replace lines 150-154:

```html
        <h1 class="hero__title">
          <span class="hero-line" data-i18n="hero.title1">Immaculate spaces,</span><br />
          <span class="hero-line" data-i18n="hero.title2">crafted with</span>
          <span class="hero-line text-gradient" data-i18n="hero.title3">obsessive care.</span>
        </h1>
```

with:

```html
        <h1 class="hero__title">
          <span class="hero-line hero-line--1" data-i18n="hero.title1">Immaculate spaces,</span><br />
          <span class="hero-line hero-line--2" data-i18n="hero.title2">crafted with</span>
          <span class="hero-line hero-line--3 text-gradient" data-i18n="hero.title3">obsessive care.</span>
        </h1>
```

- [ ] **Step 7: Run to verify it passes**

Run: `npm test -- tests/hero.spec.js --project=desktop`
Expected: 3 passed.

- [ ] **Step 8: Confirm with your own eyes**

Run:
```bash
npx playwright screenshot --viewport-size=1440,1000 --wait-for-timeout=3000 \
  http://localhost:8080/index.html /tmp/hero-fixed.png
```
Open `/tmp/hero-fixed.png`. Expected: the headline reads "Immaculate spaces, crafted with **obsessive care.**" in full, the third line in a white→pale-cyan ramp, clearly legible against the photo. **This is the first time this text has ever rendered.** If it is legible but cramped or awkwardly wrapped, note it for Part 2 — do not adjust type here.

- [ ] **Step 9: Commit**

```bash
git add css/animations.css css/variables.css index.html tests/hero.spec.js
git commit -m "fix: hero headline's third line has never been visible

.text-gradient declared `animation`, and as an equal-specificity rule later
in the same file it replaced .hero-line's `animation` shorthand. fadeInUp
never ran, so opacity:0 was never lifted — 'obsessive care.' occupied a
648x92 box and painted nothing.

Also: stagger delays keyed off :nth-child, but the <br> counts as a child,
so 200/360/520ms actually computed to 200/520/0 — the last line landed
first. And the blue-to-cyan ramp sat on a blue overlay; the hero now uses a
white-to-pale-cyan ramp that reads against it."
```

---

### Task 5: Fix dark-on-dark headings

**Files:**
- Modify: `css/style.css:95-100`
- Modify: `about.html:338` (remove the inline workaround)
- Test: `tests/headings.spec.js`

**Interfaces:**
- Produces: a zero-specificity heading reset. Part 2's `@layer` work builds on this.

**Background:** `css/style.css:96` sets `color: var(--color-primary)` (`#0F172A`) on `h1`–`h6` at specificity (0,0,1). `.page-hero` sets `background: var(--color-primary)` and `color: white` on itself, but the heading rule supplies its own colour, so inheritance loses. The `<h1>` on about/services/gallery/contact renders `#0F172A` on `#0F172A`. Same failure on `.promo-banner h2`. Confirmed by screenshot.

`about.html:338` already carries `style="color: var(--color-white)"` — someone hit this and
patched one element by hand. That hack gets deleted here.

**CORRECTED DURING IMPLEMENTATION — read this before you start.**

This task originally instructed: "`:where()` drops the reset to specificity (0,0,0) so
inherited colour wins naturally." **That is wrong.** It was proven wrong three independent
ways in a real browser (isolated CSS test, live before/after, and a 96-heading computed-style
diff): applying only `:where()` left 5 of 6 tests red.

Why: **specificity only arbitrates between declarations on the same element. Inheritance
applies only when no declaration matches that element at all.** A zero-specificity
`:where(h1)` still declares a colour directly on the `h1`, so it beats the inherited value
no matter how low its specificity. Dropping specificity does not hand the element back to
inheritance.

And deleting the reset's colour outright does not work either: `.section-title` declares
`color: var(--color-primary)` on *itself* at (0,1,0). Verified empirically — that heading
still paints dark.

**The actual fix:** keep `:where()` (it is still wanted for Part 2's `@layer` work), and add
an explicit `color: inherit` to headings in dark contexts — `.page-hero h1`,
`.promo-banner h2`, and `.section--dark .section-title`. `color: inherit` is a declaration on
the element, so it wins, and it resolves to whatever the dark ancestor set.

Note this is targeted, not systemic: a new dark section with an unpatched heading regresses.
Part 2's `@layer` restructure should replace it with a general rule.

- [ ] **Step 1: Write the failing test**

Create `tests/headings.spec.js`:

```js
import { test, expect } from '@playwright/test';

function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const darkHeroPages = ['/about.html', '/services.html', '/gallery.html', '/contact.html'];

for (const path of darkHeroPages) {
  test(`h1 on ${path} is readable against the dark hero`, async ({ page }) => {
    await page.goto(path);
    const h1 = page.locator('.page-hero h1');
    const fg = await h1.evaluate((el) => getComputedStyle(el).color);
    const bg = await page.locator('.page-hero').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
}

test('CTA banner h2 is readable against its dark background', async ({ page }) => {
  await page.goto('/index.html');
  const fg = await page.locator('.promo-banner h2').evaluate((el) => getComputedStyle(el).color);
  const bg = await page.locator('.promo-banner').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
});

test('no inline colour workaround remains on the about section title', async ({ page }) => {
  await page.goto('/about.html');
  const count = await page.locator('.section--dark .section-title[style*="color"]').count();
  expect(count).toBe(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/headings.spec.js --project=desktop`
Expected: all 6 FAIL. The four hero tests report a contrast ratio of ~1.0 (identical colours). The last fails on the inline hack.

- [ ] **Step 3: Drop the heading reset to zero specificity**

In `css/style.css`, replace lines 95-100:

```css
h1, h2, h3, h4, h5, h6 {
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--ls-tight);
  color: var(--color-primary);
}
```

with:

```css
/* :where() keeps this at specificity (0,0,0) so an ancestor's colour is
   inherited normally. At (0,0,1) it beat inheritance and painted headings
   #0F172A on #0F172A backgrounds across every dark section. */
:where(h1, h2, h3, h4, h5, h6) {
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--ls-tight);
  color: var(--color-primary);
}
```

- [ ] **Step 4: Delete the inline workaround it existed to paper over**

In `about.html:338`, replace:

```html
        <h2 class="section-title" style="color: var(--color-white)">
```

with:

```html
        <h2 class="section-title">
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- tests/headings.spec.js --project=desktop`
Expected: 6 passed.

- [ ] **Step 6: Check nothing on a light background regressed**

`:where()` also means any rule that previously *lost* to the reset now wins. Run:

```bash
npm test -- tests/ --project=desktop
```
Expected: all green. Then screenshot each page and confirm headings on light backgrounds are still dark navy:

```bash
for p in index about services gallery contact; do
  npx playwright screenshot --viewport-size=1440,1600 --full-page --wait-for-timeout=2500 \
    http://localhost:8080/$p.html /tmp/where-$p.png
done
```
Open each. Expected: body headings still `#0F172A`; only the dark-background ones changed to white. If any heading is now the wrong colour, the culprit is a rule that was relying on the reset's specificity — fix that rule, do not revert `:where()`.

- [ ] **Step 7: Commit**

```bash
git add css/style.css about.html tests/headings.spec.js
git commit -m "fix: headings rendered dark navy on dark navy

The h1-h6 reset set color at specificity (0,0,1), which beats inherited
colour. Every dark section — the page hero on four pages, the CTA banner —
painted its heading #0F172A on a #0F172A background. :where() drops the
reset to (0,0,0) so inheritance works.

Removes the inline style=\"color: var(--color-white)\" hack on about.html
that was papering over this on exactly one element."
```

---

### Task 6: Lock in visual baselines

**Files:**
- Create: `tests/visual.spec.js`
- Modify: `.gitignore` (allow committing snapshots)

**Interfaces:**
- Produces: committed reference screenshots under `tests/visual.spec.js-snapshots/`. Tasks 7-10 must not change them. This is the mechanism that makes the migration provably neutral.

Baselines are captured **after** the Phase 0 fixes, so they encode correct rendering. Everything from here must match them.

- [ ] **Step 1: Un-ignore the snapshot directory**

`.gitignore` currently has `/screenshots/`-style entries; Playwright snapshots live beside the spec and must be committed. Append to `.gitignore`:

```gitignore
# Playwright snapshots ARE committed — they are the migration's proof of
# visual neutrality. Only transient run artifacts are ignored.
!tests/**/*-snapshots/
```

- [ ] **Step 2: Create `tests/visual.spec.js`**

**Read this before writing the file — FOUR non-obvious hazards, all verified in a real
browser. An earlier attempt at this task shipped green tests over blank baselines because
the first two were not handled. Do not skip this.**

1. **`scroll-behavior: smooth` breaks scripted scrolling.** `css/style.css:16` sets it
   globally. `window.scrollTo(0, y)` therefore *animates* rather than jumping, and a loop
   outruns it — real `scrollY` tops out at a nondeterministic ceiling (1947-4289px observed)
   before the final `scrollTo(0,0)` reverses it. Content below that ceiling never fires its
   IntersectionObserver and stays frozen at `opacity: 0`.
   **This fails silently and dangerously:** a frozen page is trivially identical between
   Playwright's two comparison shots, so the test passes green over a blank baseline.
   **Fix: `window.scrollTo({ top: y, behavior: 'instant' })`** — `behavior: 'instant'`
   overrides the CSS declaration per call.
2. **The testimonial slider autoplays** on a 6s interval and races the capture on
   `index.html`. `js/slider.js` exports its live instances as `window.Slider.instances`, and
   the class has `stop()` plus `goTo(index, animate = true)`. Stop each instance and pin it
   to slide 0 with `goTo(0, false)` — using the module's own API, not timer hacks.
3. **Scroll reveals.** `data-reveal` + IntersectionObserver means below-fold elements only
   become visible once scrolled into view. This is why the page must be walked at all.
4. **JS counters.** They animate ~2.2s via `requestAnimationFrame`. Playwright's
   `animations: 'disabled'` freezes CSS animations only — **not** JS ones. Verified
   distribution: `index.html` 7 counters (3 hero above fold, 4 in `#stats` below),
   `about.html` 4 (below fold), the other four pages none. Verified final values: `500+`,
   `15+`, `100%`, `12,500+`, `42`, `98%`. No counter uses decimals, so stripping non-digits
   is a safe comparison.

```js
import { test, expect } from '@playwright/test';

const pages = [
  ['home', '/index.html'],
  ['about', '/about.html'],
  ['services', '/services.html'],
  ['gallery', '/gallery.html'],
  ['contact', '/contact.html'],
  ['notfound', '/404.html'],
];

/**
 * Make the page deterministic before capture.
 *
 * Walks the full height so every IntersectionObserver fires (scroll reveals and
 * the below-fold stat counters both depend on it), then returns to the top.
 *
 * `behavior: 'instant'` is REQUIRED, not stylistic: css/style.css:16 sets
 * `scroll-behavior: smooth` globally, so a plain scrollTo animates, this loop
 * outruns it, and the page freezes part-way with content still at opacity:0.
 * That failure is silent — a frozen page compares as "stable" and the baseline
 * passes green while showing blank sections.
 */
async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  // The testimonial slider autoplays every 6s and would race the capture.
  // Stop it through the module's own exported instances and pin it to slide 0.
  await page.evaluate(() => {
    window.Slider?.instances?.forEach((s) => {
      s.stop();
      s.goTo(0, false);
    });
  });

  // Every counter must have reached its target. Pages with no counters pass
  // instantly ([].every() === true).
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('[data-counter]')].every(
          (el) => el.textContent.replace(/\D/g, '') === String(el.dataset.counter)
        ),
      { timeout: 15_000 }
    )
    .catch(() => {
      throw new Error(
        'Counters never reached their targets — the page did not fully reveal. ' +
          'Check that scrollTo is using behavior:"instant". Do NOT weaken this wait: ' +
          'a partially-revealed page still compares as stable and passes green.'
      );
    });

  // Hero entrance chain: 520ms delay + 900ms duration, plus slider settle.
  await page.waitForTimeout(1500);
}

for (const [name, path] of pages) {
  test(`${name} renders identically`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
```

- [ ] **Step 3: Generate the baselines**

Run: `npm run test:update-snapshots -- tests/visual.spec.js`
Expected: 12 snapshots written (6 pages × 2 projects) under `tests/visual.spec.js-snapshots/`.

- [ ] **Step 4: Verify they are stable — run three times**

A baseline that passes once proves nothing; these captures have several nondeterminism
sources. Run the suite three times in a row:

```bash
npm test -- tests/visual.spec.js && \
npm test -- tests/visual.spec.js && \
npm test -- tests/visual.spec.js
```
Expected: 12 passed, three times.

If a page flaps, diagnose before touching any tolerance. Likely causes, in order:
1. A hot-linked Unsplash image resolving at a different time → raise that page's settle
   timeout.
2. A counter captured mid-count → the `waitForFunction` in `settle()` is not covering it.
3. A CSS animation Playwright did not freeze.

**Do NOT loosen `maxDiffPixelRatio` or lower a timeout to get green.** These baselines are the
only thing standing between the migration and silent visual regressions; a tolerance wide
enough to hide flake is wide enough to hide a real break. Record any page that needed a
longer wait, and why, in your report.

- [ ] **Step 5: Commit**

```bash
git add .gitignore tests/visual.spec.js tests/visual.spec.js-snapshots
git commit -m "test: lock in visual baselines after the critical fixes

Captured post-fix, so they encode correct rendering. The 11ty migration must
reproduce these exactly — this is what makes 'the refactor changed nothing'
a checked claim rather than a hope."
```

---

### Task 7: Scaffold 11ty, building `index.html` byte-for-byte

**Files:**
- Create: `.eleventy.js`
- Create: `src/index.njk`
- Modify: `package.json` (scripts + dependency)
- Modify: `playwright.config.js` (webServer command)
- Modify: `.gitignore` (verify `_site/`)

**Interfaces:**
- Produces: `npm run build` → `_site/`; `npm start` → dev server on 8080. Passthrough copies `css/`, `js/`, `assets/`. Permalinks preserve `/index.html`-style URLs (Global Constraints).

This task moves exactly one page and proves the pipeline. Tasks 8-10 do the rest.

- [ ] **Step 1: Add Eleventy**

Run: `npm install --save-dev @11ty/eleventy@3.1.6`
Expected: installs cleanly.

- [ ] **Step 2: Create `.eleventy.js`**

```js
export default function (eleventyConfig) {
  // Static assets are served as-is; Part 2 revisits CSS/JS pipelines.
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('assets');

  eleventyConfig.setServerOptions({ port: 8080, showAllHosts: false });

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
```

- [ ] **Step 3: Move the homepage into `src/`**

Run:
```bash
mkdir -p src
git mv index.html src/index.njk
```

- [ ] **Step 4: Pin its output URL**

Add this front matter at the very top of `src/index.njk`, above `<!DOCTYPE html>`:

```yaml
---
permalink: /index.html
---
```

- [ ] **Step 5: Update npm scripts**

In `package.json`, replace the `"scripts"` block:

```json
  "scripts": {
    "start": "eleventy --serve",
    "build": "eleventy",
    "test": "playwright test",
    "test:update-snapshots": "playwright test --update-snapshots"
  },
```

- [ ] **Step 6: Point Playwright at 11ty**

In `playwright.config.js`, replace the `webServer` block:

```js
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
```

- [ ] **Step 7: Build and confirm output exists**

Run: `npm run build && ls _site/`
Expected: `_site/index.html`, `_site/css/`, `_site/js/`, `_site/assets/`. The other five pages are NOT there yet — that is expected; they arrive in Task 9.

- [ ] **Step 8: Confirm the homepage is unchanged, pixel for pixel**

Run: `npm test -- tests/visual.spec.js --grep "home renders"`
Expected: 2 passed against the Task 6 baselines. **A failure here means Nunjucks altered the markup** — most likely by interpreting `{{` or `{%` inside inline JSON-LD or SVG. If so, wrap the offending block in `{% raw %}…{% endraw %}` rather than editing the content.

- [ ] **Step 9: Confirm the fix tests still pass**

Run: `npm test -- tests/hero.spec.js tests/smoke.spec.js --project=desktop`
Expected: 4 passed.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "build: introduce Eleventy, migrate the homepage

Output URLs are pinned to the existing /index.html form so the visual
baselines stay valid and the migration is provably neutral. URL localisation
lands in Part 2."
```

---

### Task 8: Extract the navbar, footer, and head into a layout

**Files:**
- Create: `src/_includes/layouts/base.njk`
- Create: `src/_includes/partials/navbar.njk`
- Create: `src/_includes/partials/footer.njk`
- Create: `src/_data/site.js`
- Modify: `src/index.njk`

**Interfaces:**
- Produces: `layouts/base.njk`, consuming front matter `title`, `description`, `navbarSolid` (bool), `bodyClass` (optional). Partials read `site` from `src/_data/site.js`, exposing `site.brand`, `site.phone`, `site.phoneHref`, `site.email`, `site.address`, `site.nav[]`. Tasks 9-10 depend on these exact names.

**Background:** 485 lines of chrome are copy-pasted across 6 pages and **have already drifted** — `index.html:120` is the only navbar whose hamburger carries `data-i18n-aria="nav.menu"`, and `index.html:752` the only newsletter button with `data-i18n-aria="footer.subscribe"`; the other four never translate. Footer social labels differ between copies. This task makes the drift structurally impossible.

**Take `index.html`'s copy as canonical** — it is the most complete (7 nav links, the aria labels the others lack). Adopting it means the other pages *gain* the missing `data-i18n-aria` attributes, which is a deliberate correction, not a regression.

- [ ] **Step 1: Create `src/_data/site.js`**

Values copied verbatim from the current markup — do not invent any.

```js
export default {
  brand: 'BlitzBlank',
  tagline: 'Premium Reinigung',
  phone: '+49 211 934 567 89',
  phoneHref: 'tel:+4921193456789',
  email: 'hallo@blitzblank.de',
  address: 'Königsallee 42, 40212 Düsseldorf',
  nav: [
    { key: 'nav.home', label: 'Home', href: 'index.html' },
    { key: 'nav.about', label: 'About', href: 'about.html' },
    { key: 'nav.services', label: 'Services', href: 'services.html' },
    { key: 'nav.gallery', label: 'Gallery', href: 'gallery.html' },
    { key: 'nav.reviews', label: 'Reviews', href: 'index.html#reviews' },
    { key: 'nav.faq', label: 'FAQ', href: 'index.html#faq' },
    { key: 'nav.contact', label: 'Contact', href: 'contact.html' },
  ],
};
```

- [ ] **Step 2: Extract the navbar**

Open `src/index.njk`, find `<header class="navbar" id="navbar">` (~line 82) through its closing `</header>`. Move that block verbatim into `src/_includes/partials/navbar.njk`, then make exactly three changes:

1. The opening tag becomes:
   ```njk
   <header class="navbar{% if navbarSolid %} navbar--solid{% endif %}" id="navbar">
   ```
2. The nav-link list becomes a loop over `site.nav`. Replace the seven hardcoded `<li>` elements with:
   ```njk
   {% for item in site.nav %}
     <li><a class="nav-link" href="{{ item.href }}" data-i18n="{{ item.key }}">{{ item.label }}</a></li>
   {% endfor %}
   ```
   **Do NOT add an `is-active` conditional here.** Verified: no page hardcodes `is-active` in
   its markup — `initActiveNav()` at `js/animations.js:188-196` applies it at runtime from
   `location.pathname`. Adding it in the template would duplicate that and risk a visual diff
   where the two disagree. Moving active-state to `aria-current` is Part 2's job.

   Reproduce the inner `.nav-link__underline` span exactly as it appears now — every nav link
   has one.
3. The phone number and `tel:` href reference `{{ site.phone }}` and `{{ site.phoneHref }}`.
4. The logo text uses `{{ site.brand }}` (inside `.logo__name`) and `{{ site.tagline }}`
   (inside `.logo__tag`). These render the same literals that are there now — `BlitzBlank` and
   `Premium Reinigung` — so the output is unchanged, but the brand name stops being hardcoded
   in two partials. The `tests/smoke.spec.js` assertion on `.logo__name` guards this.

Leave everything else — SVGs, `data-i18n`, `aria-*`, the lang switcher — byte-identical.

- [ ] **Step 3: Extract the footer**

Move `<footer class="footer">` through `</footer>` from `src/index.njk` into `src/_includes/partials/footer.njk` verbatim. Replace only the literal phone, `tel:` href, email, and address with `{{ site.phone }}`, `{{ site.phoneHref }}`, `{{ site.email }}`, `{{ site.address }}`. Change nothing else.

- [ ] **Step 4: Create `src/_includes/layouts/base.njk`**

Take everything in `src/index.njk` from `<!DOCTYPE html>` down to (but excluding) `<header class="navbar">`, and everything after `</footer>` to `</html>`. Wrap the body:

```njk
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- PASTE the existing <head> contents here verbatim, with these three swaps: -->
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}" />
  {% if robots %}<meta name="robots" content="{{ robots }}" />{% endif %}
  <!-- ...everything else from the current <head> unchanged, including the
       icon, preconnects, font link, and the five stylesheet links IN ORDER... -->
</head>
<body{% if bodyClass %} class="{{ bodyClass }}"{% endif %}>
  <!-- PASTE the skip link and preloader here verbatim -->

  {% include "partials/navbar.njk" %}

  {{ content | safe }}

  {% include "partials/footer.njk" %}

  <!-- PASTE the back-to-top button and the nine <script> tags here verbatim,
       in their current order, app.js last -->
</body>
</html>
```

**The five stylesheet links must stay in their current order** (`variables`, `animations`, `components`, `style`, `responsive`) — that order encodes the cascade. Same for the script order.

Wrap the JSON-LD `<script type="application/ld+json">` block in `{% raw %}…{% endraw %}` so Nunjucks does not touch its braces.

- [ ] **Step 5: Reduce `src/index.njk` to its unique content**

`src/index.njk` becomes front matter plus only the `<main>` content:

```njk
---
layout: layouts/base.njk
permalink: /index.html
title: '<copy the existing <title> from index.html verbatim>'
description: '<copy the existing meta description from index.html verbatim>'
robots: 'index, follow'
navbarSolid: false
---
<main id="main">
  <!-- the existing <main> content, unchanged -->
</main>
```

Copy `title` and `description` from the current `<head>` verbatim — do not rewrite them.

- [ ] **Step 6: Build and diff against the baseline**

Run: `npm run build && npm test -- tests/visual.spec.js --grep "home renders"`
Expected: 2 passed. A diff here means the extraction dropped or reordered something. Inspect `test-results/` for the diff image and fix the partial — do not update the snapshot.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: extract navbar, footer, and head into a base layout

index.html's chrome is canonical — it is the only copy carrying the
data-i18n-aria attributes on the menu toggle and newsletter button, so the
other pages will gain them in Task 9. Verified pixel-identical against the
Task 6 baseline."
```

---

### Task 9: Migrate the remaining five pages

**Files:**
- Modify: `about.html`, `services.html`, `gallery.html`, `contact.html`, `404.html` → `src/*.njk`
- Test: existing `tests/visual.spec.js`

**Interfaces:**
- Consumes: `layouts/base.njk` and its front matter contract from Task 8.
- Produces: all 6 pages built from one layout. Chrome duplication reaches zero.

**Expected — and correct — snapshot changes.** Four pages will now render `data-i18n-aria` attributes they lacked. Those are invisible, so screenshots should still match. But `404.html` currently ships a *reduced* navbar (5 links, no phone, no preloader) and will gain the full one. **Its snapshot will legitimately change.** Update that one snapshot deliberately and note it in the commit. Every other page must match untouched.

- [ ] **Step 1: Migrate `about.html`**

Run: `git mv about.html src/about.njk`

Replace everything before `<main id="main">` and everything after `</main>` with front matter, copying `title`/`description` verbatim from its current `<head>`:

```njk
---
layout: layouts/base.njk
permalink: /about.html
title: '<copy the existing <title> verbatim>'
description: '<copy the existing meta description verbatim>'
navbarSolid: true
---
```

- [ ] **Step 2: Verify about.html**

Run: `npm run build && npm test -- tests/visual.spec.js --grep "about renders"`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor: migrate about.html to the shared layout"
```

- [ ] **Step 4: Migrate `services.html`**

Run: `git mv services.html src/services.njk`

Strip everything before `<main id="main">` and after `</main>`, replacing it with:

```njk
---
layout: layouts/base.njk
permalink: /services.html
title: '<copy the existing <title> verbatim>'
description: '<copy the existing meta description verbatim>'
navbarSolid: true
---
```

Run: `npm run build && npm test -- tests/visual.spec.js --grep "services renders"`
Expected: 2 passed.

```bash
git add -A && git commit -m "refactor: migrate services.html to the shared layout"
```

- [ ] **Step 5: Migrate `gallery.html`**

Run: `git mv gallery.html src/gallery.njk`

```njk
---
layout: layouts/base.njk
permalink: /gallery.html
title: '<copy the existing <title> verbatim>'
description: '<copy the existing meta description verbatim>'
navbarSolid: true
---
```

`gallery.njk` keeps its `.lightbox` markup for now — the `<dialog>` rewrite is Part 2. Leave
it exactly as-is, including the `aria-hidden="true"` that `js/gallery.js` never removes.

Run: `npm run build && npm test -- tests/visual.spec.js --grep "gallery renders"`
Expected: 2 passed.

```bash
git add -A && git commit -m "refactor: migrate gallery.html to the shared layout"
```

- [ ] **Step 6: Migrate `contact.html`**

Run: `git mv contact.html src/contact.njk`

```njk
---
layout: layouts/base.njk
permalink: /contact.html
title: '<copy the existing <title> verbatim>'
description: '<copy the existing meta description verbatim>'
navbarSolid: true
---
```

Run: `npm run build && npm test -- tests/visual.spec.js --grep "contact renders" && npm test -- tests/contact-form.spec.js --project=desktop`
Expected: 2 + 5 passed. The form tests must still pass — they now run against the built page.

```bash
git add -A && git commit -m "refactor: migrate contact.html to the shared layout"
```

- [ ] **Step 7: Migrate `404.html`**

Run: `git mv 404.html src/404.njk`

```njk
---
layout: layouts/base.njk
permalink: /404.html
title: '<copy verbatim>'
description: '<copy verbatim>'
navbarSolid: true
---
```

Its `<head>` carries `<meta name="robots" content="noindex, follow" />`, so add
`robots: 'noindex, follow'` to its front matter. The `{% if robots %}` slot already exists
in `base.njk` from Task 8 Step 4.

Verified: exactly two pages set `robots` — `index.html` (`index, follow`, handled in Task 7)
and `404.html` (`noindex, follow`). The other four set none, and the `{% if %}` correctly
omits the tag for them. Confirm after building:

```bash
grep -l 'name="robots"' _site/*.html
```
Expected: exactly `_site/404.html` and `_site/index.html`.

- [ ] **Step 8: Accept the 404's intended navbar change**

Run: `npm test -- tests/visual.spec.js --grep "notfound renders"`
Expected: FAIL — the navbar now has 7 links, the phone, and a preloader.

Review the diff in `test-results/` and confirm the only change is the navbar/preloader. Then:

Run: `npm run test:update-snapshots -- tests/visual.spec.js --grep "notfound renders"`

- [ ] **Step 9: Full suite**

Run: `npm test`
Expected: all green. Then confirm the duplication is gone:

```bash
grep -c 'class="navbar' src/*.njk src/_includes/partials/navbar.njk
```
Expected: `1` for `navbar.njk`, `0` for every page. Same for the footer.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: migrate 404 and finish the layout extraction

All six pages now build from one base layout; chrome duplication is zero.
404's snapshot is deliberately updated: it shipped a reduced 5-link navbar
with no phone and no preloader, and now gets the canonical one. Every other
page is pixel-identical to its pre-migration baseline."
```

---

### Task 10: Extract repeated content into data files

**Files:**
- Create: `src/_data/services.js`, `src/_data/faq.js`, `src/_data/testimonials.js`
- Create: `src/_includes/partials/service-card.njk`
- Modify: `src/index.njk`, `src/services.njk`, `src/_includes/partials/footer.njk`

**Interfaces:**
- Produces: `services[]` with `{ id, detailId, title, blurb, icon, detail }`; `faq[]` with `{ q, a }`; `testimonials[]` with `{ quote, name, role, avatar }`. Part 2 adds `de`/`en` variants of these same shapes — keep the field names.

**Verified anchor facts you must preserve.** Each service owns **two** ids: the card carries
`id="office"` and its detail section carries `id="office-detail"`. Other pages deep-link to the
*card* ids — `services.html#office|house|window|deep|carpet|industrial`. Hence both `id` and
`detailId`. The 10 ids, in page order: `office`, `house`, `window`, `industrial`, `deep`,
`moveout`, `carpet`, `restaurant`, `medical`, `construction`.

Verified counts: `services.njk` renders **10** cards and **10** detail sections; `index.njk`
renders **6** cards.

**Background:** the 10 services exist in triplicate — a card in `index.html`, a card *and* a detail section in `services.html`, plus footer links on every page. That is why the README's "add a service" procedure has three steps. `services.html` also ships `.lightbox` markup with zero gallery cards to open it, and `index.html` has 8 masonry items with no lightbox, so clicking them does nothing. **Do not fix those two here** — they are Part 2's `<dialog>` work. Note them and move on.

Scope discipline: extract services, FAQ, and testimonials. Gallery, team, and timeline are Part 2 — they entangle with the `<dialog>` and i18n work.

- [ ] **Step 1: Create `src/_data/services.js`**

Read all 10 `.service-card` blocks in `src/services.njk` and their matching `.service-detail` sections. Transcribe **verbatim** — copy every string, do not paraphrase or improve any copy. Structure:

```js
export default [
  {
    id: 'office',
    detailId: 'office-detail',
    title: 'Office Cleaning',
    blurb: '<the exact blurb from the card>',
    icon: '<the exact inner SVG markup from the card>',
    detail: {
      heading: '<exact heading from the .service-detail section>',
      body: '<exact body copy>',
      image: '<exact Unsplash URL>',
      alt: '<exact alt text>',
      bullets: ['<exact>', '<exact>'],
    },
  },
  // ...the remaining 9, in page order: house, window, industrial, deep,
  // moveout, carpet, restaurant, medical, construction
];
```

**A broken anchor here is a regression the screenshots cannot catch** — the page still renders,
the link just goes nowhere. Step 7 verifies every anchor mechanically.

- [ ] **Step 2: Create the card partial**

`src/_includes/partials/service-card.njk`, matching the current card markup exactly:

```njk
<article class="service-card" id="{{ service.id }}" data-reveal>
  <!-- reproduce the existing .service-card inner markup verbatim, substituting:
       {{ service.icon | safe }}, {{ service.title }}, {{ service.blurb }},
       and the "learn more" href as #{{ service.detailId }} -->
</article>
```

First inspect a real card (`sed -n '/class="service-card"/,/<\/article>/p' src/services.njk | head -20`)
and reproduce its attributes exactly. If the existing cards carry `data-reveal-delay` or
`data-tilt`, carry those through — pass a stagger value into the include where the current
markup has one:

```njk
{% for service in services %}
  {% set stagger = loop.index0 * 80 %}
  {% include "partials/service-card.njk" %}
{% endfor %}
```
Only do this if the current cards actually have staggered delays. **Check first** — if they
all share one value or have none, hardcode what is there. Inventing a stagger would change
the animation and fail the snapshots.

- [ ] **Step 3: Loop the cards on both pages**

In `src/services.njk`, replace the 10 hand-written cards with:

```njk
{% for service in services %}
  {% include "partials/service-card.njk" %}
{% endfor %}
```

`index.njk` shows a subset — **verified: exactly 6 of the 10**. Nunjucks' `slice` filter
chunks a list rather than taking a sub-range (that is Jinja2 behaviour and a common trap), so
use a guard instead:

```njk
{% for service in services %}
  {% if loop.index0 < 6 %}
    {% include "partials/service-card.njk" %}
  {% endif %}
{% endfor %}
```

Confirm the homepage's 6 are the *first* 6 in page order and not a hand-picked set —
`grep -o 'id="[a-z]*"' src/index.njk` within the services section, compared against your data
order. If they differ, add an `onHome: true` flag to those 6 entries in `services.js` and
filter on that instead. **Do not reorder the data to make the loop convenient** — `services.njk`
depends on the page order.

- [ ] **Step 4: Loop the detail sections**

In `src/services.njk`, replace the 10 `.service-detail` sections with a loop over `services`, rendering `service.detail`. Keep the alternating layout: if the current markup alternates a modifier class, reproduce it with `{% if loop.index0 is even %}`.

- [ ] **Step 5: Loop the footer service links**

In `src/_includes/partials/footer.njk`, replace the hardcoded links in the "Services" column
with a loop.

**Count them first and match exactly** — the footer does not necessarily list all 10, and its
labels may be shorter than the card titles (e.g. "Office" vs "Office Cleaning"). Inspect it:

```bash
awk '/Services<\/h5>/,/<\/ul>/' src/_includes/partials/footer.njk
```

If the labels differ from `service.title`, add a `short` field to `services.js` rather than
changing what the footer displays. If the footer lists only some services, guard on
`loop.index0` as in Step 3. The rendered text must be byte-identical to what is there now.

- [ ] **Step 6: Verify**

Run: `npm run build && npm test`
Expected: all green, all snapshots matching. Diffs mean a transcription slip — fix the data, not the snapshot.

- [ ] **Step 7: Verify every anchor still resolves**

```bash
node -e "
const fs=require('fs');
const files=fs.readdirSync('_site').filter(f=>f.endsWith('.html'));
let bad=0;
for (const f of files) {
  const html=fs.readFileSync('_site/'+f,'utf8');
  for (const m of html.matchAll(/href=\"([^\"]*\.html)#([^\"]+)\"/g)) {
    const target=fs.readFileSync('_site/'+m[1],'utf8');
    if (!target.includes('id=\"'+m[2]+'\"')) { console.log('BROKEN:',f,'->',m[0]); bad++; }
  }
}
console.log(bad===0?'all cross-page anchors resolve':bad+' broken');
"
```
Expected: `all cross-page anchors resolve`.

- [ ] **Step 8: Extract FAQ and testimonials**

Same pattern. `src/_data/faq.js` → `[{ q, a }]` from the 6 `.faq-item` blocks in `src/index.njk`; `src/_data/testimonials.js` → `[{ quote, name, role, avatar }]` from the 4 `.testimonial` slides. Loop both in `src/index.njk`. Transcribe verbatim.

Run: `npm run build && npm test`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: extract services, FAQ, and testimonials into data files

The 10 services existed in triplicate — a card on the homepage, a card and a
detail section on services.html, plus footer links on every page. Adding one
now means a single entry in services.js.

Known and deliberately deferred to Part 2: services.njk still ships lightbox
markup with no cards to open it, and index.njk's 8 masonry items still have
no lightbox, so their clicks do nothing. Both are resolved by the <dialog>
rewrite."
```

---

### Task 11: Update the docs to match reality

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.

Both documents now describe a codebase that no longer exists. `CLAUDE.md` states "Do not convert these to import/export" and "no build step"; `README.md`'s rebrand instructions say to search-replace `Lumière`, a name that appears nowhere — it is stale from an earlier project.

- [ ] **Step 1: Rewrite `CLAUDE.md`**

It must now state: 11ty + Nunjucks; `npm start` / `npm run build` / `npm test`; source in `src/`, never edit `_site/`; content lives in `src/_data/`, chrome in `src/_includes/partials/`; **stylesheet link order and script order encode the cascade and the init order — preserve both**; Playwright snapshots are the migration's proof and must not be updated to make a failure disappear; Part 2 is pending and `js/i18n.js` is scheduled for deletion.

Remove the claim that components reference variables so palette changes propagate — it is false (128 hardcoded `rgba()` literals) and stays false until Part 2's `color-mix()` work.

- [ ] **Step 2: Rewrite `README.md`**

Correct the stale `Lumière` rebrand instructions to `BlitzBlank`. Replace "No frameworks. No build tools. No npm. Just files." with the real setup. Update the file-structure tree. Keep the design-system and accessibility sections that are still accurate.

Add a prominent note: **the site is structurally deployable but not launch-ready** — stats and testimonials are placeholders, imagery is hot-linked Unsplash, and there is no Impressum or privacy policy yet (Part 2). Per the spec, that gap is legally material in Germany.

- [ ] **Step 3: Verify the docs are honest**

Run every command the README and CLAUDE.md claim works:
```bash
npm run build && npm start &
sleep 5 && curl -sI http://localhost:8080/index.html | head -1
kill %1
npm test
```
Expected: `HTTP/1.1 200 OK` and a green suite. **If a documented command does not work, fix the doc.**

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: describe the actual codebase

Both files described a buildless vanilla site that no longer exists. Also
corrects README's rebrand instructions, which told you to search-replace
'Lumière' — a name that appears nowhere in the project."
```

---

## Definition of done for Part 1

- [ ] `npm test` fully green.
- [ ] Contact form submits with valid input; rejects short input with the correct minimum; blocks submission without consent.
- [ ] "obsessive care." is visible and legible on the homepage.
- [ ] Every dark-background `<h1>`/`<h2>` clears 4.5:1 contrast.
- [ ] All 6 pages build from one layout; `grep -c 'class="navbar' src/*.njk` returns 0 for every page.
- [ ] All cross-page anchors resolve.
- [ ] Every page except `404.html` is pixel-identical to its pre-migration baseline. The 404's change is navbar-only and deliberate.
- [ ] `_site/` is not tracked by git.
- [ ] `CLAUDE.md` and `README.md` describe commands that actually run.

## Deferred to Part 2 — explicitly not in scope here

CSS restructure (`@layer`, `color-mix()`, intrinsic layout, ~180 lines of dead rules); the JS platform-first rewrite (`<dialog>`, `<details name>`, `scroll-snap`, native validation, deleting `initLazy`/`initProgressBars`); build-time bilingual DE/EN and deleting `js/i18n.js`; URL localisation (`/leistungen/`); Impressum + Datenschutz; images (`width`/`height`, `srcset`, contradictory alt text); accessibility (keyboard gallery, lightbox focus, slider pause, heading order); SEO (removing the fabricated `aggregateRating`, `FAQPage`, `BreadcrumbList`); the 57 inline styles; visual refinement.
