import { test, expect } from '@playwright/test';

test('the third hero line is actually visible', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.hero__title .text-gradient');
  await expect(line).toHaveText('liebevoller Sorgfalt.'); // root is German
  await expect(line).toBeVisible();
  await expect(async () => {
    const opacity = await line.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.99);
  }).toPass({ timeout: 5000 });
});

test('hero lines stagger in reading order', async ({ page }) => {
  await page.goto('/');
  const delays = await page.$$eval('.hero__title .hero-line', (els) =>
    els.map((el) => parseFloat(getComputedStyle(el).animationDelay))
  );
  expect(delays).toHaveLength(3);
  expect(delays[0]).toBeLessThan(delays[1]);
  expect(delays[1]).toBeLessThan(delays[2]);
});

test('hero gradient text uses the on-dark ramp, not blue-on-blue', async ({ page }) => {
  await page.goto('/');
  const bg = await page.locator('.hero__title .text-gradient')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toContain('255, 255, 255');
  expect(bg).not.toContain('37, 99, 235');
});

test('hero copy never sits on the photo (desktop split)', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1280, 'the split is a desktop layout');
  // Both locales share the same hero markup/CSS but render different copy —
  // check DE (root) and EN (/en/) so the geometry guarantee isn't only
  // proven for one language.
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    // The solid navy panel covers the left 46% and stays ≥82% tint to 58%;
    // holding every headline line inside 60% of the viewport guarantees
    // contrast regardless of which photo Unsplash serves. Measure the inline
    // .hero-line spans, not the h1 — a block box spans the full column width
    // whether or not there are glyphs in it.
    const edges = await page.$$eval('.hero__title .hero-line', (els) =>
      els.map((el) => el.getBoundingClientRect().right)
    );
    expect(Math.max(...edges)).toBeLessThanOrEqual(viewport.width * 0.6);
  }
});

test('hero stats are individual glass chips', async ({ page }) => {
  await page.goto('/');
  const stats = page.locator('.hero__stat');
  await expect(stats).toHaveCount(3);
  expect(await stats.first().getAttribute('class')).toContain('glass-strong');
});

test('scroll hint never overlaps the stat chips', async ({ page }) => {
  await page.goto('/');
  const hint = await page.locator('.scroll-indicator').boundingBox();
  for (const stat of await page.locator('.hero__stat').all()) {
    const box = await stat.boundingBox();
    const overlaps = hint.x < box.x + box.width && box.x < hint.x + hint.width &&
                     hint.y < box.y + box.height && box.y < hint.y + hint.height;
    expect(overlaps, 'scroll hint intersects a stat chip').toBe(false);
  }
});

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
