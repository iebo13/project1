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
